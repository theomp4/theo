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
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

import pandas as pd
import requests

from rm_prospect import audit, db, enrich, entreprises, equipe, google_places, mailer, marches, pays, reprises, stats
from rm_prospect.scoring import CATEGORIES, entreprise as entreprise_de, etat_site, niveau, poids, sans_vrai_site, score_pour

if sys.stdout is None or sys.stderr is None:
    # Lancé sans fenêtre (pythonw) : les messages et erreurs vont dans data/journal.txt.
    db.DATA_DIR.mkdir(parents=True, exist_ok=True)
    sys.stdout = sys.stderr = open(db.DATA_DIR / "journal.txt", "a", encoding="utf-8", buffering=1)

ICI = Path(__file__).resolve().parent
WEB = ICI / "web"
PORT = int(os.environ.get("RM_PORT", "8765"))  # RM_PORT : tests
VERSION = "19 novembre 2026 (application)"  # affichée dans Réglages : permet de vérifier que la mise à jour est bien installée
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
        try:
            db.copier_base(plus_recente, db.DB_PATH)  # copie cohérente, journal compris ; jamais en lecture seule
        except Exception:
            shutil.copyfile(plus_recente, db.DB_PATH)
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
    "site_prix": "990 €", "prix_boutique": "1 790 €", "site_delai": "5 à 10 jours", "signature": "",
    "nom": "", "email_pro": "", "telephone_pro": "",
    "modele_dm_nfc": dm_defaut("nfc"), "modele_dm_web": dm_defaut("web"),
    "prenom": "", "equipe_dossier": "", "ca_minimum": "200000", "reprises_departements": "",
}


ANCIENNE_SIGNATURE = "Ton prénom\nReview Maker\nreviewmaker.fr"


def contact():
    """Mes coordonnées (Réglages de cet ordinateur) : sur mes audits et dans ma signature."""
    return {"prenom": R("prenom"), "nom": R("nom"), "email": R("email_pro"), "telephone": R("telephone_pro")}


def signature():
    """La signature des emails : celle des Réglages, sinon faite avec mes coordonnées."""
    s = R("signature").strip()
    if s and s != ANCIENNE_SIGNATURE:
        return s
    c = contact()
    lignes = [" ".join(x for x in [c["prenom"], c["nom"]] if x), "ReviewMaker · reviewmaker.fr",
              " · ".join(x for x in [c["email"], c["telephone"]] if x)]
    return "\n".join(l for l in lignes if l)


def offre():
    return {"vitrine": R("site_prix", REGLAGES["site_prix"]), "boutique": R("prix_boutique", REGLAGES["prix_boutique"]),
            "delai": R("site_delai", REGLAGES["site_delai"])}


def ca_minimum():
    chiffres = re.sub(r"[^\d]", "", R("ca_minimum", "200000"))
    return int(chiffres) if chiffres else entreprises.CA_MINIMUM


# L'ancien message Instagram par défaut (jamais modifié) est remplacé par le nouveau, qui annonce l'audit.
if db.get_reglage(conn, "modele_dm_web") == ANCIEN_DM_WEB:
    db.set_reglage(conn, "modele_dm_web", dm_defaut("web"))
# Anciennes valeurs « à remplir » : remplacées par les tarifs du site reviewmaker.fr.
for _cle, _ancienne in (("site_prix", "[TON PRIX]"), ("site_delai", "[DÉLAI]"), ("signature", ANCIENNE_SIGNATURE)):
    if db.get_reglage(conn, _cle, None) == _ancienne:
        db.set_reglage(conn, _cle, REGLAGES[_cle])

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
SYNCHRO = {"actif": False, "derniere": None, "coequipiers": [], "erreur": "", "recues": 0, "journal": 0}
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
        modifiees, SYNCHRO["coequipiers"] = equipe.importer(c_conn, dossier, poste, etat.setdefault("lus", {}), prenom)
        notes = {c for c in modifiees if c.startswith("journal:")}
        for cle in modifiees - notes:
            if c_conn.execute("SELECT 1 FROM commerces WHERE cle=?", (cle,)).fetchone():
                recalculer(c_conn, cle)
        SYNCHRO["recues"] += len(modifiees - notes)
        SYNCHRO["journal"] += len(notes)
        # On ne refabrique ma copie que si la base a changé depuis la dernière fois (sinon : rien à faire).
        empreinte = (c_conn.execute("PRAGMA data_version").fetchone()[0], c_conn.total_changes, prenom, dossier)
        if empreinte != etat.get("empreinte"):
            etat["contenu"] = equipe.exporter(c_conn, dossier, prenom, poste, etat.get("contenu"))
            etat["empreinte"] = empreinte
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


# --- Journal : ce que Théo et Luke ont fait, au fil du temps ----------------------------

def journal_nouveaux():
    """Notes du coéquipier écrites depuis la dernière fois que j'ai ouvert le journal."""
    moi, vu = R("prenom"), R("journal_vu_le", "")
    return conn.execute("SELECT COUNT(*) FROM journal WHERE supprime=0 AND date>? AND auteur!=?",
                        (vu, moi or "\x00")).fetchone()[0] if moi else 0


def api_journal(q):
    notes = [dict(r) for r in conn.execute(
        "SELECT uid, date, auteur, texte, modifie_le FROM journal WHERE supprime=0 ORDER BY date DESC LIMIT 1000")]
    return {"notes": notes, "moi": R("prenom"), "vu_le": R("journal_vu_le", ""), "equipe": SYNCHRO}


def api_journal_vu(d):
    db.set_reglage(conn, "journal_vu_le", db.maintenant())
    return {"ok": True}


def api_journal_ecrire(d):
    """Ajoute une note (sans uid), la modifie ou la supprime (avec uid)."""
    texte = (d.get("texte") or "").strip()
    if d.get("uid"):
        row = conn.execute("SELECT uid FROM journal WHERE uid=?", (d["uid"],)).fetchone()
        if not row:
            raise ErreurAPI("Note introuvable.")
        if d.get("supprimer"):
            conn.execute("UPDATE journal SET supprime=1, modifie_le=? WHERE uid=?", (db.maintenant_precis(), d["uid"]))
        else:
            if not texte:
                raise ErreurAPI("La note est vide.")
            conn.execute("UPDATE journal SET texte=?, modifie_le=? WHERE uid=?", (texte[:5000], db.maintenant_precis(), d["uid"]))
    else:
        auteur = (d.get("auteur") or R("prenom") or "").strip()
        if not texte:
            raise ErreurAPI("Écris d'abord ce que tu as fait.")
        if not auteur:
            raise ErreurAPI("Choisis qui écrit la note (Théo ou Luke).")
        maintenant = db.maintenant_precis()
        conn.execute("INSERT INTO journal(uid, date, auteur, texte, modifie_le) VALUES(?, ?, ?, ?, ?)",
                     (uuid.uuid4().hex, maintenant[:19], auteur[:40], texte[:5000], maintenant))
    conn.commit()
    REVEIL_SYNCHRO.set()  # partage tout de suite avec le coéquipier
    return {"ok": True}


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


def job_recherche(job, c_conn, espace, cats, ville, code_pays, pages, cle_google, limite):
    total_n = total_m = 0
    for i, cat in enumerate(cats):
        if job["annule"]:
            break
        job["texte"] = f"{cat}…"
        try:
            n, m, _ = google_places.rechercher(c_conn, cle_google, espace, cat, ville, code_pays, pages, limite)
        except google_places.QuotaAtteint as e:
            raise ErreurAPI(f"{e} Augmente la limite dans Réglages seulement si tu as vérifié ton quota gratuit.")
        total_n += n
        total_m += m
        job["avance"] = (i + 1) / len(cats)
    return f"{total_n} nouveaux commerces, {total_m} mis à jour."


def enregistrer_entreprise(c_conn, c, res):
    """Enregistre la vérification de l'entreprise dans toutes ses fiches. Renvoie le verdict."""
    c_conn.execute("UPDATE commerces SET entreprise=?, entreprise_le=? WHERE place_id=?",
                   (json.dumps(res, ensure_ascii=False), db.maintenant(), c["place_id"]))
    c_conn.commit()
    return res


def enregistrer_analyse(c_conn, c, res):
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


def origine_de(c):
    try:
        return json.loads(c.get("origine") or "null") or {}
    except (TypeError, ValueError):
        return {}


def verifier_commerce(c, minimum, session=None):
    """Vérifie l'entreprise. Pour un commerce repris, c'est l'ancien exploitant qui compte : la société du
    repreneur est souvent toute neuve, alors que le chiffre d'affaires de l'ancien reflète la taille du commerce."""
    o = origine_de(c)
    if o.get("type") != "reprise":
        return entreprises.verifier(c, minimum, session)
    if not (c.get("siren_force") or o.get("ancien_siren")):
        return {"verdict": "inconnu", "raison": "commerce repris, ancien exploitant non identifié : chiffre d'affaires à vérifier",
                "verifie_le": db.maintenant()}
    res = entreprises.verifier({**c, "siren_force": c.get("siren_force") or o.get("ancien_siren")}, minimum, session)
    if res.get("siren"):
        res["raison"] = f"avant la reprise ({res.get('nom') or o.get('ancien')}) : {res['raison']}"
        res["reprise"] = True
    return res


def traiter(job, c_conn, c, minimum, session, compte):
    """1. Vérifie l'entreprise (PME, chiffre d'affaires minimum). 2. Si elle est dans la cible : visite son site
    (email, Instagram, analyse de base pour le message et l'audit)."""
    job["texte"] = f"{c['nom']} : vérification de l'entreprise…"
    e = entreprise_de(c)
    if not c.get("entreprise_le"):
        e = enregistrer_entreprise(c_conn, c, verifier_commerce(c, minimum, session))
        compte["verifiees"] += 1
    if e and e.get("verdict") == "exclu":
        compte["exclues"] += 1
    elif c.get("site_web") and not c.get("enrichi_le"):
        job["texte"] = f"{c['nom']} : analyse du site…"
        res = enrich.enrichir_site(c["site_web"])
        enregistrer_analyse(c_conn, c, res)
        compte["analyses"] += 1
        compte["trouves"] += bool(res["email"])
        compte["injoignables"] += bool((res["site_etat"] or {}).get("injoignable"))
    recalculer_place(c_conn, c["place_id"])


def bilan(compte):
    v, x, a, t_, i = (compte[k] for k in ("verifiees", "exclues", "analyses", "trouves", "injoignables"))
    morceaux = []
    if v:
        morceaux.append(f"{v} entreprise{'s' if v > 1 else ''} vérifiée{'s' if v > 1 else ''} ({x} hors cible)")
    if a:
        morceaux.append(f"{a} site{'s' if a > 1 else ''} analysé{'s' if a > 1 else ''}, {t_} email{'s' if t_ > 1 else ''} "
                        f"trouvé{'s' if t_ > 1 else ''}")
    if i:
        morceaux.append(f"{i} site{'s' if i > 1 else ''} ne s'ouvre{'nt' if i > 1 else ''} pas")
    return " · ".join(morceaux)


def nouveau_compte():
    return dict.fromkeys(("verifiees", "exclues", "analyses", "trouves", "injoignables"), 0)


def job_enrichir(job, c_conn, lot, minimum):
    session, compte = requests.Session(), nouveau_compte()
    for i, c in enumerate(lot):
        if job["annule"]:
            break
        traiter(job, c_conn, c, minimum, session, compte)
        job["avance"] = (i + 1) / len(lot)
    return (bilan(compte) or "Rien à faire.") + "."


# --- Reprises de commerces (BODACC) ----------------------------------------------------

COLONNES_LOT = "cle, place_id, nom, adresse, pays, site_web, enrichi_le, entreprise, entreprise_le, siren_force, origine"


def lieu_google(c_conn, cle_google, limite, a):
    """La fiche Google du commerce repris (même nom ou même adresse), ou None."""
    try:
        lieux = google_places.chercher_lieu(c_conn, cle_google, f"{a['nom']} {a['adresse']}", "FR", limite)
    except google_places.ErreurGoogle:
        return None
    rue = (a.get("adresse") or "").split(",")[0]
    meilleur, score = None, 0
    for l in lieux:
        s = entreprises.ressemblance(a["nom"], l["nom"]) + (0.4 if entreprises.meme_adresse(rue, l.get("adresse")) else 0)
        if a.get("cp") and a["cp"] not in (l.get("adresse") or ""):
            s -= 0.3
        if s > score:
            meilleur, score = l, s
    return meilleur if score >= 0.6 else None


def job_reprises(job, c_conn, depts, combien, cle_google, limite, minimum):
    """Lit les reprises récentes au BODACC, ajoute les plus récentes à « Mes prospects » (fiche Google, entreprise
    vérifiée, site analysé), avec un message adapté (« Félicitations pour la reprise… »)."""
    job["texte"] = "Lecture des annonces de reprise au BODACC…"
    try:
        annonces = reprises.recuperer(depts)
    except requests.RequestException:
        raise ErreurAPI("Le BODACC (site de l'État) ne répond pas pour l'instant : réessaie dans quelques minutes.")
    for a in annonces:
        c_conn.execute("INSERT OR IGNORE INTO reprises(id, date, departement, categorie, donnees) VALUES(?, ?, ?, ?, ?)",
                       (a["id"], a["date"], a["departement"], a["categorie"], json.dumps(a, ensure_ascii=False)))
    c_conn.commit()
    marques = ",".join("?" * len(depts))
    a_traiter = [json.loads(r["donnees"]) for r in c_conn.execute(
        f"SELECT donnees FROM reprises WHERE statut='nouvelle' AND departement IN ({marques}) "
        f"ORDER BY categorie='Autres commerces', date DESC LIMIT ?", (*depts, combien))]
    session, compte, google, ajoutees = requests.Session(), nouveau_compte(), 0, 0
    for i, a in enumerate(a_traiter):
        if job["annule"]:
            break
        job["texte"] = f"{a['nom']} : recherche sur Google…"
        lieu = None
        if cle_google:
            try:
                lieu = lieu_google(c_conn, cle_google, limite, a)
            except google_places.QuotaAtteint as e:
                raise ErreurAPI(f"{e} Les reprises déjà ajoutées restent dans tes prospects.")
        google += bool(lieu)
        c = lieu or {"place_id": f"bodacc-{a['id']}", "nom": a["nom"], "adresse": a["adresse"]}
        origine = {"type": "reprise", "date": a.get("date_effet") or a["date"], "parution": a["date"], "lien": a["lien"],
                   "ancien": a.get("ancien"), "ancien_siren": a.get("ancien_siren"), "repreneur": a.get("repreneur"),
                   "activite": a.get("activite"), "google": bool(lieu)}
        c.update(espace="web", categorie=a["categorie"], ville_recherche=a.get("ville") or "", pays="FR",
                 google_maj=db.maintenant() if lieu else None, origine=json.dumps(origine, ensure_ascii=False))
        c["score"], raisons = score_pour("web", c, poids("web", a["categorie"]))
        c["raisons"] = " ; ".join(raisons)
        db.enregistrer_commerce(c_conn, c)
        cle = db.cle_de("web", c["place_id"])
        c_conn.execute("UPDATE commerces SET origine=?, siren_force=COALESCE(siren_force, ?) WHERE cle=?",
                       (c["origine"], a.get("ancien_siren"), cle))
        c_conn.execute("UPDATE reprises SET statut='ajoutee', cle=?, ajoute_le=? WHERE id=?", (cle, db.maintenant(), a["id"]))
        c_conn.commit()
        fiche = dict(c_conn.execute(f"SELECT {COLONNES_LOT} FROM commerces WHERE cle=?", (cle,)).fetchone())
        ajoutees += 1
        traiter(job, c_conn, fiche, minimum, session, compte)
        job["avance"] = (i + 1) / len(a_traiter)
    if not a_traiter:
        return f"{len(annonces)} annonces de reprise lues : rien de nouveau à ajouter dans ces départements."
    n = ajoutees
    return (f"{n} reprise{'s' if n > 1 else ''} ajoutée{'s' if n > 1 else ''} à tes prospects ({google} trouvée{'s' if google > 1 else ''} "
            f"sur Google). " + (bilan(compte) + "." if bilan(compte) else ""))


def api_reprises(q):
    depts = reprises.departements(R("reprises_departements"))
    marques = ",".join("?" * len(depts)) or "''"
    restantes = conn.execute(f"SELECT COUNT(*) FROM reprises WHERE statut='nouvelle' AND departement IN ({marques})",
                             depts).fetchone()[0] if depts else 0
    ajoutees = conn.execute("SELECT COUNT(*) FROM commerces WHERE espace='web' AND origine LIKE '%\"reprise\"%'").fetchone()[0]
    return {"departements": R("reprises_departements"), "restantes": restantes, "ajoutees": ajoutees,
            "cle_google": bool(R("cle_google")), "requetes": db.requetes_du_mois(conn), "limite_google": int(R("limite_google", "900"))}


def api_reprises_chercher(d):
    depts = reprises.departements(d.get("departements"))
    if not depts:
        raise ErreurAPI("Indique au moins un département (ex. 69, 01, 38).")
    db.set_reglage(conn, "reprises_departements", ", ".join(depts))
    combien = max(1, min(100, int(d.get("combien") or 20)))
    return lancer_job(job_reprises, depts, combien, R("cle_google"), int(R("limite_google", "900")), ca_minimum())


# --- Marchés publics (BOAMP) ---------------------------------------------------------------
MARCHES = {"derniere": None, "erreur": ""}
VERROU_MARCHES = threading.Lock()


def actualiser_marches(c_conn):
    if not VERROU_MARCHES.acquire(blocking=False):
        return 0
    try:
        nouveaux = 0
        for m in marches.recuperer():
            score, raisons = marches.pertinence(m["objet"], m["procedure"])
            existe = c_conn.execute("SELECT 1 FROM marches WHERE idweb=?", (m["idweb"],)).fetchone()
            if existe:
                c_conn.execute("UPDATE marches SET objet=?, acheteur=?, departements=?, limite=?, lien=?, procedure=?, nature=?, "
                               "pertinence=?, raisons=? WHERE idweb=?", (m["objet"], m["acheteur"], m["departements"], m["limite"],
                                                                         m["lien"], m["procedure"], m["nature"], score, " ; ".join(raisons), m["idweb"]))
            else:
                c_conn.execute("INSERT INTO marches(idweb, objet, acheteur, departements, date, limite, lien, procedure, nature, "
                               "pertinence, raisons, ajoute_le) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                               (m["idweb"], m["objet"], m["acheteur"], m["departements"], m["date"], m["limite"], m["lien"],
                                m["procedure"], m["nature"], score, " ; ".join(raisons), db.maintenant()))
                nouveaux += 1
        c_conn.commit()
        MARCHES.update(derniere=db.maintenant(), erreur="")
        return nouveaux
    except Exception as e:
        MARCHES["erreur"] = f"Le BOAMP ne répond pas ({type(e).__name__}) : réessaie plus tard."
        raise
    finally:
        VERROU_MARCHES.release()


def boucle_marches():
    """Toutes les 6 heures tant que le logiciel est ouvert (le BOAMP publie chaque jour)."""
    c_conn = db.connect()
    time.sleep(8)
    while True:
        try:
            actualiser_marches(c_conn)
        except Exception as e:
            print(f"{datetime.now():%d/%m %H:%M} Marchés publics : {e}")
        time.sleep(6 * 3600)


def api_marches(q):
    aujourd_hui = datetime.now().date().isoformat()
    il_y_a_40j = (datetime.now() - timedelta(days=40)).date().isoformat()
    tous = q.get("tous") == "1"
    ou = "1=1" if tous else ("statut != 'Pas pour nous' AND (statut IN ('À étudier', 'Candidaté', 'Gagné') OR limite >= ? "
                             "OR (limite IS NULL AND date >= ?))")
    lignes = [dict(r) for r in conn.execute(f"SELECT * FROM marches WHERE {ou} ORDER BY pertinence >= 50 DESC, date DESC",
                                            () if tous else (aujourd_hui, il_y_a_40j))]
    mes_depts = set(reprises.departements(R("reprises_departements")))
    for m in lignes:
        m["chez_toi"] = bool(mes_depts & set(reprises.departements(m["departements"])))
        m["ouvert"] = bool(m["limite"] and m["limite"] >= aujourd_hui) or (not m["limite"] and m["date"] >= il_y_a_40j)
    return {"marches": lignes, "etat": MARCHES, "statuts": marches.STATUTS}


def api_marches_actualiser(d):
    c_conn = db.connect()
    try:
        return {"nouveaux": actualiser_marches(c_conn)}
    except Exception:
        raise ErreurAPI(MARCHES["erreur"])
    finally:
        c_conn.close()


def api_marches_maj(d):
    if d.get("statut") and d["statut"] not in marches.STATUTS:
        raise ErreurAPI("Statut inconnu.")
    if d.get("statut"):
        conn.execute("UPDATE marches SET statut=?, statut_le=? WHERE idweb=?", (d["statut"], db.maintenant(), d["idweb"]))
    if "notes" in d:
        conn.execute("UPDATE marches SET notes=? WHERE idweb=?", (d.get("notes") or "", d["idweb"]))
    conn.commit()
    return {"ok": True}


# --- Pages de l'API ---------------------------------------------------------------

def api_etat(q):
    return {
        "fond": R("fond", "salon"), "espaces": db.ESPACES, "statuts": db.STATUTS, "version": VERSION, "dossier": str(ICI), "appli": APPLI,
        "requetes": db.requetes_du_mois(conn), "limite_google": int(R("limite_google", "900")),
        "equipe": SYNCHRO, "journal_nouveaux": journal_nouveaux(),
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
                      max(1, min(3, int(d.get("pages", 3)))), R("cle_google"), int(R("limite_google", "900")))


def api_enrichir(d):
    lot = [dict(r) for r in conn.execute(
        f"""SELECT {COLONNES_LOT}
           FROM commerces WHERE espace=? AND (entreprise_le IS NULL OR (site_web IS NOT NULL AND enrichi_le IS NULL
             AND COALESCE(json_extract(entreprise, '$.verdict'), '') != 'exclu')) ORDER BY score DESC LIMIT ?""", (d["espace"], int(d.get("combien", 50))))]
    if not lot:
        raise ErreurAPI("Toutes les entreprises sont déjà vérifiées et tous les sites analysés.")
    return lancer_job(job_enrichir, lot, ca_minimum())


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
        "ville_recherche, pays, relance_le, entreprise, origine FROM commerces WHERE espace=? ORDER BY score DESC", (q["espace"],))
    liste = []
    for r in lignes:
        c = dict(r)
        e = entreprise_de(c) or {}
        o = origine_de(c)
        c.pop("site_etat"); c.pop("entreprise"); c.pop("origine")
        liste.append({**c, "priorite": niveau(c["score"] or 0), "site": site_resume(dict(r))[0],
                      "reprise": o.get("date") if o.get("type") == "reprise" else None,
                      "pme": e.get("verdict"), "ca": entreprises.euros(e["ca"]) if e.get("ca") else ""})
    return {"prospects": liste}


def api_prospect(q):
    c = commerce(q["cle"])
    hist = [dict(r) for r in conn.execute("SELECT date, canal, detail, auteur FROM historique WHERE cle=? ORDER BY date DESC",
                                          (q["cle"],))]
    lg = mailer.langue_modele(pays.langue(c.get("pays") or "FR"))
    o = origine_de(c)
    reprise = o.get("type") == "reprise"
    m = mailer.modele(c["espace"], lg, "premier", reprise)
    remplir = lambda t: mailer.remplir(t, c, signature(), lg, R("site_prix", REGLAGES["site_prix"]), R("site_delai", REGLAGES["site_delai"]))
    e = entreprise_de(c)
    if e:
        e = {**e, "libelle": entreprises.LIBELLES.get(e.get("verdict"), ""),
             "ca_txt": entreprises.euros(e.get("ca")) if e.get("siren") else ""}
    return {**c, "historique": hist, "pays_nom": pays.nom(c.get("pays") or "FR"), "priorite": niveau(c["score"] or 0),
            "site": site_resume(c)[0], "constats": site_resume(c)[1], "entreprise": e, "ca_minimum": ca_minimum(),
            "analyse": [{k: v for k, v in k_.items() if k != "court"} for k_ in audit.constats(c)],
            "note_site": audit.note_site(c), "analyse_ancienne": bool(etat_site(c)) and not (etat_site(c) or {}).get("analyse")
            and not (etat_site(c) or {}).get("injoignable") and not (etat_site(c) or {}).get("plateforme"),
            "dm": mailer.remplir(mailer.DM_REPRISE if reprise else R(f"modele_dm_{c['espace']}", dm_defaut(c["espace"])), c, "", "fr"),
            "origine": o,
            "mail_sujet": remplir(m["sujets"].splitlines()[0]), "mail_corps": remplir(m["corps"])}


# Les pages qui vont sur internet (plusieurs secondes) ne gardent le verrou de la base que pour lire et écrire :
# pendant qu'elles attendent un site, le reste du logiciel continue de répondre.

def api_audit(q):
    """Le document d'audit du site, en PDF, à joindre au message de prospection."""
    with VERROU:
        c = commerce(q["cle"])
        moi, tarifs = contact(), offre()
    etat = etat_site(c)
    if c.get("site_web") and not sans_vrai_site(c["site_web"]) and (etat is None or not etat.get("analyse")):
        res = enrich.enrichir_site(c["site_web"])  # pas encore analysé, ou par une ancienne version : on le refait
        with VERROU:
            enregistrer_analyse(conn, c, res)
            recalculer_place(conn, c["place_id"])
            c = commerce(q["cle"])
    contenu = audit.pdf(c, moi, tarifs)
    with VERROU:
        db.ajouter_historique(conn, c["cle"], "Fiche", "Audit PDF créé")
    nom = re.sub(r'[\\/:*?"<>|]+', " ", c.get("nom") or "commerce").strip()
    if q.get("enregistrer"):
        return enregistrer_fichier("Audits", f"Audit site - {nom}.pdf", contenu)
    return contenu, "application/pdf", f"Audit site - {nom}.pdf"


def api_entreprise(d):
    """Corrige l'entreprise rattachée à la fiche (SIREN tapé à la main), ou relance la vérification."""
    siren = re.sub(r"\D", "", d.get("siren") or "")
    if siren and len(siren) not in (9, 14):
        raise ErreurAPI("Un SIREN a 9 chiffres (ou un SIRET 14 chiffres).")
    with VERROU:
        c = commerce(d["cle"])
        conn.execute("UPDATE commerces SET siren_force=? WHERE place_id=?", (siren[:9] or None, c["place_id"]))
        conn.commit()
        minimum = ca_minimum()
    c["siren_force"] = siren[:9] or None
    res = verifier_commerce(c, minimum)
    with VERROU:
        enregistrer_entreprise(conn, c, res)
        recalculer_place(conn, c["place_id"])
    if res.get("erreur"):
        raise ErreurAPI(res["raison"])
    return {"ok": True, "verdict": res.get("verdict")}


def api_reanalyser(d):
    with VERROU:
        c = commerce(d["cle"])
    if not c.get("site_web"):
        raise ErreurAPI("Ce commerce n'a pas de site à analyser.")
    res = enrich.enrichir_site(c["site_web"])
    with VERROU:
        enregistrer_analyse(conn, c, res)
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


DOSSIER_FICHIERS = Path.home() / "Documents" / "ReviewMaker"


def ouvrir_fichier(chemin):
    """Ouvre un fichier (PDF, Excel) avec l'application habituelle de l'ordinateur."""
    try:
        if sys.platform == "darwin":
            subprocess.Popen(["open", str(chemin)])
        elif sys.platform == "win32":
            os.startfile(str(chemin))  # noqa: S606 (Windows uniquement)
        else:
            subprocess.Popen(["xdg-open", str(chemin)])
    except OSError:
        pass


def enregistrer_fichier(sous_dossier, nom, contenu):
    """Dans l'application il n'y a pas de dossier Téléchargements du navigateur : on range le fichier dans
    Documents > ReviewMaker > sous_dossier, puis on l'ouvre."""
    dossier = DOSSIER_FICHIERS / sous_dossier
    if not (Path.home() / "Documents").is_dir():
        dossier = Path.home() / "ReviewMaker" / sous_dossier
    dossier.mkdir(parents=True, exist_ok=True)
    chemin = dossier / nom
    chemin.write_bytes(contenu)
    ouvrir_fichier(chemin)
    return {"chemin": str(chemin), "dossier": str(dossier)}


def api_ouvrir(d):
    """Lien cliqué dans l'application : site, Google Maps, Instagram, email (mailto:) ou appel (tel:)."""
    url = (d.get("url") or "").strip()
    if not re.match(r"^(https?://|mailto:|tel:)", url, re.I):
        raise ErreurAPI("Lien non pris en charge.")
    webbrowser.open(url)
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
    if d.get("enregistrer"):
        return enregistrer_fichier("Exports", f"prospects {datetime.now():%Y-%m-%d %Hh%M}.xlsx", tampon.getvalue())
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
       "marketing": api_marketing, "audit": api_audit, "journal": api_journal, "reprises": api_reprises,
       "marches": api_marches}
POST = {"recherche": api_recherche, "enrichir": api_enrichir, "prospect": api_maj_prospect, "export": api_export,
        "reglages": api_enregistrer_reglages, "annuler": api_annuler,
        "choisir_dossier": api_choisir_dossier, "synchroniser": api_synchroniser, "quitter": lambda d: api_quitter(d),
        "marketing_fait": api_marketing_fait, "entreprise": api_entreprise, "reanalyser": api_reanalyser,
        "journal_ecrire": api_journal_ecrire, "journal_vu": api_journal_vu,
        "ouvrir": api_ouvrir, "reprises_chercher": api_reprises_chercher, "marches_actualiser": api_marches_actualiser, "marches_maj": api_marches_maj}


SANS_VERROU = {"choisir_dossier", "audit", "entreprise", "reanalyser", "marches_actualiser"}


# --- Serveur ---------------------------------------------------------------------

def fichier_statique(chemin):
    """Fichiers servis : l'interface (web) et les photos de fond (fonds)."""
    if chemin in ("/", "/index.html", "/marketing"):  # /marketing : ouvre directement la rubrique Marketing
        return WEB / "index.html"
    m = re.fullmatch(r"/fonds/([a-z]+)(-mini)?\.jpg", chemin)
    if m:
        return photo_fond(m.group(1), bool(m.group(2)))
    for prefixe, dossier in (("/web/", WEB), ("/assets/", ICI / "assets")):
        if chemin.startswith(prefixe):
            cible = (dossier / chemin[len(prefixe):]).resolve()
            if cible.is_file() and dossier.resolve() in cible.parents:
                return cible
    return None


DERNIER_SIGNE = time.monotonic()  # dernière requête de la page ouverte dans le navigateur
ARRET_APRES = 30 * 60             # secondes sans signe de la page avant l'arrêt (Safari endort les onglets cachés)
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
            if nom in SANS_VERROU:  # va sur internet : gère lui-même le verrou, pour ne pas bloquer le reste
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


APPLI = False  # True quand le logiciel est ouvert dans sa propre fenêtre (app.py), pas dans un navigateur


def demarrer(navigateur=True, arret_auto=True):
    """Démarre le serveur local et ses tâches de fond. Renvoie le serveur, ou None si cette même version
    tourne déjà (on se contente alors de la réafficher)."""
    adresse = f"http://127.0.0.1:{PORT}/"
    try:
        serveur = ThreadingHTTPServer(("127.0.0.1", PORT), Gestionnaire)
    except OSError:
        if version_deja_lancee() == (VERSION, str(ICI)):  # même version, même dossier : déjà ouvert
            return None
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
            raise RuntimeError("Impossible de fermer l'ancienne version du logiciel : redémarre l'ordinateur.")
    print(f"{datetime.now():%d/%m %H:%M} Review Maker est ouvert : {adresse}")
    if navigateur:
        threading.Timer(0.8, lambda: webbrowser.open(adresse)).start()
    threading.Thread(target=boucle_synchro, daemon=True).start()
    if "--sans-marches" not in sys.argv:
        threading.Thread(target=boucle_marches, daemon=True).start()
    if arret_auto:
        threading.Thread(target=surveiller_arret, args=(serveur,), daemon=True).start()
    return serveur


def ranger():
    """Avant de quitter : dernières modifications envoyées au coéquipier, base rangée dans prospection.db."""
    try:
        synchroniser_maintenant()
    except Exception:
        pass
    try:
        with VERROU:
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    except Exception:
        pass


def main():
    """Ancien lancement, dans le navigateur (sert aussi de secours si la fenêtre d'application ne s'ouvre pas)."""
    serveur = demarrer(navigateur="--sans-navigateur" not in sys.argv, arret_auto="--sans-arret" not in sys.argv)
    if serveur is None:
        webbrowser.open(f"http://127.0.0.1:{PORT}/")
        return
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        ranger()


if __name__ == "__main__":
    main()
