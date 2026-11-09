"""Review Maker · Prospection : petit serveur local qui affiche l'interface dans ton navigateur.

Lancé par « Lancer Review Maker.bat ». Tout reste sur ton ordinateur : l'interface (dossier web)
parle à ce serveur, qui lit et écrit la base data/prospection.db.
"""
import io
import json
import mimetypes
import random
import re
import sys
import threading
import time
import uuid
import webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pandas as pd

from rm_prospect import db, enrich, google_places, ia, mailer, pays, stats
from rm_prospect.scoring import CATEGORIES, niveau, poids, score_pour

ICI = Path(__file__).resolve().parent
WEB = ICI / "web"
PORT = 8765
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")

conn = db.connect()
db.purger_donnees_google(conn)
VERROU = threading.RLock()  # une seule requête à la fois sur la base partagée
JOBS = {}                   # tâches longues (recherche, analyse des sites, envoi) suivies par l'interface


def R(cle, defaut=""):
    return db.get_reglage(conn, cle, defaut)


def dm_defaut(espace):
    if espace == "web":
        return ("Bonjour ! J'ai vu {nom} sur Google : {note} et {nb_avis} avis, bravo. {phrase_site} "
                "Je crée des sites simples et modernes pour les commerces, tout à distance. "
                "Si vous avez des questions, n'hésitez pas !")
    return ("Bonjour ! J'ai vu {nom} sur Google : {phrase_avis} J'ai un tag à coller sur le comptoir qui permet "
            "à vos clients de laisser un avis en moins de 15 secondes. 35 €, livraison offerte. "
            "Si vous avez des questions, n'hésitez pas !")


# Réglages modifiables depuis l'écran Réglages, avec leur valeur par défaut.
REGLAGES = {
    "theme": "sombre", "accent": "or",
    "cle_claude": "", "ia_modele": ia.MODELE_DEFAUT, "ia_budget": "2", "ia_relire": "1",
    "ia_consignes_nfc": ia.CONSIGNES_DEFAUT["nfc"], "ia_consignes_web": ia.CONSIGNES_DEFAUT["web"],
    "ia_ajouts_nfc": "", "ia_ajouts_web": "",
    "site_prix": "[TON PRIX]", "site_delai": "[DÉLAI]",
    "cle_google": "", "limite_google": "900",
    "email_adresse": "", "email_alias": "", "email_nom": "Review Maker", "smtp_identifiant": "",
    "smtp_mot_de_passe": "", "smtp_serveur": "smtp.gmail.com", "smtp_port": "587", "imap_serveur": "imap.gmail.com",
    "signature": "Ton prénom\nReview Maker\nreviewmaker.fr",
    "emails_max_jour": "30", "pause_min": "45", "pause_max": "120",
    "modele_dm_nfc": dm_defaut("nfc"), "modele_dm_web": dm_defaut("web"),
}


def config_email(adresse=None):
    return {
        "serveur": R("smtp_serveur", "smtp.gmail.com"), "port": R("smtp_port", "587"),
        "serveur_imap": R("imap_serveur", "imap.gmail.com"),
        "identifiant": R("smtp_identifiant"), "mot_de_passe": R("smtp_mot_de_passe"),
        "adresse": adresse or R("email_adresse") or R("smtp_identifiant"),
        "nom_expediteur": R("email_nom", "Review Maker"),
    }


def consignes_ia(espace):
    base = R(f"ia_consignes_{espace}", ia.CONSIGNES_DEFAUT[espace])
    ajouts = [a for a in R(f"ia_ajouts_{espace}").splitlines() if a.strip()]
    return base + ("\n" + "\n".join(ajouts) if ajouts else "")


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
            job["avance"] = 1.0
            c_conn.close()

    threading.Thread(target=tourner, daemon=True).start()
    return {"job": jid}


def job_recherche(job, c_conn, espace, cats, ville, code_pays, pages):
    total_n = total_m = 0
    for i, cat in enumerate(cats):
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


def job_enrichir(job, c_conn, lot):
    trouves = 0
    for i, c in enumerate(lot):
        if job["annule"]:
            break
        job["texte"] = c["nom"]
        res = enrich.enrichir_site(c["site_web"])
        etat = json.dumps(res["site_etat"]) if res["site_etat"] else None
        # Le même commerce peut exister dans les deux espaces : on met à jour les deux fiches.
        c_conn.execute("UPDATE commerces SET email=COALESCE(email, ?), instagram=COALESCE(instagram, ?), "
                       "site_etat=?, enrichi_le=? WHERE place_id=?",
                       (res["email"], res["instagram"], etat, db.maintenant(), c["place_id"]))
        c_conn.commit()
        for r in c_conn.execute("SELECT cle FROM commerces WHERE place_id=?", (c["place_id"],)).fetchall():
            recalculer(c_conn, r["cle"])
        trouves += bool(res["email"])
        job["avance"] = (i + 1) / len(lot)
    return f"{trouves} emails trouvés sur {i + 1 if lot else 0} sites."


def job_envoi(job, c_conn, cfg, etape, emails):
    pause_min, pause_max = int(R("pause_min", "45")), int(R("pause_max", "120"))
    envoyes = 0
    for i, e in enumerate(emails):
        if job["annule"]:
            break
        c = dict(c_conn.execute("SELECT * FROM commerces WHERE cle=?", (e["cle"],)).fetchone())
        job["texte"] = f"Envoi à {c['nom']}"
        serveur = mailer.ouvrir_smtp(cfg)
        serveur.send_message(mailer.construire_message(cfg, e["email"], e["sujet"], e["corps"], e["langue"]))
        serveur.quit()
        mailer.enregistrer_envoi(c_conn, c, e["sujet"], etape, e["email"])
        envoyes += 1
        job["avance"] = (i + 1) / len(emails)
        if i < len(emails) - 1:
            attente = random.randint(pause_min, pause_max)
            for s in range(attente):
                if job["annule"]:
                    break
                job["texte"] = f"{envoyes} envoyé(s). Pause de sécurité : prochain email dans {attente - s} s"
                time.sleep(1)
    return f"{envoyes} email(s) envoyé(s)."


# --- Pages de l'API ---------------------------------------------------------------

def api_etat(q):
    depense, appels = db.depense_ia_du_mois(conn)
    return {
        "theme": R("theme", "sombre"), "accent": R("accent", "or"), "espaces": db.ESPACES,
        "requetes": db.requetes_du_mois(conn), "limite_google": int(R("limite_google", "900")),
        "emails_jour": db.emails_envoyes_aujourdhui(conn), "ia_depense": round(depense, 3), "ia_appels": appels,
        "ia_budget": float(R("ia_budget", "2")),
        "limite_jour": mailer.limite_du_jour(conn, int(R("emails_max_jour", "30"))),
        "statuts": db.STATUTS,
        "a_contacter": {e: conn.execute("SELECT COUNT(*) FROM commerces WHERE espace=? AND statut='À contacter'",
                                        (e,)).fetchone()[0] for e in db.ESPACES},
    }


def api_tableau(q):
    espace = q["espace"]
    df = pd.read_sql("SELECT cle, statut, score, relance_le, nom, telephone, email FROM commerces WHERE espace=?",
                     conn, params=(espace,))
    semaines = stats.par_semaine(conn, espace)
    aujourd_hui = datetime.now().strftime("%Y-%m-%d")
    relances = df[(df.relance_le.notna()) & (df.relance_le <= aujourd_hui)
                  & (~df.statut.isin(["Vendu", "Refus", "Ne plus contacter"]))]
    taux = stats.taux_par_type(conn, espace)
    ventes = int((df.statut == "Vendu").sum())
    return {
        "total": len(df), "haute": int((df.score.fillna(0) >= 75).sum()),
        "contactes": int(df.statut.isin(db.STATUTS_CONTACTES).sum()), "ventes": ventes,
        "encaisse": ventes * 35 if espace == "nfc" else None,
        "semaines": [{"semaine": s, **{k: int(v) for k, v in r.items()}} for s, r in semaines.iterrows()],
        "entonnoir": stats.entonnoir(conn, espace),
        "taux": [{"type": r["Type"], "contactes": int(r["Contactés"]), "taux": int(r["Taux de réponse (%)"])}
                 for _, r in taux.iterrows()],
        "relances": relances.sort_values("score", ascending=False)[["cle", "nom", "statut", "relance_le", "telephone", "email", "score"]].fillna("").to_dict("records"),
        "repartition": {s: int((df.statut == s).sum()) for s in db.STATUTS},
    }


def api_globe(q):
    espace = q["espace"]
    points = [{**dict(r), "priorite": niveau(r["score"] or 0)} for r in conn.execute(
        "SELECT cle, nom, lat, lng, statut, score, ville_recherche AS ville, pays FROM commerces "
        "WHERE espace=? AND lat IS NOT NULL", (espace,))]
    feed = [dict(r) for r in conn.execute(
        "SELECT h.date, h.canal, h.detail, c.nom FROM historique h JOIN commerces c ON c.cle=h.cle "
        "WHERE c.espace=? ORDER BY h.date DESC LIMIT 6", (espace,))]
    return {"points": points, "feed": feed}


def api_trouver(q):
    espace = q["espace"]
    a_enrichir = conn.execute("SELECT COUNT(*) FROM commerces WHERE espace=? AND site_web IS NOT NULL "
                              "AND enrichi_le IS NULL", (espace,)).fetchone()[0]
    return {
        "cle_google": bool(R("cle_google")),
        "pays": [{"code": k, "nom": v[0], "langue": pays.LANGUES[v[1]], "emails": v[3], "regle": v[4]}
                 for k, v in pays.PAYS.items()],
        "categories": list(CATEGORIES[espace]),
        "defaut": (["Restaurants", "Coiffeurs", "Instituts de beauté et ongles"] if espace == "nfc"
                   else ["Garages et carrosseries", "Artisans du bâtiment (plombier, électricien…)", "Restaurants"]),
        "a_enrichir": a_enrichir,
    }


def api_recherche(d):
    if not R("cle_google"):
        raise ErreurAPI("Ajoute d'abord ta clé Google dans Réglages.")
    if not (d.get("ville") or "").strip() or not d.get("categories"):
        raise ErreurAPI("Choisis une ville et au moins un type de commerce.")
    return lancer_job(job_recherche, d["espace"], d["categories"], d["ville"].strip(), d["pays"],
                      max(1, min(3, int(d.get("pages", 3)))))


def api_enrichir(d):
    lot = [dict(r) for r in conn.execute(
        "SELECT cle, place_id, nom, site_web FROM commerces WHERE espace=? AND site_web IS NOT NULL "
        "AND enrichi_le IS NULL ORDER BY score DESC LIMIT ?", (d["espace"], int(d.get("combien", 50))))]
    if not lot:
        raise ErreurAPI("Aucun site à visiter pour l'instant.")
    return lancer_job(job_enrichir, lot)


def api_prospects(q):
    lignes = conn.execute(
        "SELECT cle, score, nom, categorie, note, nb_avis, statut, telephone, email, instagram, site_web, "
        "ville_recherche, pays, relance_le FROM commerces WHERE espace=? ORDER BY score DESC", (q["espace"],))
    return {"prospects": [{**dict(r), "priorite": niveau(r["score"] or 0)} for r in lignes]}


def api_prospect(q):
    c = commerce(q["cle"])
    hist = [dict(r) for r in conn.execute("SELECT date, canal, detail FROM historique WHERE cle=? ORDER BY date DESC",
                                          (q["cle"],))]
    return {**c, "historique": hist, "pays_nom": pays.nom(c.get("pays") or "FR"), "priorite": niveau(c["score"] or 0),
            "phrase_site": mailer.phrase_site(c),
            "dm": mailer.remplir(R(f"modele_dm_{c['espace']}", dm_defaut(c["espace"])), c, "", "fr")}


def api_maj_prospect(d):
    c = commerce(d["cle"])
    email = (d.get("email") or "").strip()
    if email and not EMAIL_RE.match(email):
        raise ErreurAPI("Cette adresse email n'est pas valide.")
    statut = d.get("statut") if d.get("statut") in db.STATUTS else c["statut"]
    db.maj_commerce(conn, c["cle"], statut=statut, email=email or None, notes=d.get("notes", ""),
                    relance_le=d.get("relance_le") or None)
    if statut == "Vendu" and c["statut"] != "Vendu":
        db.ajouter_historique(conn, c["cle"], "Vente", db.ESPACES[c["espace"]])
    if email != (c["email"] or ""):
        db.ajouter_historique(conn, c["cle"], "Fiche", f"Email modifié : {email or 'supprimé'}")
    if statut == "Ne plus contacter" and email:
        db.desinscrire(conn, email)
    if d.get("canal"):
        db.ajouter_historique(conn, c["cle"], d["canal"], d.get("detail", ""))
    recalculer(conn, c["cle"])
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


def api_emails(q):
    espace, etape = q["espace"], q.get("etape", "premier")
    configure = bool(R("smtp_identifiant") and R("smtp_mot_de_passe"))
    limite = mailer.limite_du_jour(conn, int(R("emails_max_jour", "30")))
    tous = mailer.candidats(conn, espace, etape)
    liste = [c for c in tous if pays.emails_autorises(c.get("pays") or "FR")]
    modeles = {}
    for lg in ("fr", "en"):
        m = mailer.modele(espace, lg, etape)
        cle = f"{espace}_{lg}_{etape}"
        modeles[lg] = {"sujets": R(f"sujets_{cle}", m["sujets"]), "corps": R(f"corps_{cle}", m["corps"])}
    return {
        "configure": configure, "limite": limite, "restants": max(0, limite - db.emails_envoyes_aujourdhui(conn)),
        "adresses": [a for a in [R("email_adresse") or R("smtp_identifiant")] +
                     [a.strip() for a in R("email_alias").splitlines()] if a],
        "etapes": mailer.NOMS_ETAPES, "bloques": len(tous) - len(liste),
        "candidats": [{"cle": c["cle"], "nom": c["nom"], "ville": c.get("ville_recherche") or "",
                       "score": c.get("score") or 0, "email": c["email"], "raisons": c.get("raisons") or "",
                       "langue": pays.langue(c.get("pays") or "FR")} for c in liste],
        "ia": bool(R("cle_claude")), "relire": R("ia_relire", "1") == "1", "consignes": consignes_ia(espace),
        "demandes_rapides": ia.DEMANDES_RAPIDES, "modeles": modeles, "signature": R("signature"),
        "pause": [int(R("pause_min", "45")), int(R("pause_max", "120"))],
    }


def api_enregistrer_modele(d):
    cle = f"{d['espace']}_{d['langue']}_{d['etape']}"
    db.set_reglage(conn, f"sujets_{cle}", d["sujets"])
    db.set_reglage(conn, f"corps_{cle}", d["corps"])
    return {"ok": True}


def api_rendu(d):
    """Emails du modèle fixe, remplis pour chaque commerce (dans sa langue : français ou anglais)."""
    espace, etape = d["espace"], d["etape"]
    prix, delai, sig = R("site_prix", "[TON PRIX]"), R("site_delai", "[DÉLAI]"), R("signature")
    resultat = []
    for e in d["commerces"]:
        c = commerce(e["cle"])
        lg = mailer.langue_modele(pays.langue(c.get("pays") or "FR"))
        if lg == d["langue"]:
            sujets, corps = d["sujets"], d["corps"]
        else:
            m = mailer.modele(espace, lg, etape)
            sujets = R(f"sujets_{espace}_{lg}_{etape}", m["sujets"])
            corps = R(f"corps_{espace}_{lg}_{etape}", m["corps"])
        sujet = random.choice([s for s in sujets.splitlines() if s.strip()] or [""])
        resultat.append({"cle": c["cle"], "sujet": mailer.remplir(sujet, c, sig, lg, prix, delai),
                         "corps": mailer.remplir(corps, c, sig, lg, prix, delai), "langue": lg,
                         "stop": mailer.MENTIONS_STOP[lg]})
    return {"emails": resultat}


def api_adresses(d):
    for m in d.get("modifs", []):
        email = (m.get("email") or "").strip()
        if not EMAIL_RE.match(email):
            raise ErreurAPI(f"Adresse invalide : {email or '(vide)'}")
        c = commerce(m["cle"])
        if email != c["email"]:
            db.maj_commerce(conn, c["cle"], email=email)
            db.ajouter_historique(conn, c["cle"], "Fiche", f"Email modifié : {email}")
    return {"ok": True}


def api_ia(d):
    c = commerce(d["cle"])
    espace, demande = c["espace"], (d.get("demande") or "").strip() or None
    actuel = d.get("actuel")
    try:
        res = ia.rediger(conn, R("cle_claude"), c, espace, d["etape"], pays.langue(c.get("pays") or "FR"),
                         consignes_ia(espace), R("ia_modele", ia.MODELE_DEFAUT), float(R("ia_budget", "2")),
                         R("site_prix", "[TON PRIX]"), R("site_delai", "[DÉLAI]"), demande=demande,
                         email_actuel=f"Sujet : {actuel['sujet']}\n\n{actuel['corps']}" if actuel and demande else None)
    except ia.ErreurIA as e:
        raise ErreurAPI(str(e))
    if demande and d.get("retenir"):
        ajouts = R(f"ia_ajouts_{espace}")
        if demande not in ajouts.splitlines():
            db.set_reglage(conn, f"ia_ajouts_{espace}", (ajouts + "\n" + demande).strip())
    return {"sujet": res["sujet"], "corps": res["corps"]}


def _verifier_emails(emails):
    propres = []
    for e in emails:
        email = (e.get("email") or "").strip()
        if not EMAIL_RE.match(email):
            raise ErreurAPI(f"Adresse invalide : {email or '(vide)'}")
        if db.est_desinscrit(conn, email):
            continue
        propres.append({**e, "email": email, "langue": e.get("langue") or "fr"})
    return propres


def api_test(d):
    if not EMAIL_RE.match((d.get("a") or "").strip()):
        raise ErreurAPI("Indique une adresse valide pour le test.")
    cfg = config_email(d.get("expediteur"))
    try:
        serveur = mailer.ouvrir_smtp(cfg)
        serveur.send_message(mailer.construire_message(cfg, d["a"].strip(), d["sujet"], d["corps"],
                                                       d.get("langue", "fr")))
        serveur.quit()
    except Exception as e:
        raise ErreurAPI(f"Échec de l'envoi : {e}")
    return {"ok": True}


def api_envoyer(d):
    emails = _verifier_emails(d.get("emails", []))
    restants = max(0, mailer.limite_du_jour(conn, int(R("emails_max_jour", "30"))) - db.emails_envoyes_aujourdhui(conn))
    emails = emails[:restants]
    if not emails:
        raise ErreurAPI("Rien à envoyer (limite du jour atteinte ou aucun email prêt).")
    return lancer_job(job_envoi, config_email(d.get("expediteur")), d["etape"], emails)


def api_reponses(d):
    try:
        stops, reponses = mailer.verifier_reponses(conn, config_email())
    except Exception as e:
        raise ErreurAPI(f"Lecture impossible : {e}")
    return {"message": f"{reponses} nouvelle(s) réponse(s), {stops} désinscription(s). "
                       "Les relances sont arrêtées pour eux."}


def api_reglages(q):
    return {"valeurs": {k: R(k, v) for k, v in REGLAGES.items()},
            "modeles_ia": {k: v[0] for k, v in ia.MODELES.items()}}


def api_enregistrer_reglages(d):
    for k, v in d.get("valeurs", {}).items():
        if k in REGLAGES:
            db.set_reglage(conn, k, str(v).strip() if k.startswith("cle_") else v)
    pmin, pmax = int(R("pause_min", "45")), int(R("pause_max", "120"))
    db.set_reglage(conn, "pause_min", min(pmin, pmax))
    db.set_reglage(conn, "pause_max", max(pmin, pmax))
    return {"ok": True}


def api_desinscrire(d):
    email = (d.get("email") or "").strip()
    if not EMAIL_RE.match(email):
        raise ErreurAPI("Cette adresse email n'est pas valide.")
    db.desinscrire(conn, email)
    return {"message": f"{email} ne recevra plus jamais d'email."}


# --- Marketing : planning des posts TikTok / Instagram ------------------------------
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


def api_job(q):
    job = JOBS.get(q["id"])
    if not job:
        raise ErreurAPI("Tâche inconnue.")
    return job


def api_annuler(d):
    if d.get("id") in JOBS:
        JOBS[d["id"]]["annule"] = True
    return {"ok": True}


GET = {"etat": api_etat, "tableau": api_tableau, "globe": api_globe, "trouver": api_trouver,
       "prospects": api_prospects, "prospect": api_prospect, "emails": api_emails, "reglages": api_reglages,
       "job": api_job, "marketing": api_marketing}
POST = {"recherche": api_recherche, "enrichir": api_enrichir, "prospect": api_maj_prospect, "export": api_export,
        "modele": api_enregistrer_modele, "rendu": api_rendu, "adresses": api_adresses, "ia": api_ia,
        "test": api_test, "envoyer": api_envoyer, "reponses": api_reponses, "reglages": api_enregistrer_reglages,
        "desinscrire": api_desinscrire, "annuler": api_annuler, "marketing_fait": api_marketing_fait}


# --- Serveur ---------------------------------------------------------------------

def fichier_statique(chemin):
    """Fichiers servis : l'interface et les contours du globe (web), le logo (assets)."""
    if chemin in ("/", "/index.html"):
        return WEB / "index.html"
    if chemin in ("/marketing", "/marketing.html"):
        return WEB / "marketing.html"
    for prefixe, dossier in (("/web/", WEB), ("/assets/", ICI / "assets")):
        if chemin.startswith(prefixe):
            cible = (dossier / chemin[len(prefixe):]).resolve()
            if cible.is_file() and dossier.resolve() in cible.parents:
                return cible
    return None


class Gestionnaire(BaseHTTPRequestHandler):
    def log_message(self, *args):  # pas de bruit dans la fenêtre noire
        pass

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
            with VERROU:
                resultat = fonction(donnees)
        except ErreurAPI as e:
            return self._json(400, {"erreur": str(e)})
        except Exception as e:
            return self._json(500, {"erreur": f"Erreur inattendue : {e}"})
        if isinstance(resultat, bytes):
            return self._repondre(200, resultat, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                  {"Content-Disposition": 'attachment; filename="prospects.xlsx"'})
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
        corps = cible.read_bytes()
        if cible == WEB / "index.html":
            # ajoute l'entrée « Marketing · Planning » au menu, sans toucher au fichier de l'interface
            corps = corps.replace(b"</body>", b'<script src="/web/marketing-menu.js"></script>\n</body>', 1)
        self._repondre(200, corps, type_)

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


def main():
    adresse = f"http://127.0.0.1:{PORT}/"
    try:
        serveur = ThreadingHTTPServer(("127.0.0.1", PORT), Gestionnaire)
    except OSError:
        # Déjà lancé (fenêtre noire encore ouverte) : on rouvre simplement la page.
        webbrowser.open(adresse)
        return
    print(f"\n  Review Maker est ouvert dans ton navigateur : {adresse}")
    print("  Laisse cette fenêtre ouverte pendant que tu travailles. Ferme-la pour quitter.\n")
    if "--sans-navigateur" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(adresse)).start()
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
