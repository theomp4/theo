"""Commerces qui viennent d'être repris (rachat du fonds de commerce), dans tes départements.

Source : le BODACC (Bulletin officiel des annonces civiles et commerciales), publié par l'État,
en données ouvertes, gratuit et sans clé : bodacc-datadila.opendatasoft.com.

Pourquoi c'est une bonne piste : un nouveau propriétaire refait presque toujours son image
(enseigne, site, réseaux), et le commerce a déjà des clients et un chiffre d'affaires.
Le chiffre d'affaires vérifié est celui de l'ancien exploitant : c'est lui qui reflète la taille
du commerce (la société du repreneur est souvent toute neuve).
"""
import json
import re
import time
import unicodedata
from datetime import date, timedelta

import requests

URL = "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records"
LIEN = "https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:{id}"
JOURS = 45

# Activité écrite dans l'annonce -> type de commerce du logiciel (espace « Sites internet »)
ACTIVITES = [
    ("Restaurants", ("restaura", "brasserie", "pizz", "creperie", "snack", "traiteur", "bar ", "cafe", "debit de boissons",
                     "kebab", "burger", "sushi", "salon de the", "bistro")),
    ("Coiffeurs", ("coiff", "barbier", "barber")),
    ("Instituts de beauté et ongles", ("esthetique", "beaute", "onglerie", "ongles", "spa", "soins du corps", "maquillage")),
    ("Boulangeries-pâtisseries", ("boulang", "patiss", "viennoiserie", "chocolat")),
    ("Boucheries, primeurs, épiceries fines", ("bouch", "charcut", "primeur", "fruits et legumes", "epicerie", "fromage",
                                               "poissonn", "caviste", "vins")),
    ("Fleuristes", ("fleur",)),
    ("Hôtels et chambres d'hôtes", ("hotel", "chambres d hotes", "gite", "hebergement touristique")),
    ("Garages et carrosseries", ("garage", "carrosserie", "reparation automobile", "mecanique", "vehicules", "automobile")),
    ("Artisans du bâtiment (plombier, électricien…)", ("plomb", "electricit", "chauffage", "menuiserie", "maconnerie",
                                                      "peinture", "batiment", "couverture", "serrurerie")),
]
# Annonces qui ne sont pas des reprises de commerce à démarcher
EXCLUS = ("fusion", "apport partiel", "holding", "location-gerance", "location gerance", "pompes funebres", "pharmacie",
          "officine", "transport", "agence immobiliere")


def _norm(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()
    return " " + re.sub(r"[^a-z0-9]+", " ", t) + " "


def _json(v):
    if isinstance(v, (dict, list)):
        return v
    try:
        return json.loads(v or "null")
    except (TypeError, ValueError):
        return None


def _premier(v):
    return v[0] if isinstance(v, list) and v else v if isinstance(v, dict) else {}


def _adresse(a):
    a = a or {}
    rue = " ".join(x for x in [a.get("numeroVoie"), a.get("typeVoie"), a.get("nomVoie")] if x)
    return ", ".join(x for x in [rue, " ".join(x for x in [a.get("codePostal"), a.get("ville")] if x)] if x)


def _siren(personne):
    p = personne if isinstance(personne, dict) else {}
    num = _txt((_premier(p.get("numeroImmatriculation")) or {}).get("numeroIdentification"))
    num = re.sub(r"\D", "", num)
    return num if len(num) == 9 else None


def _txt(v):
    """Texte d'un champ du BODACC, qui peut être une liste (plusieurs prénoms…) ou un objet."""
    if isinstance(v, list):
        return " ".join(_txt(x) for x in v if x)
    if isinstance(v, dict):
        return _txt(v.get("#text") or "")
    return str(v or "").strip()


def _nom(personne):
    p = personne if isinstance(personne, dict) else {}
    if p.get("denomination"):
        return _txt(p["denomination"])
    return " ".join(x for x in [_txt(p.get("prenom")), _txt(p.get("nomUsage") or p.get("nom"))] if x)


def lire(record):
    """Une annonce BODACC -> dict simple, ou None si ce n'est pas une reprise de commerce."""
    etab = _premier((_json(record.get("listeetablissements")) or {}).get("etablissement")) or {}
    acheteur = _premier((_json(record.get("listepersonnes")) or {}).get("personne")) or {}
    vendeur = _premier((_json(record.get("listeprecedentproprietaire")) or {}).get("personne")) or {}
    acte = _json(record.get("acte")) or {}
    vente = acte.get("vente") or {}
    activite = _txt(etab.get("activite"))
    categorie_vente = _txt(vente.get("categorieVente"))
    texte = _norm(f"{categorie_vente} {_txt(etab.get('origineFonds'))} {activite} {_txt(acte.get('descriptif'))[:300]}")
    if not activite or not any(m in texte for m in (" achat ", " vente ", " cession ", " acquis ", " achete ")):
        return None
    if any(f" {m}" in texte for m in EXCLUS):
        return None
    nom = (_txt(etab.get("enseigne")) or _txt(etab.get("nomCommercial")) or _txt(acheteur.get("nomCommercial"))
           or _nom(acheteur) or _txt(record.get("commercant"))).strip()
    adresse = _adresse(etab.get("adresse")) or ", ".join(x for x in [record.get("cp"), record.get("ville")] if x)
    return {
        "id": record.get("id"), "date": record.get("dateparution"), "date_effet": vente.get("dateEffet"),
        "nom": nom, "activite": activite[:300], "categorie": categorie(activite, nom), "adresse": adresse,
        "cp": (etab.get("adresse") or {}).get("codePostal") or record.get("cp"),
        "ville": (etab.get("adresse") or {}).get("ville") or record.get("ville"),
        "departement": record.get("numerodepartement"),
        "repreneur": _nom(acheteur), "repreneur_siren": _siren(acheteur),
        "ancien": _nom(vendeur), "ancien_siren": _siren(vendeur),
        "lien": record.get("url_complete") or LIEN.format(id=record.get("id")),
    }


def categorie(activite, nom=""):
    """Le nom du commerce d'abord (« Boulangerie Martin »), puis l'activité déclarée."""
    for texte in (_norm(nom), _norm(activite)):
        for cat, mots in ACTIVITES:
            if any(f" {m}" in texte for m in mots):
                return cat
    return "Autres commerces"


def departements(texte):
    """« 69, 01 et 38 » -> ["69", "01", "38"] (2A/2B et 971… acceptés)."""
    return list(dict.fromkeys(re.findall(r"\b(?:2[AB]|97\d|\d{2})\b", (texte or "").upper())))


def recuperer(depts, jours=JOURS, session=None, maximum=600):
    """Annonces de reprise des `jours` derniers jours dans ces départements, les plus récentes d'abord."""
    session = session or requests.Session()
    if not depts:
        return []
    debut = (date.today() - timedelta(days=jours)).isoformat()
    liste = ", ".join(f'"{d}"' for d in depts)
    annonces, offset = [], 0
    while offset < maximum:
        params = {"where": f'familleavis="vente" and numerodepartement in ({liste}) and dateparution >= "{debut}"',
                  "order_by": "dateparution desc", "limit": 100, "offset": offset}
        for essai in range(4):
            try:
                rep = session.get(URL, params=params, timeout=30)
                if rep.status_code == 429 or rep.status_code >= 500:
                    raise requests.ConnectionError(f"BODACC a répondu {rep.status_code}")
                rep.raise_for_status()
                break
            except (requests.ConnectionError, requests.Timeout):
                if essai == 3:
                    raise
                time.sleep(2 + essai * 2)
        resultats = rep.json().get("results") or []
        annonces += [a for a in (lire(r) for r in resultats) if a]
        if len(resultats) < 100:
            break
        offset += 100
        time.sleep(0.5)
    return annonces
