from datetime import datetime, timedelta

import json
import types

from rm_prospect import db, enrich, mailer, pays, stats
from rm_prospect.scoring import calculer_score, calculer_score_web


def test_score_cible_ideale_devant_commerce_sature():
    ideal, _ = calculer_score({"note": 3.9, "nb_avis": 25, "telephone": "01", "site_web": "x"}, 1.0)
    sature, _ = calculer_score({"note": 4.8, "nb_avis": 1200, "telephone": "01", "site_web": "x"}, 1.0)
    assert ideal > 80 and sature < 40


def test_commerce_ferme_score_zero():
    assert calculer_score({"statut_google": "CLOSED_PERMANENTLY", "nb_avis": 3}, 1.0)[0] == 0


def test_extraction_email_et_instagram():
    html = ('<a href="mailto:Contact@Chez-Paul.fr">x</a> logo@2x.png contact@example.com '
            '<a href="https://www.instagram.com/chezpaul/">insta</a> https://instagram.com/p/abc')
    emails = enrich.extraire_emails(html)
    assert emails == {"contact@chez-paul.fr"}
    assert enrich.extraire_instagram(html) == "https://www.instagram.com/chezpaul"
    assert enrich.meilleur_email({"jean@gmail.com", "info@chez-paul.fr"}, "https://www.chez-paul.fr") == "info@chez-paul.fr"


def test_modele_rempli():
    texte = mailer.remplir("Bonjour {nom}, {phrase_avis} {inconnu}", {"nom": "Chez Paul", "note": 3.8, "nb_avis": 40}, "")
    assert "Chez Paul" in texte and "3,8" in texte and "{inconnu}" in texte


def _base(tmp_path):
    conn = db.connect(tmp_path / "t.db")
    db.enregistrer_commerce(conn, {"place_id": "a", "espace": "nfc", "nom": "A", "score": 90, "google_maj": db.maintenant()})
    db.maj_commerce(conn, "nfc:a", email="a@a.fr")
    return conn


def test_candidats_relances_et_desinscription(tmp_path):
    conn = _base(tmp_path)
    assert [c["place_id"] for c in mailer.candidats(conn, "nfc", "premier")] == ["a"]
    assert mailer.candidats(conn, "web", "premier") == []
    c = dict(conn.execute("SELECT * FROM commerces").fetchone())
    mailer.enregistrer_envoi(conn, c, "s", "premier")
    assert mailer.candidats(conn, "nfc", "premier") == []
    assert mailer.candidats(conn, "nfc", "relance1") == []  # trop tôt
    vieux = (datetime.now() - timedelta(days=5)).isoformat(timespec="seconds")
    conn.execute("UPDATE emails_envoyes SET date=?", (vieux,))
    assert len(mailer.candidats(conn, "nfc", "relance1")) == 1
    db.desinscrire(conn, "A@a.fr")
    assert mailer.candidats(conn, "nfc", "relance1") == []


def test_montee_en_charge(tmp_path):
    conn = _base(tmp_path)
    assert mailer.limite_du_jour(conn, 30) == 10
    conn.execute("INSERT INTO emails_envoyes(cle, email, date, sujet, etape) VALUES('nfc:a','a@a.fr',?, 's','premier')",
                 ((datetime.now() - timedelta(days=9)).isoformat(),))
    assert mailer.limite_du_jour(conn, 30) == 20


def test_purge_google_garde_le_suivi(tmp_path):
    conn = _base(tmp_path)
    db.maj_commerce(conn, "nfc:a", telephone="01", notes="rappeler", google_maj="2020-01-01T00:00:00")
    assert db.purger_donnees_google(conn) == 1
    row = conn.execute("SELECT * FROM commerces").fetchone()
    assert row["telephone"] is None and row["notes"] == "rappeler" and row["email"] == "a@a.fr"


def test_message_a_en_tete_desinscription():
    cfg = {"nom_expediteur": "RM", "adresse": "contact@reviewmaker.fr"}
    msg = mailer.construire_message(cfg, "x@y.fr", "Sujet", "Corps")
    assert "STOP" in msg["List-Unsubscribe"] and "STOP" in msg.get_content()


def test_score_site_internet():
    sans_site, raisons = calculer_score_web({"note": 4.6, "nb_avis": 210, "telephone": "01"}, 1.0)
    insta, _ = calculer_score_web({"note": 4.6, "nb_avis": 210, "site_web": "https://instagram.com/x"}, 1.0)
    vieux = json.dumps({"https": False, "mobile": False, "secondes": 4.5, "annee": 2015})
    ancien, _ = calculer_score_web({"note": 4.5, "nb_avis": 98, "site_web": "http://x.fr", "site_etat": vieux}, 1.0)
    bon = json.dumps({"https": True, "mobile": True, "secondes": 1.0, "annee": datetime.now().year})
    correct, _ = calculer_score_web({"note": 4.6, "nb_avis": 210, "site_web": "https://x.fr", "site_etat": bon}, 1.0)
    assert sans_site > 85 and insta > 85 and ancien > 75 and correct < 55
    assert "aucun site internet" in raisons


def test_meme_commerce_dans_les_deux_espaces(tmp_path):
    conn = db.connect(tmp_path / "t.db")
    for espace in ("nfc", "web"):
        db.enregistrer_commerce(conn, {"place_id": "x", "espace": espace, "nom": "X", "google_maj": db.maintenant()})
    assert conn.execute("SELECT COUNT(*) FROM commerces WHERE place_id='x'").fetchone()[0] == 2


def test_pays_et_langue():
    assert pays.requete("restaurant", "Lyon", "FR") == "restaurant à Lyon"
    assert pays.requete("restaurant", "London", "GB") == "restaurant in London"
    assert pays.langue("GB") == "en" and not pays.emails_autorises("CA")


def test_modeles_web_et_anglais():
    c = {"nom": "Garage Martin", "note": 4.6, "nb_avis": 210}
    texte = mailer.remplir(mailer.modele("web", "fr", "premier")["corps"], c, "Théo", "fr", "490 €", "10 jours")
    assert "pas trouvé de site" in texte and "490 €" in texte and "10 jours" in texte
    anglais = mailer.remplir(mailer.modele("nfc", "en", "premier")["corps"], {"nom": "Pub", "note": 4.1, "nb_avis": 30}, "", "en")
    assert "Hello" in anglais and "4.1" in anglais
    for espace in mailer.MODELES_DEFAUT:
        for langue in ("fr", "en"):
            for etape in mailer.ETAPES:
                corps = mailer.modele(espace, langue, etape)["corps"]
                assert len(corps.split()) <= 70 and "passe" not in corps.lower()


def test_statistiques(tmp_path):
    conn = _base(tmp_path)
    c = dict(conn.execute("SELECT * FROM commerces").fetchone())
    mailer.enregistrer_envoi(conn, c, "s", "premier")
    db.maj_commerce(conn, "nfc:a", statut="Vendu")
    db.ajouter_historique(conn, "nfc:a", "Vente", "Tags NFC")
    semaines = stats.par_semaine(conn, "nfc")
    assert semaines["Emails envoyés"].sum() == 1 and semaines["Ventes"].sum() == 1
    assert dict(stats.entonnoir(conn, "nfc"))["Vendus"] == 1


def test_analyse_site_annee_et_mobile():
    assert enrich.extraire_annee("© 2016 - 2019 Chez Paul") == 2019
    assert enrich.VIEWPORT_RE.search('<meta name="viewport" content="width=device-width">')


def test_emails_caches():
    cle = 0x42
    code = f"{cle:02x}" + "".join(f"{ord(c) ^ cle:02x}" for c in "contact@chez-paul.fr")
    assert enrich.extraire_emails(f'<a href="/cdn-cgi/l/email-protection#{code}">x</a>') == {"contact@chez-paul.fr"}
    assert enrich.extraire_emails("bonjour&#64;chez-paul.fr") == {"bonjour@chez-paul.fr"}
    assert enrich.extraire_emails("info [at] chez-paul [dot] fr") == {"info@chez-paul.fr"}
    assert enrich.extraire_emails('<a href="mailto:resa%40chez-paul.fr?subject=x">') == {"resa@chez-paul.fr"}
    assert enrich.extraire_emails("We dine at home. Call us at noon.") == set()
    assert enrich.enrichir_site("https://www.facebook.com/chezpaul")["site_etat"] == {"plateforme": True}


def test_travail_en_equipe(tmp_path):
    from rm_prospect import equipe
    drive = tmp_path / "drive"
    drive.mkdir()
    a, b = db.connect(tmp_path / "a.db"), db.connect(tmp_path / "b.db")
    db.enregistrer_commerce(a, {"place_id": "p1", "espace": "web", "nom": "Chez Paul", "google_maj": "2026-11-01"})
    a.commit()
    db.AUTEUR = "Théo"
    db.maj_commerce(a, "web:p1", statut="Contacté")
    db.ajouter_historique(a, "web:p1", "Instagram", "DM")
    equipe.exporter(a, drive, "Théo", "aaa")
    lus_a, lus_b = {}, {}
    equipe.importer(b, drive, "bbb", lus_b)
    db.AUTEUR = "Léa"
    db.maj_commerce(b, "web:p1", notes="rappeler jeudi")
    db.AUTEUR = "Théo"
    db.maj_commerce(a, "web:p1", relance_le="2026-11-10")
    for _ in range(2):
        equipe.exporter(b, drive, "Léa", "bbb")
        equipe.importer(a, drive, "aaa", lus_a)
        equipe.exporter(a, drive, "Théo", "aaa")
        equipe.importer(b, drive, "bbb", lus_b)
    db.AUTEUR = ""
    for conn in (a, b):
        c = conn.execute("SELECT statut, notes, relance_le FROM commerces WHERE cle='web:p1'").fetchone()
        assert tuple(c) == ("Contacté", "rappeler jeudi", "2026-11-10")
        h = conn.execute("SELECT auteur FROM historique").fetchall()
        assert [r[0] for r in h] == ["Théo"]


def test_dossier_partage_windows_retrouve_sur_mac(tmp_path, monkeypatch):
    from pathlib import Path
    from rm_prospect import equipe
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("USERPROFILE", raising=False)
    dossier = tmp_path / "Library" / "CloudStorage" / "GoogleDrive-moi@exemple.fr" / "Mon Drive" / "Review Maker équipe"
    dossier.mkdir(parents=True)
    assert str(dossier.parent) in equipe.dossiers_detectes()
    assert equipe.adapter_chemin("G:\\Mon Drive\\Review Maker équipe") == str(dossier)
    assert equipe.adapter_chemin("G:\\Mon Drive\\Autre dossier") is None
    assert Path(equipe.adapter_chemin(str(dossier))) == dossier
