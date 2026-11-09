"""Recherche de commerces avec l'API officielle Google Places (API « New », Text Search).

Pas de scraping de Google Maps : c'est interdit par les CGU de Google et vite bloqué.
"""
import requests

from . import db, pays
from .scoring import mots_recherche, poids, score_pour

URL = "https://places.googleapis.com/v1/places:searchText"

# On ne demande que les champs utiles : Google facture selon les champs demandés.
FIELD_MASK = ",".join([
    "places.id", "places.displayName", "places.formattedAddress",
    "places.nationalPhoneNumber", "places.websiteUri", "places.rating",
    "places.userRatingCount", "places.primaryTypeDisplayName", "places.location",
    "places.businessStatus", "places.googleMapsUri", "nextPageToken",
])


class QuotaAtteint(Exception):
    pass


class ErreurGoogle(Exception):
    pass


def _convertir(place):
    loc = place.get("location") or {}
    return {
        "place_id": place["id"],
        "nom": (place.get("displayName") or {}).get("text", ""),
        "adresse": place.get("formattedAddress"),
        "telephone": place.get("nationalPhoneNumber"),
        "site_web": place.get("websiteUri"),
        "note": place.get("rating"),
        "nb_avis": place.get("userRatingCount", 0),
        "type_google": (place.get("primaryTypeDisplayName") or {}).get("text"),
        "lat": loc.get("latitude"),
        "lng": loc.get("longitude"),
        "lien_maps": place.get("googleMapsUri"),
        "statut_google": place.get("businessStatus"),
    }


def rechercher(conn, cle_api, espace, categorie, ville, code_pays="FR", max_pages=3, limite_mensuelle=900):
    """Cherche « mots à ville » dans un pays, enregistre les commerces dans l'espace choisi
    et renvoie (nouveaux, mis_a_jour, requetes)."""
    langue = pays.langue(code_pays)
    texte = pays.requete(mots_recherche(espace, categorie, langue), ville, code_pays)
    poids_categorie = poids(espace, categorie)
    nouveaux = maj = requetes = 0
    page_token = None
    for _ in range(max_pages):
        if db.requetes_du_mois(conn) >= limite_mensuelle:
            raise QuotaAtteint(f"Limite mensuelle de {limite_mensuelle} requêtes atteinte.")
        corps = {"textQuery": texte, "languageCode": langue, "regionCode": code_pays, "pageSize": 20}
        if page_token:
            corps["pageToken"] = page_token
        rep = requests.post(URL, json=corps, timeout=30, headers={
            "X-Goog-Api-Key": cle_api, "X-Goog-FieldMask": FIELD_MASK})
        db.compter_requete(conn)
        requetes += 1
        if rep.status_code != 200:
            try:
                message = rep.json()["error"]["message"]
            except Exception:
                message = rep.text[:300]
            raise ErreurGoogle(f"Google a répondu {rep.status_code} : {message}")
        data = rep.json()
        for place in data.get("places", []):
            c = _convertir(place)
            ancien = conn.execute("SELECT email, site_etat FROM commerces WHERE cle=?",
                                  (db.cle_de(espace, c["place_id"]),)).fetchone()
            c["email"] = ancien["email"] if ancien else None
            c["site_etat"] = ancien["site_etat"] if ancien else None
            score, raisons = score_pour(espace, c, poids_categorie)
            c.update(espace=espace, score=score, raisons=" ; ".join(raisons), ville_recherche=ville,
                     pays=code_pays, categorie=categorie, google_maj=db.maintenant())
            if db.enregistrer_commerce(conn, c):
                nouveaux += 1
            else:
                maj += 1
        conn.commit()
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return nouveaux, maj, requetes
