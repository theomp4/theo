"""Logiciel de prospection Review Maker : petit serveur local qui affiche l'interface dans ton navigateur.

Lancé par « Lancer Review Maker.bat ». Tout reste sur ton ordinateur : l'interface (dossier web)
parle à ce serveur, qui lit et écrit la base data/prospection.db.
"""
import io
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
import webbrowser
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

import pandas as pd
import requests

from rm_prospect import audit, db, enrich, entreprises, equipe, google_places, mailer, pays, stats
from rm_prospect.scoring import CATEGORIES, entreprise as entreprise_de, etat_site, niveau, poids, sans_vrai_site, score_pour

if sys.stdout is None or sys.stderr is None:
    # Lancé sans fenêtre (pythonw) : les messages et erreurs vont dans data/journal.txt.
    db.DATA_DIR.mkdir(parents=True, exist_ok=True)
    sys.stdout = sys.stderr = open(db.DATA_DIR / "journal.txt", "a", encoding="utf-8", buffering=1)

ICI = Path(__file__).resolve().parent
WEB = ICI / "web"
PORT = int(os.environ.get("RM_PORT", "8765"))  # RM_PORT : tests
VERSION = "12 novembre 2026 (PME et audit)"  # affichée dans Réglages : permet de vérifier que la mise à jour est bien installée
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")



def recuperer_ancienne_version():
    """Chaque version a son propre dossier (logiciel-prospection-review-maker-<date>). Au premier lancement
    d'une nouvelle version, on reprend la base de la version précédente posée à côté : tu ne perds rien."""
    if os.environ.get("RM_DB") or db.DB_PATH.exists():
        return
    anciennes = []
    for base in ICI.parent.glob("*/data/prospection.db"):
        if base.resolve() != db.DB_PATH.resolve():
            anciennes.append(base)
    if anciennes:
        plus_recente = max(anciennes, key=lambda b: b.stat().st_mtime)
        db.DATA_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(plus_recente, db.DB_PATH)  # copie neuve : jamais en lecture seule
        print(f"{datetime.now():%d/%m %H:%M} Prospects repris de {plus_recente.parent.parent.name}.")


recuperer_ancienne_version()
conn = db.connect()
# Version 2 de la recherche d'emails : on revisite les sites où l'ancienne version n'avait rien trouvé.
if db.get_reglage(conn, "version_emails", "1") != "2":
    conn.execute("UPDATE commerces SET enrichi_le=NULL WHERE email IS NULL")
    db.set_reglage(conn, "version_emails", "2")
db.purger_donnees_google(conn)
VERROU = threading.RLock()  # une seule requête à la fois sur la base partagée
JOBS = {}                   # tâches longues (recherche, recherche d'emails) suivies par l'interface


def R(cle, defaut=""):
    return db.get_reglage(conn, cle, defaut)


ANCIEN_DM_WEB = ("Bonjour ! J'ai vu {nom} sur Google : {note} et {nb_avis} avis, bravo. {phrase_site} "
                 "Je crée des sites simples et modernes pour les commerces, tout à distance. "
                 "Si vous avez des questions, n'hésitez pas !")


def dm_defaut(espace):
    if espace == "web":
        return ("Bonjour ! J'ai vu {nom} sur Google : {note} et {nb_avis} avis, bravo. En regardant votre présence en "
                "ligne, j'ai remarqué que {point_principal}. Je vous ai préparé un audit gratuit de votre site, avec "
                "ce qui ne va pas et comment le corriger : je vous l'envoie ?")
    return ("Bonjour ! J'ai vu {nom} sur Google : {phrase_avis} J'ai un tag à coller sur le comptoir qui permet "
            "à vos clients de laisser un avis en moins de 15 secondes. 35 €, livraison offerte. "
            "Si vous avez des questions, n'hésitez pas !")


# Réglages modifiables depuis l'écran Réglages, avec leur valeur par défaut.
REGLAGES = {
    "fond": "salon", "cle_google": "", "limite_google": "900",
    "site_prix": "[TON PRIX]", "site_delai": "[DÉLAI]", "signature": "Ton prénom\nReview Maker\nreviewmaker.fr",
    "modele_dm_nfc": dm_defaut("nfc"), "modele_dm_web": dm_defaut("web"),
    "prenom": "", "equipe_dossier": "", "ca_minimum": "200000",
}


def ca_minimum():
    chiffres = re.sub(r"[^\d]", "", R("ca_minimum", "200000"))
    return int(chiffres) if chiffres else entreprises.CA_MINIMUM


# L'ancien message Instagram par défaut (jamais modifié) est remplacé par le nouveau, qui annonce l'audit.
if db.get_reglage(conn, "modele_dm_web") == ANCIEN_DM_WEB:
    db.set_reglage(conn, "modele_dm_web", dm_defaut("web"))

# Photos de fond (Unsplash, licence libre), téléchargées une fois dans le dossier fonds/.
FONDS = {
    "salon": "photo-1641232458416-feace752b346", "sejour": "photo-1618221195710-dd6b41faaea6",
    "nuit": "photo-1672082546749-f8b3e92f21d7", "montagne": "photo-1490682143684-14369e18dce8",
    "lagon": "photo-1589394815804-964ed0be2eb5", "foret": "photo-1425913397330-cf8af2ff40a1",
}
DOSSIER_FONDS = ICI / "fonds"
VERROU_FONDS = threading.Lock()
FONDS_ECHOUES = set()  # pas d'Internet : on ne réessaie pas à chaque affichage


def photo_fond(nom, mini):
    """Chemin de la photo (téléchargée la première fois), ou None sans Internet."""
    if nom not in FONDS:
        return None
    cible = DOSSIER_FONDS / f"{nom}{'-mini' if mini else ''}.jpg"
    with VERROU_FONDS:
        if not cible.is_file():
            if cible.name in FONDS_ECHOUES:
                return None
            taille = "w=480&h=300&q=80&fit=crop" if mini else "w=3200&q=85&fit=max"
            try:
                rep = requests.get(f"https://images.unsplash.com/{FONDS[nom]}?{taille}&fm=jpg", timeout=60)
                rep.raise_for_status()
            except requests.RequestException:
                FONDS_ECHOUES.add(cible.name)
                return None
            DOSSIER_FONDS.mkdir(exist_ok=True)
            cible.write_bytes(rep.content)
    return cible


# --- Travail en équipe : synchronisation par un dossier Google Drive partagé ----------------

if not db.get_reglage(conn, "poste"):
    db.set_reglage(conn, "poste", uuid.uuid4().hex[:6])  # identifie cet ordinateur dans le dossier partagé
db.AUTEUR = db.get_reglage(conn, "prenom")
SYNCHRO = {"actif": False, "derniere": None, "coequipiers": [], "erreur": "", "recues": 0}
REVEIL_SYNCHRO = threading.Event()  # réveille la synchronisation après une modification


def synchroniser(c_conn, etat):
    dossier, prenom = db.get_reglage(c_conn, "equipe_dossier"), db.get_reglage(c_conn, "prenom")
    SYNCHRO["actif"] = bool(dossier and prenom)
    if not SYNCHRO["actif"]:
        SYNCHRO.update(coequipiers=[], erreur="")
        return
    if not Path(dossier).is_dir():
        # Chemin noté sur un autre ordinateur (ex. G:\\Mon Drive\\… sous Windows) : on le retrouve ici.
        ici = equipe.adapter_chemin(dossier)
        if not ici:
            SYNCHRO["erreur"] = ("Dossier partagé introuvable : ouvre Google Drive pour ordinateur, puis dans Réglages, "
                                 "clique sur « Choisir… » et sélectionne le dossier « Review Maker équipe ».")
            return
        db.set_reglage(c_conn, "equipe_dossier", ici)
        dossier = ici
    poste = db.get_reglage(c_conn, "poste")
    try:
        modifiees, SYNCHRO["coequipiers"] = equipe.importer(c_conn, dossier, poste, etat.setdefault("lus", {}))
        for cle in modifiees:
            if c_conn.execute("SELECT 1 FROM commerces WHERE cle=?", (cle,)).fetchone():
                recalculer(c_conn, cle)
        SYNCHRO["recues"] += len(modifiees)
        etat["contenu"] = equipe.exporter(c_conn, dossier, prenom, poste, etat.get("contenu"))
        SYNCHRO.update(derniere=db.maintenant(), erreur="")
    except OSError as e:
        SYNCHRO["erreur"] = f"Impossible d'écrire dans le dossier partagé : {e}"


VERROU_SYNCHRO = threading.Lock()
ETAT_SYNCHRO = {}


def synchroniser_maintenant():
    with VERROU_SYNCHRO:
        try:
            if "conn" not in ETAT_SYNCHRO:
                ETAT_SYNCHRO["conn"] = db.connect()
            synchroniser(ETAT_SYNCHRO["conn"], ETAT_SYNCHRO)
        except Exception as e:  # la synchronisation ne doit jamais arrêter le logiciel
            SYNCHRO["erreur"] = f"Erreur de synchronisation : {e}"
            print(f"{datetime.now():%d/%m %H:%M} {SYNCHRO['erreur']}")


def boucle_synchro():
    while True:
        synchroniser_maintenant()
        if REVEIL_SYNCHRO.wait(10):
            REVEIL_SYNCHRO.clear()
            time.sleep(2)  # regroupe plusieurs modifications rapprochées


def recalculer(c_conn, cle):
    c = dict(c_conn.execute("SELECT * FROM commerces WHERE cle=?", (cle,)).fetchone())
    score, raisons = score_pour(c["espace"], c, poids(c["espace"], c.get("categorie")))
    db.maj_commerce(c_conn, cle, score=score, raisons=" ; ".join(raisons))


def commerce(cle):
    row = conn.execute("SELECT * FROM commerces WHERE cle=?", (cle,)).fetchone()
    if not row:
        raise ErreurAPI("Commerce introuvable.")
    return dict(row)


class ErreurAPI(Exception):
    pass


# --- Tâches longues ----------------------------------------------------------------

def lancer_job(fonction, *args):
    """Exécute `fonction(job, *args)` en arrière-plan ; l'interface suit l'avancement via /api/job."""
    jid = uuid.uuid4().hex[:10]
    job = {"id": jid, "avance": 0.0, "texte": "", "fini": False, "message": "", "erreur": "", "annule": False}
    JOBS[jid] = job

    def tourner():
        c_conn = db.connect()  # chaque tâche a sa propre connexion à la base
        try:
            job["message"] = fonction(job, c_conn, *args) or ""
        except Exception as e:  # l'erreur s'affiche dans l'interface
            job["erreur"] = str(e)
        finally:
            job["fini"] = True
            REVEIL_SYNCHRO.set()
            job["avance"] = 1.0
            c_conn.close()

    threading.Thread(target=tourner, daemon=True).start()
    return {"job": jid}


def job_recherche(job, c_conn, espace, cats, ville, code_pays, pages):
    total_n = total_m = 0
    for i, cat in enumerate(cats):
        if job["annule"]:
            break
        job["texte"] = f"{cat}…"
        try:
            n, m, _ = google_places.rechercher(c_conn, R("cle_google"), espace, cat, ville, code_pays, pages,
                                               int(R("limite_google", "900")))
        except google_places.QuotaAtteint as e:
            raise ErreurAPI(f"{e} Augmente la limite dans Réglages seulement si tu as vérifié ton quota gratuit.")
        total_n += n
        total_m += m
        job["avance"] = (i + 1) / len(cats)
    return f"{total_n} nouveaux commerces, {total_m} mis à jour."


def verifier_entreprise(c_conn, c, session=None):
    """Vérifie l'entreprise dans l'annuaire officiel et met à jour toutes ses fiches. Renvoie le verdict."""
    res = entreprises.verifier(c, ca_minimum(), session)
    c_conn.execute("UPDATE commerces SET entreprise=?, entreprise_le=? WHERE place_id=?",
                   (json.dumps(res, ensure_ascii=False), db.maintenant(), c["place_id"]))
    c_conn.commit()
    return res


def analyser_site(c_conn, c):
    res = enrich.enrichir_site(c["site_web"])
    etat = json.dumps(res["site_etat"], ensure_ascii=False) if res["site_etat"] else None
    # Le même commerce peut exister dans les deux espaces : on met à jour les deux fiches.
    c_conn.execute("UPDATE commerces SET email=COALESCE(email, ?), instagram=COALESCE(instagram, ?), "
                   "site_etat=?, enrichi_le=? WHERE place_id=?",
                   (res["email"], res["instagram"], etat, db.maintenant(), c["place_id"]))
    c_conn.commit()
    return res


def recalculer_place(c_conn, place_id):
    for r in c_conn.execute("SELECT cle FROM commerces WHERE place_id=?", (place_id,)).fetchall():
        recalculer(c_conn, r["cle"])


def job_enrichir(job, c_conn, lot):
    """1. Vérifie l'entreprise (PME, chiffre d'affaires minimum). 2. Si elle est dans la cible : visite son site
    (email, Instagram, analyse de base pour le message et l'audit)."""
    session = requests.Session()
    verifiees = exclues = trouves = injoignables = analyses = 0
    i = -1
    for i, c in enumerate(lot):
        if job["annule"]:
            break
        job["texte"] = f"{c['nom']} : vérification de l'entreprise…"
        e = entreprise_de(c)
        if not c.get("entreprise_le"):
            e = verifier_entreprise(c_conn, c, session)
            verifiees += 1
        if e and e.get("verdict") == "exclu":
            exclues += 1
        elif c.get("site_web") and not c.get("enrichi_le"):
            job["texte"] = f"{c['nom']} : analyse du site…"
            res = analyser_site(c_conn, c)
            analyses += 1
            trouves += bool(res["email"])
            injoignables += bool((res["site_etat"] or {}).get("injoignable"))
        recalculer_place(c_conn, c["place_id"])
        job["avance"] = (i + 1) / len(lot)
    morceaux = []
    if verifiees:
        morceaux.append(f"{verifiees} entreprise{'s' if verifiees > 1 else ''} vérifiée{'s' if verifiees > 1 else ''}"
                        f" ({exclues} hors cible)")
    if analyses:
        morceaux.append(f"{analyses} site{'s' if analyses > 1 else ''} analysé{'s' if analyses > 1 else ''}, "
                        f"{trouves} email{'s' if trouves > 1 else ''} trouvé{'s' if trouves > 1 else ''}")
    if injoignables:
        morceaux.append(f"{injoignables} site{'s' if injoignables > 1 else ''} ne s'ouvre{'nt' if injoignables > 1 else ''} pas")
    return (" · ".join(morceaux) or "Rien à faire.") + "."


# --- Pages de l'API ---------------------------------------------------------------

def api_etat(q):
    return {
        "fond": R("fond", "salon"), "espaces": db.ESPACES, "statuts": db.STATUTS, "version": VERSION, "dossier": str(ICI),
        "requetes": db.requetes_du_mois(conn), "limite_google": int(R("limite_google", "900")),
        "equipe": SYNCHRO,
    }


def prix_site():
    chiffres = re.sub(r"[^\d]", "", R("site_prix", ""))
    return int(chiffres) if chiffres else None


def api_tableau(q):
    espace = q["espace"]
    df = pd.read_sql("SELECT cle, statut, score, relance_le, nom, categorie, ville_recherche, ajoute_le "
                     "FROM commerces WHERE espace=?", conn, params=(espace,))
    aujourd_hui = datetime.now().strftime("%Y-%m-%d")
    relances = df[(df.relance_le.notna()) & (df.relance_le <= aujourd_hui)
                  & (~df.statut.isin(["Vendu", "Refus", "Ne plus contacter"]))]
    # Commerces contactés par semaine (8 dernières semaines), d'après l'historique des fiches.
    lundi = (datetime.now() - timedelta(days=datetime.now().weekday())).date()
    semaines = [lundi - timedelta(weeks=7 - i) for i in range(8)]
    contacts = [0] * 8
    for (date,) in conn.execute("SELECT h.date FROM historique h JOIN commerces c ON c.cle=h.cle WHERE c.espace=? "
                                "AND h.canal NOT IN ('Fiche', 'Vente') AND h.date>=?",
                                (espace, semaines[0].isoformat())):
        i = (datetime.fromisoformat(date).date() - semaines[0]).days // 7
        if 0 <= i < 8:
            contacts[i] += 1
    ventes = int((df.statut == "Vendu").sum())
    return {
        "total": len(df), "haute": int((df.score.fillna(0) >= 75).sum()),
        "contactes": int(df.statut.isin(db.STATUTS_CONTACTES).sum()), "ventes": ventes,
        "encaisse": ventes * 35 if espace == "nfc" else (ventes * prix_site() if prix_site() else None),
        "a_contacter": int((df.statut == "À contacter").sum()),
        "semaines": [{"semaine": d.strftime("%d/%m"), "contacts": n} for d, n in zip(semaines, contacts)],
        "entonnoir": stats.entonnoir(conn, espace),
        "relances": relances.sort_values("score", ascending=False)
                            [["cle", "nom", "statut", "relance_le", "categorie", "ville_recherche", "score"]]
                            .fillna("").head(6).to_dict("records"),
        "repartition": {s: int((df.statut == s).sum()) for s in db.STATUTS},
        "requetes": db.requetes_du_mois(conn), "limite_google": int(R("limite_google", "900")),
        "equipe": SYNCHRO,
    }


def api_trouver(q):
    espace = q["espace"]
    a_enrichir = conn.execute("""SELECT COUNT(*) FROM commerces WHERE espace=? AND (entreprise_le IS NULL OR (site_web IS NOT NULL AND enrichi_le IS NULL
             AND COALESCE(json_extract(entreprise, '$.verdict'), '') != 'exclu'))""", (espace,)).fetchone()[0]
    return {
        "cle_google": bool(R("cle_google")),
        "pays": [{"code": k, "nom": v[0], "langue": pays.LANGUES[v[1]], "emails": v[3], "regle": v[4]}
                 for k, v in pays.PAYS.items()],
        "categories": list(CATEGORIES[espace]),
        "a_enrichir": a_enrichir, "adaptes": types_adaptes(espace), "ca_minimum": ca_minimum(),
    }


def types_adaptes(espace, combien=6):
    """Les types de commerces qui achètent le plus (meilleur poids dans le score)."""
    return sorted(CATEGORIES[espace], key=lambda c: -CATEGORIES[espace][c][1])[:combien]


def api_recherche(d):
    if not R("cle_google"):
        raise ErreurAPI("Ajoute d'abord ta clé Google dans Réglages.")
    if not (d.get("ville") or "").strip():
        raise ErreurAPI("Indique une ville ou un quartier.")
    # Aucun type choisi : le logiciel prend lui-même les types les plus adaptés.
    categories = d.get("categories") or types_adaptes(d["espace"])
    return lancer_job(job_recherche, d["espace"], categories, d["ville"].strip(), d["pays"],
                      max(1, min(3, int(d.get("pages", 3)))))


def api_enrichir(d):
    lot = [dict(r) for r in conn.execute(
        """SELECT cle, place_id, nom, adresse, pays, site_web, enrichi_le, entreprise, entreprise_le, siren_force
           FROM commerces WHERE espace=? AND (entreprise_le IS NULL OR (site_web IS NOT NULL AND enrichi_le IS NULL
             AND COALESCE(json_extract(entreprise, '$.verdict'), '') != 'exclu')) ORDER BY score DESC LIMIT ?""", (d["espace"], int(d.get("combien", 50))))]
    if not lot:
        raise ErreurAPI("Toutes les entreprises sont déjà vérifiées et tous les sites analysés.")
    return lancer_job(job_enrichir, lot)


def site_resume(c):
    """(étiquette courte, liste des problèmes) sur le site du commerce : l'argument de vente des sites."""
    site = c.get("site_web")
    if not site:
        return "Pas de site", ["Aucun site internet"]
    if sans_vrai_site(site):
        return "Réseau social seul", ["Seulement une page de réseau social, pas de vrai site"]
    etat = etat_site(c)
    if etat is None:
        return "Pas encore analysé", []
    if etat.get("plateforme"):
        return "Plateforme seule", ["Seulement une page TheFork, Planity… pas de vrai site"]
    if etat.get("injoignable"):
        return "Site en panne", ["Le site ne s'ouvre pas"]
    liste = audit.constats(c)
    graves = [k for k in liste if k["gravite"] <= 2]
    if not graves:
        return "Site correct", [k["titre"] for k in liste]
    return (graves[0]["titre"].split(" (")[0] if len(graves) == 1 else f"{len(graves)} défauts"), [k["titre"] for k in liste]


def api_prospects(q):
    lignes = conn.execute(
        "SELECT cle, score, nom, categorie, note, nb_avis, statut, telephone, email, instagram, site_web, site_etat, "
        "ville_recherche, pays, relance_le, entreprise FROM commerces WHERE espace=? ORDER BY score DESC", (q["espace"],))
    liste = []
    for r in lignes:
        c = dict(r)
        e = entreprise_de(c) or {}
        c.pop("site_etat"); c.pop("entreprise")
        liste.append({**c, "priorite": niveau(c["score"] or 0), "site": site_resume(dict(r))[0],
                      "pme": e.get("verdict"), "ca": entreprises.euros(e["ca"]) if e.get("ca") else ""})
    return {"prospects": liste}


def api_prospect(q):
    c = commerce(q["cle"])
    hist = [dict(r) for r in conn.execute("SELECT date, canal, detail, auteur FROM historique WHERE cle=? ORDER BY date DESC",
                                          (q["cle"],))]
    lg = mailer.langue_modele(pays.langue(c.get("pays") or "FR"))
    m = mailer.modele(c["espace"], lg, "premier")
    remplir = lambda t: mailer.remplir(t, c, R("signature"), lg, R("site_prix", "[TON PRIX]"), R("site_delai", "[DÉLAI]"))
    e = entreprise_de(c)
    if e:
        e = {**e, "libelle": entreprises.LIBELLES.get(e.get("verdict"), ""),
             "ca_txt": entreprises.euros(e.get("ca")) if e.get("siren") else ""}
    return {**c, "historique": hist, "pays_nom": pays.nom(c.get("pays") or "FR"), "priorite": niveau(c["score"] or 0),
            "site": site_resume(c)[0], "constats": site_resume(c)[1], "entreprise": e, "ca_minimum": ca_minimum(),
            "analyse": [{k: v for k, v in k_.items() if k != "court"} for k_ in audit.constats(c)],
            "note_site": audit.note_site(c), "analyse_ancienne": bool(etat_site(c)) and not (etat_site(c) or {}).get("analyse")
            and not (etat_site(c) or {}).get("injoignable") and not (etat_site(c) or {}).get("plateforme"),
            "dm": mailer.remplir(R(f"modele_dm_{c['espace']}", dm_defaut(c["espace"])), c, "", "fr"),
            "mail_sujet": remplir(m["sujets"].splitlines()[0]), "mail_corps": remplir(m["corps"])}


def api_audit(q):
    """Le document d'audit du site, en PDF, à joindre au message de prospection."""
    c = commerce(q["cle"])
    etat = etat_site(c)
    if c.get("site_web") and not sans_vrai_site(c["site_web"]) and (etat is None or not etat.get("analyse")):
        analyser_site(conn, c)  # pas encore analysé, ou analysé par une ancienne version : on le refait
        recalculer_place(conn, c["place_id"])
        c = commerce(q["cle"])
    signature = R("signature", REGLAGES["signature"])
    expediteur = signature.splitlines()[1] if len(signature.splitlines()) > 1 else "Review Maker"
    contenu = audit.pdf(c, expediteur, signature, R("site_prix"), R("site_delai"))
    db.ajouter_historique(conn, c["cle"], "Fiche", "Audit PDF créé")
    nom = re.sub(r'[\\/:*?"<>|]+', " ", c.get("nom") or "commerce").strip()
    return contenu, "application/pdf", f"Audit site - {nom}.pdf"


def api_entreprise(d):
    """Corrige l'entreprise rattachée à la fiche (SIREN tapé à la main), ou relance la vérification."""
    c = commerce(d["cle"])
    siren = re.sub(r"\D", "", d.get("siren") or "")
    if siren and len(siren) not in (9, 14):
        raise ErreurAPI("Un SIREN a 9 chiffres (ou un SIRET 14 chiffres).")
    conn.execute("UPDATE commerces SET siren_force=? WHERE place_id=?", (siren[:9] or None, c["place_id"]))
    c["siren_force"] = siren[:9] or None
    res = verifier_entreprise(conn, c)
    recalculer_place(conn, c["place_id"])
    if res.get("erreur"):
        raise ErreurAPI(res["raison"])
    return {"ok": True, "verdict": res.get("verdict")}


def api_reanalyser(d):
    c = commerce(d["cle"])
    if not c.get("site_web"):
        raise ErreurAPI("Ce commerce n'a pas de site à analyser.")
    analyser_site(conn, c)
    recalculer_place(conn, c["place_id"])
    return {"ok": True}


def api_maj_prospect(d):
    """Met à jour seulement les champs envoyés (la fiche enregistre chaque changement tout de suite)."""
    c = commerce(d["cle"])
    valeurs = {}
    if "email" in d:
        email = (d.get("email") or "").strip()
        if email and not EMAIL_RE.match(email):
            raise ErreurAPI("Cette adresse email n'est pas valide.")
        if email != (c["email"] or ""):
            valeurs["email"] = email or None
            db.ajouter_historique(conn, c["cle"], "Fiche", f"Email modifié : {email or 'supprimé'}")
    if d.get("statut") in db.STATUTS:
        valeurs["statut"] = d["statut"]
        if d["statut"] == "Vendu" and c["statut"] != "Vendu":
            db.ajouter_historique(conn, c["cle"], "Vente", db.ESPACES[c["espace"]])
    if "notes" in d:
        valeurs["notes"] = d.get("notes") or ""
    if "relance_le" in d:
        valeurs["relance_le"] = d.get("relance_le") or None
    db.maj_commerce(conn, c["cle"], **valeurs)
    if d.get("canal"):
        db.ajouter_historique(conn, c["cle"], d["canal"], d.get("detail", ""))
    recalculer(conn, c["cle"])
    REVEIL_SYNCHRO.set()
    return {"ok": True}


def api_export(d):
    cles = d.get("cles") or []
    if not cles:
        raise ErreurAPI("Aucun commerce à exporter.")
    df = pd.read_sql(f"SELECT score, nom, categorie, note, nb_avis, statut, telephone, email, instagram, site_web, "
                     f"ville_recherche, pays, relance_le FROM commerces WHERE cle IN ({','.join('?' * len(cles))}) "
                     f"ORDER BY score DESC", conn, params=cles)
    tampon = io.BytesIO()
    df.to_excel(tampon, index=False)
    return tampon.getvalue()


def api_reglages(q):
    return {"valeurs": {k: R(k, v) for k, v in REGLAGES.items()}, "dossiers_detectes": equipe.dossiers_detectes()}


def api_enregistrer_reglages(d):
    avant = ca_minimum()
    for k, v in d.get("valeurs", {}).items():
        if k in REGLAGES:
            db.set_reglage(conn, k, str(v).strip() if k.startswith("cle_") or k in ("prenom", "equipe_dossier") else v)
    db.AUTEUR = R("prenom")
    if ca_minimum() != avant:
        conn.execute("UPDATE commerces SET entreprise_le=NULL WHERE entreprise IS NOT NULL")
        conn.commit()
    REVEIL_SYNCHRO.set()
    return {"ok": True}


def api_choisir_dossier(d):
    """Ouvre la fenêtre Windows « Choisir un dossier » et renvoie le dossier choisi."""
    import tempfile
    sortie = Path(tempfile.gettempdir()) / f"rm-dossier-{uuid.uuid4().hex[:6]}.txt"
    script = ("import sys,tkinter,tkinter.filedialog as f;r=tkinter.Tk();r.withdraw();r.attributes('-topmost',True);"
              "p=f.askdirectory(title='Choisis le dossier Google Drive partagé avec ton coéquipier');"
              "open(sys.argv[1],'w',encoding='utf-8').write(p or '')")
    try:
        subprocess.run([sys.executable, "-c", script, str(sortie)], timeout=600,
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        chemin = sortie.read_text(encoding="utf-8").strip() if sortie.exists() else ""
    except (OSError, subprocess.SubprocessError):
        raise ErreurAPI("Impossible d'ouvrir la fenêtre de choix : colle le chemin du dossier à la main.")
    finally:
        sortie.unlink(missing_ok=True)
    return {"dossier": str(Path(chemin)) if chemin else ""}


def api_synchroniser(d):
    REVEIL_SYNCHRO.set()
    return {"ok": True}


def api_job(q):
    job = JOBS.get(q["id"])
    if not job:
        raise ErreurAPI("Tâche inconnue.")
    return job


def api_annuler(d):
    if d.get("id") in JOBS:
        JOBS[d["id"]]["annule"] = True
    return {"ok": True}


# --- Marketing : planning TikTok / Instagram ----------------------------------------
# Le planning lui-même est dans web/marketing/planning.json. On enregistre seulement ce qui est fait,
# dans les réglages de la base (clé « marketing_fait » : {identifiant du post: date où il a été coché}).

def _marketing_fait():
    try:
        return json.loads(R("marketing_fait", "{}") or "{}")
    except ValueError:
        return {}


def api_marketing(q):
    return {"fait": _marketing_fait()}


def api_marketing_fait(d):
    ident = str(d.get("id") or "").strip()
    if not ident or len(ident) > 80:
        raise ErreurAPI("Post inconnu.")
    fait = _marketing_fait()
    if d.get("fait"):
        fait[ident] = db.maintenant()
    else:
        fait.pop(ident, None)
    db.set_reglage(conn, "marketing_fait", json.dumps(fait, ensure_ascii=False))
    return {"fait": fait}


GET = {"etat": api_etat, "tableau": api_tableau, "trouver": api_trouver, "prospects": api_prospects,
       "prospect": api_prospect, "reglages": api_reglages, "job": api_job,
       "marketing": api_marketing, "audit": api_audit}
POST = {"recherche": api_recherche, "enrichir": api_enrichir, "prospect": api_maj_prospect, "export": api_export,
        "reglages": api_enregistrer_reglages, "annuler": api_annuler,
        "choisir_dossier": api_choisir_dossier, "synchroniser": api_synchroniser, "quitter": lambda d: api_quitter(d),
        "marketing_fait": api_marketing_fait, "entreprise": api_entreprise, "reanalyser": api_reanalyser}


# --- Serveur ---------------------------------------------------------------------

def fichier_statique(chemin):
    """Fichiers servis : l'interface (web) et les photos de fond (fonds)."""
    if chemin in ("/", "/index.html", "/marketing"):  # /marketing : ouvre directement la rubrique Marketing
        return WEB / "index.html"
    m = re.fullmatch(r"/fonds/([a-z]+)(-mini)?\.jpg", chemin)
    if m:
        return photo_fond(m.group(1), bool(m.group(2)))
    for prefixe, dossier in (("/web/", WEB),):
        if chemin.startswith(prefixe):
            cible = (dossier / chemin[len(prefixe):]).resolve()
            if cible.is_file() and dossier.resolve() in cible.parents:
                return cible
    return None


DERNIER_SIGNE = time.monotonic()  # dernière requête de la page ouverte dans le navigateur
ARRET_APRES = 150                 # secondes sans signe de la page (onglet endormi…) avant l'arrêt
PAGE_FERMEE = None                # moment où la page a dit « je me ferme »
DELAI_FERMETURE = 4               # secondes d'attente : une page rechargée se reconnecte avant


def api_quitter(d):
    global PAGE_FERMEE
    PAGE_FERMEE = DERNIER_SIGNE
    return {}


def surveiller_arret(serveur):
    """Arrête le logiciel dès que sa page est fermée, ou s'il n'a plus de nouvelles de la page.
    Une tâche en cours (une recherche par exemple) va toujours jusqu'au bout avant."""
    while True:
        time.sleep(1)
        if any(not j["fini"] for j in JOBS.values()):
            continue
        maintenant = time.monotonic()
        fermee = (PAGE_FERMEE is not None and DERNIER_SIGNE <= PAGE_FERMEE
                  and maintenant - PAGE_FERMEE > DELAI_FERMETURE)
        if fermee or maintenant - DERNIER_SIGNE > ARRET_APRES:
            print(f"{datetime.now():%d/%m %H:%M} Page fermée : arrêt du logiciel.")
            synchroniser_maintenant()  # envoie les dernières modifications au coéquipier
            serveur.shutdown()
            return


class Gestionnaire(BaseHTTPRequestHandler):
    def log_message(self, *args):  # pas de bruit dans le journal
        pass

    def parse_request(self):
        global DERNIER_SIGNE
        DERNIER_SIGNE = time.monotonic()
        return super().parse_request()

    def _repondre(self, code, corps, type_="application/json; charset=utf-8", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", type_)
        self.send_header("Content-Length", str(len(corps)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(corps)

    def _json(self, code, donnees):
        self._repondre(code, json.dumps(donnees, ensure_ascii=False, default=str).encode("utf-8"))

    def _api(self, table, nom, donnees):
        fonction = table.get(nom)
        if not fonction:
            return self._json(404, {"erreur": "Page inconnue."})
        try:
            if nom == "choisir_dossier":  # la fenêtre peut rester ouverte longtemps : ne bloque pas le reste
                resultat = fonction(donnees)
            else:
                with VERROU:
                    resultat = fonction(donnees)
        except ErreurAPI as e:
            return self._json(400, {"erreur": str(e)})
        except Exception as e:
            if "readonly" in str(e):
                return self._json(500, {"erreur": "Le logiciel ne peut pas enregistrer : ferme la fenêtre du Terminal "
                                                  "(ou redémarre l'ordinateur), puis relance le logiciel."})
            return self._json(500, {"erreur": f"Erreur inattendue : {e}"})
        if isinstance(resultat, bytes):
            return self._repondre(200, resultat, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                  {"Content-Disposition": 'attachment; filename="prospects.xlsx"'})
        if isinstance(resultat, tuple):  # (contenu, type, nom du fichier)
            contenu, type_, nom = resultat
            return self._repondre(200, contenu, type_, {
                "Content-Disposition": f"attachment; filename=\"audit.pdf\"; filename*=UTF-8''{quote(nom)}"})
        self._json(200, resultat)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path.startswith("/api/"):
            q = {k: v[0] for k, v in parse_qs(url.query).items()}
            return self._api(GET, url.path[5:], q)
        cible = fichier_statique(url.path)
        if not cible:
            return self._repondre(404, b"Introuvable", "text/plain; charset=utf-8")
        type_ = mimetypes.guess_type(cible.name)[0] or "application/octet-stream"
        if type_.startswith("text/") or type_ in ("application/javascript", "application/json"):
            type_ += "; charset=utf-8"
        self._repondre(200, cible.read_bytes(), type_)

    def do_POST(self):
        url = urlparse(self.path)
        if not url.path.startswith("/api/"):
            return self._repondre(404, b"Introuvable", "text/plain; charset=utf-8")
        taille = int(self.headers.get("Content-Length") or 0)
        try:
            donnees = json.loads(self.rfile.read(taille) or b"{}")
        except ValueError:
            return self._json(400, {"erreur": "Demande illisible."})
        self._api(POST, url.path[5:], donnees)


def version_deja_lancee():
    """Version et dossier du logiciel qui occupe déjà le port, ou None (ancienne version sans numéro)."""
    try:
        etat = requests.get(f"http://127.0.0.1:{PORT}/api/etat", timeout=3,
                            proxies={"http": None, "https": None}).json()
        return etat.get("version"), etat.get("dossier")
    except (requests.RequestException, ValueError, AttributeError):
        return None


def arreter_ancien_logiciel():
    """Ferme le programme qui occupe le port (une ancienne version encore ouverte)."""
    if sys.platform == "darwin":  # Mac
        try:
            pids = subprocess.run(["lsof", "-ti", f"tcp:{PORT}", "-sTCP:LISTEN"],
                                  capture_output=True, text=True).stdout.split()
        except OSError:
            return
        for pid in pids:
            subprocess.run(["kill", pid], capture_output=True)
        return
    if sys.platform != "win32":
        return
    try:
        sortie = subprocess.run(["netstat", "-ano", "-p", "TCP"], capture_output=True, text=True,
                                creationflags=subprocess.CREATE_NO_WINDOW).stdout
    except OSError:
        return
    for ligne in sortie.splitlines():
        morceaux = ligne.split()
        if len(morceaux) >= 5 and morceaux[1].endswith(f":{PORT}") and morceaux[3] == "LISTENING":
            subprocess.run(["taskkill", "/PID", morceaux[4], "/F"], capture_output=True,
                           creationflags=subprocess.CREATE_NO_WINDOW)


def main():
    adresse = f"http://127.0.0.1:{PORT}/"
    try:
        serveur = ThreadingHTTPServer(("127.0.0.1", PORT), Gestionnaire)
    except OSError:
        if version_deja_lancee() == (VERSION, str(ICI)):  # même version, même dossier
            webbrowser.open(adresse)  # déjà ouvert : on rouvre simplement la page
            return
        # Une autre version (ou une copie dans un autre dossier, peut-être supprimé) tourne encore :
        # on la ferme pour lancer celle-ci.
        print(f"{datetime.now():%d/%m %H:%M} Ancienne version encore ouverte : fermeture.")
        arreter_ancien_logiciel()
        for _ in range(20):
            time.sleep(0.5)
            try:
                serveur = ThreadingHTTPServer(("127.0.0.1", PORT), Gestionnaire)
                break
            except OSError:
                continue
        else:
            print("Impossible de fermer l'ancienne version : redémarre l'ordinateur.")
            webbrowser.open(adresse)
            return
    print(f"{datetime.now():%d/%m %H:%M} Review Maker est ouvert dans ton navigateur : {adresse}")
    if "--sans-navigateur" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(adresse)).start()
    threading.Thread(target=boucle_synchro, daemon=True).start()
    if "--sans-arret" not in sys.argv:
        threading.Thread(target=surveiller_arret, args=(serveur,), daemon=True).start()
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
