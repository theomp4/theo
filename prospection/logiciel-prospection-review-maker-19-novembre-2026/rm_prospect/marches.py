"""Marchés publics : les demandes officielles de création ou de refonte de site internet.

Source : le BOAMP (Bulletin officiel des annonces des marchés publics), publié par l'État, en données
ouvertes, gratuit et sans clé : boamp-datadila.opendatasoft.com. Répondre est gratuit (dossier à
déposer sur la plateforme indiquée dans l'avis).

Il y en a peu (quelques-unes par semaine en France), souvent pour des mairies, écoles, offices de
tourisme, hôpitaux : on les montre toutes, triées par pertinence et par date limite.
"""
import re
import time
import unicodedata
from datetime import date, timedelta

import requests

URL = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records"
JOURS = 90
STATUTS = ["Nouveau", "À étudier", "Candidaté", "Gagné", "Perdu", "Pas pour nous"]
MOTIFS = ["site internet", "site web", "site-internet", "refonte du site", "refonte de site", "portail internet",
          "site e-commerce", "site vitrine", "creation de site", "création de site", "site institutionnel"]
CHAMPS = "idweb,objet,nomacheteur,code_departement,dateparution,datelimitereponse,url_avis,procedure_libelle,nature_libelle"


def _norm(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()
    return " " + re.sub(r"[^a-z0-9]+", " ", t) + " "


def pertinence(objet, procedure=""):
    """(score sur 100, raison) : création ou refonte de site = notre métier ; maintenance seule = moins."""
    t = _norm(objet)
    score, raisons = 30, []
    if any(m in t for m in (" creation ", " refonte ", " realisation ", " conception ", " nouveau site ", " developpement ")):
        score += 45
        raisons.append("création ou refonte")
    if any(m in t for m in (" maintenance ", " hebergement ", " tierce ", " tma ", " infogerance ", " supervision ")):
        score -= 20 if raisons else 35
        raisons.append("maintenance ou hébergement")
    if any(m in t for m in (" application ", " logiciel ", " erp ", " intranet ", " extranet ")):
        score -= 10
    if "adapt" in _norm(procedure):
        score += 15
        raisons.append("procédure adaptée (dossier plus simple)")
    return max(0, min(100, score)), raisons


EXPRESSIONS = [" site internet ", " site web ", " sites internet ", " sites web ", " site e commerce ", " site vitrine ",
               " portail internet ", " portail web ", " refonte du site ", " refonte de site ", " site institutionnel ",
               " creation de site ", " site intranet et internet "]


def parle_de_site(objet):
    """La recherche du BOAMP trouve « site » et « web » séparément : on garde seulement les vraies expressions."""
    t = _norm(objet)
    return any(e in t for e in EXPRESSIONS) or bool(re.search(r" site (?:internet|web) ", t))


def lire(r):
    deps = r.get("code_departement") or []
    return {
        "idweb": r.get("idweb"), "objet": re.sub(r"\s+", " ", r.get("objet") or "").strip(),
        "acheteur": (r.get("nomacheteur") or "").strip(), "departements": ", ".join(deps if isinstance(deps, list) else [deps]),
        "date": r.get("dateparution"), "limite": (r.get("datelimitereponse") or "")[:10] or None,
        "lien": r.get("url_avis") or f"https://www.boamp.fr/pages/avis/?q=idweb:{r.get('idweb')}",
        "procedure": r.get("procedure_libelle") or "", "nature": r.get("nature_libelle") or "",
    }


def recuperer(jours=JOURS, session=None):
    """Avis de marché des `jours` derniers jours dont l'objet parle d'un site internet."""
    session = session or requests.Session()
    debut = (date.today() - timedelta(days=jours)).isoformat()
    filtre = " or ".join(f'objet like "%{m}%"' for m in MOTIFS)
    marches, offset = [], 0
    while offset < 500:
        params = {"where": f"({filtre}) and dateparution >= '{debut}'", "order_by": "dateparution desc",
                  "limit": 100, "offset": offset, "select": CHAMPS}
        for essai in range(4):
            try:
                rep = session.get(URL, params=params, timeout=30)
                if rep.status_code == 429 or rep.status_code >= 500:
                    raise requests.ConnectionError(f"BOAMP a répondu {rep.status_code}")
                rep.raise_for_status()
                break
            except (requests.ConnectionError, requests.Timeout):
                if essai == 3:
                    raise
                time.sleep(2 + essai * 2)
        resultats = rep.json().get("results") or []
        marches += [m for m in (lire(r) for r in resultats if r.get("idweb")) if parle_de_site(m["objet"])]
        if len(resultats) < 100:
            break
        offset += 100
    return marches
