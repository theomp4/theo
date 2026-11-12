"""Scores de priorité sur 100.

Tags NFC : un commerce à fort passage, avec peu d'avis ou une note moyenne, est le meilleur
prospect. Un commerce à 4,8 avec 1 200 avis n'a presque plus besoin de toi.

Sites internet : un commerce qui a une bonne réputation (bonne note, beaucoup d'avis) mais
pas de site, ou un site dépassé (non sécurisé, pas adapté au téléphone, lent, ancien).
"""
import json
from datetime import datetime

# Catégories : libellé -> (mots de recherche Google par langue, poids 0 à 1).
# Le poids reflète l'intérêt du produit pour ce type de commerce.
CATEGORIES_NFC = {
    "Restaurants": ({"fr": "restaurant", "en": "restaurant", "es": "restaurante", "it": "ristorante",
                     "de": "Restaurant", "pt": "restaurante", "nl": "restaurant"}, 1.0),
    "Pizzerias": ({"fr": "pizzeria", "en": "pizzeria", "es": "pizzería", "it": "pizzeria"}, 0.95),
    "Restauration rapide / kebab / burger": ({"fr": "restauration rapide", "en": "fast food",
                                              "es": "comida rápida", "de": "Imbiss"}, 0.85),
    "Cafés et bars": ({"fr": "café bar", "en": "cafe bar", "es": "cafetería bar", "it": "bar caffè",
                       "de": "Café Bar"}, 0.9),
    "Boulangeries-pâtisseries": ({"fr": "boulangerie pâtisserie", "en": "bakery", "es": "panadería",
                                  "it": "panetteria", "de": "Bäckerei"}, 0.85),
    "Coiffeurs": ({"fr": "coiffeur", "en": "hair salon", "es": "peluquería", "it": "parrucchiere",
                   "de": "Friseur", "pt": "cabeleireiro", "nl": "kapper"}, 0.9),
    "Barbiers": ({"fr": "barbier", "en": "barber", "es": "barbería", "it": "barbiere", "de": "Barbier"}, 0.9),
    "Instituts de beauté et ongles": ({"fr": "institut de beauté", "en": "beauty salon", "es": "salón de belleza",
                                       "it": "centro estetico", "de": "Kosmetikstudio"}, 0.9),
    "Hôtels et chambres d'hôtes": ({"fr": "hôtel", "en": "hotel", "es": "hotel", "it": "hotel", "de": "Hotel"}, 0.8),
    "Garages et carrosseries": ({"fr": "garage automobile", "en": "car repair", "es": "taller mecánico",
                                 "it": "officina auto", "de": "Autowerkstatt"}, 0.7),
    "Boucheries, primeurs, épiceries fines": ({"fr": "boucherie", "en": "butcher", "es": "carnicería",
                                               "it": "macelleria", "de": "Metzgerei"}, 0.65),
    "Fleuristes": ({"fr": "fleuriste", "en": "florist", "es": "floristería", "it": "fiorista", "de": "Blumenladen"}, 0.6),
    "Boutiques de vêtements": ({"fr": "boutique vêtements", "en": "clothing store", "es": "tienda de ropa",
                                "it": "negozio abbigliamento", "de": "Bekleidungsgeschäft"}, 0.55),
}

# Pour les sites : les métiers où le client cherche sur Google avant d'appeler ou de venir.
CATEGORIES_WEB = {
    "Garages et carrosseries": ({"fr": "garage automobile", "en": "car repair", "es": "taller mecánico",
                                 "it": "officina auto", "de": "Autowerkstatt"}, 1.0),
    "Artisans du bâtiment (plombier, électricien…)": ({"fr": "plombier électricien", "en": "plumber electrician",
                                                       "es": "fontanero electricista", "de": "Klempner Elektriker"}, 1.0),
    "Restaurants": CATEGORIES_NFC["Restaurants"],
    "Coiffeurs": CATEGORIES_NFC["Coiffeurs"],
    "Instituts de beauté et ongles": CATEGORIES_NFC["Instituts de beauté et ongles"],
    "Boucheries, primeurs, épiceries fines": (CATEGORIES_NFC["Boucheries, primeurs, épiceries fines"][0], 0.85),
    "Boulangeries-pâtisseries": (CATEGORIES_NFC["Boulangeries-pâtisseries"][0], 0.8),
    "Fleuristes": (CATEGORIES_NFC["Fleuristes"][0], 0.85),
    "Hôtels et chambres d'hôtes": CATEGORIES_NFC["Hôtels et chambres d'hôtes"],
    "Kinés, ostéos, coachs": ({"fr": "ostéopathe kinésithérapeute", "en": "physiotherapist", "es": "fisioterapeuta",
                               "de": "Physiotherapie"}, 0.85),
}

CATEGORIES = {"nfc": CATEGORIES_NFC, "web": CATEGORIES_WEB}

# Un « site » qui n'est qu'une page de réseau social compte comme pas de site.
RESEAUX = ("facebook.com", "instagram.com", "linktr.ee", "tiktok.com", "business.site", "wa.me")


def mots_recherche(espace, categorie, langue="fr"):
    mots, _ = CATEGORIES[espace][categorie]
    return mots.get(langue) or mots["fr"]


def poids(espace, categorie):
    return CATEGORIES[espace].get(categorie, ({}, 0.7))[1]


def _points_avis(nb):
    if nb is None:
        return 30, "nombre d'avis inconnu"
    if nb == 0:
        return 34, "aucun avis : tout est à construire"
    if nb <= 30:
        return 40, f"très peu d'avis ({nb})"
    if nb <= 80:
        return 35, f"peu d'avis ({nb})"
    if nb <= 150:
        return 26, f"nombre d'avis moyen ({nb})"
    if nb <= 300:
        return 16, f"déjà pas mal d'avis ({nb})"
    if nb <= 600:
        return 8, f"beaucoup d'avis ({nb})"
    return 3, f"énormément d'avis ({nb})"


def _points_note(note):
    if note is None:
        return 15, "pas encore de note"
    if note < 3.0:
        return 8, f"note très basse ({note}) : prospect plus difficile"
    if note < 3.5:
        return 18, f"note basse ({note})"
    if note <= 4.2:
        return 30, f"note à améliorer ({note}) : cible idéale"
    if note <= 4.5:
        return 20, f"bonne note ({note}) mais améliorable"
    if note <= 4.7:
        return 12, f"très bonne note ({note})"
    return 6, f"note excellente ({note})"


def entreprise(commerce):
    """La vérification de l'entreprise enregistrée (dict) ou None si pas encore vérifiée."""
    try:
        return json.loads(commerce.get("entreprise") or "null")
    except (TypeError, ValueError):
        return None


def _effet_entreprise(commerce):
    """(points en plus ou en moins, raison, hors cible ?) selon la vérification de l'entreprise :
    on ne garde que les PME qui font au moins le chiffre d'affaires minimum."""
    e = entreprise(commerce)
    if not e:
        return 0, None, False
    v = e.get("verdict")
    if v == "exclu":
        return 0, f"hors cible : {e.get('raison')}", True
    if v == "ok":
        return 6, e.get("raison"), False
    if v == "probable":
        return 2, e.get("raison"), False
    return -12, f"chiffre d'affaires à vérifier ({e.get('raison')})", False


def _avec_entreprise(calcul):
    def score(commerce, poids_categorie=0.7):
        statut = commerce.get("statut_google")
        if statut and statut != "OPERATIONAL":
            return 0, ["fermé (temporairement ou définitivement)"]
        points, raison, exclu = _effet_entreprise(commerce)
        if exclu:
            return 0, [raison]
        total, raisons = calcul(commerce, poids_categorie)
        return max(0, min(100, total + points)), ([raison] if raison else []) + raisons
    score.__doc__ = calcul.__doc__
    return score


@_avec_entreprise
def calculer_score(commerce, poids_categorie=0.7):
    """Score « tags NFC ». Renvoie (score sur 100, liste de raisons lisibles)."""

    raisons = []
    p_avis, r = _points_avis(commerce.get("nb_avis"))
    raisons.append(r)
    p_note, r = _points_note(commerce.get("note"))
    raisons.append(r)

    p_cat = round(20 * poids_categorie)
    if poids_categorie >= 0.85:
        raisons.append("type de commerce très adapté au tag")

    p_contact = 0
    if commerce.get("telephone"):
        p_contact += 4
    if commerce.get("site_web"):
        p_contact += 3
    if commerce.get("email"):
        p_contact += 3
        raisons.append("email trouvé")
    if not commerce.get("telephone") and not commerce.get("site_web") and not commerce.get("email"):
        raisons.append("aucun moyen de contact en ligne : à contacter par téléphone")

    return min(100, p_avis + p_note + p_cat + p_contact), raisons


def etat_site(commerce):
    """Lit l'analyse du site enregistrée (dict) ou None si le site n'a pas été visité."""
    brut = commerce.get("site_etat")
    if not brut:
        return None
    try:
        return json.loads(brut)
    except (TypeError, ValueError):
        return None


def sans_vrai_site(site):
    return not site or any(r in site.lower() for r in RESEAUX)


@_avec_entreprise
def calculer_score_web(commerce, poids_categorie=0.7):
    """Score « sites internet ». Renvoie (score sur 100, liste de raisons lisibles)."""

    raisons = []
    site = commerce.get("site_web")
    p_site = 0
    if sans_vrai_site(site):
        p_site = 45
        raisons.append("aucun site internet" if not site else "seulement une page de réseau social, pas de vrai site")
    else:
        etat = etat_site(commerce)
        if etat is None:
            p_site = 12
            raisons.append("site pas encore analysé (clique sur « Analyser les sites »)")
        elif etat.get("plateforme"):
            p_site = 45
            raisons.append("seulement une page de plateforme (TheFork, Facebook…), pas de vrai site")
        elif etat.get("injoignable"):
            p_site = 40
            raisons.append("site qui ne s'ouvre pas")
        else:
            if not etat.get("https"):
                p_site += 14
                raisons.append("site non sécurisé (pas de https)")
            if not etat.get("mobile"):
                p_site += 14
                raisons.append("site pas adapté au téléphone")
            if etat.get("secondes", 0) > 3:
                p_site += 7
                raisons.append(f"site lent ({etat['secondes']:.0f} s)")
            annee = etat.get("annee")
            if annee and annee <= datetime.now().year - 3:
                p_site += 10
                raisons.append(f"site pas mis à jour depuis {annee}")
            if p_site == 0:
                raisons.append("site déjà correct : prospect difficile")

    note, nb = commerce.get("note"), commerce.get("nb_avis") or 0
    p_note = 20 if note and note >= 4.3 else 14 if note and note >= 4.0 else 6
    p_avis = 20 if nb >= 150 else 14 if nb >= 50 else 8 if nb >= 15 else 3
    if p_note + p_avis >= 34:
        raisons.append(f"bonne réputation ({note} et {nb} avis) : des clients qui le cherchent sur Google")

    p_cat = round(5 * poids_categorie)
    p_contact = (3 if commerce.get("telephone") else 0) + (2 if commerce.get("email") else 0)
    if commerce.get("email"):
        raisons.append("email trouvé")

    return min(100, p_site + p_note + p_avis + p_cat + p_contact), raisons


def score_pour(espace, commerce, poids_categorie=0.7):
    if espace == "web":
        return calculer_score_web(commerce, poids_categorie)
    return calculer_score(commerce, poids_categorie)


def niveau(score):
    if score >= 75:
        return "Priorité haute"
    if score >= 55:
        return "Priorité moyenne"
    return "Priorité basse"
