"""Vérification des entreprises avant de les prospecter : seulement des PME qui font au moins
200 000 € de chiffre d'affaires par an (réglable dans Réglages).

Source : l'API publique « Recherche d'entreprises » de l'État (recherche-entreprises.api.gouv.fr),
gratuite et sans clé. Elle donne, pour chaque entreprise française : sa catégorie INSEE (PME, ETI,
grande entreprise), son effectif salarié et le chiffre d'affaires de ses derniers comptes publiés.

Beaucoup de petites entreprises gardent leurs comptes confidentiels : on estime alors avec l'effectif
(à partir de 3 salariés, une entreprise fait presque toujours plus de 200 000 €), et on le dit.
Hors de France, la vérification n'est pas possible : la fiche l'indique.
"""
import re
import time
import unicodedata
from datetime import datetime
from difflib import SequenceMatcher

import requests

URL = "https://recherche-entreprises.api.gouv.fr/search"
LIEN_FICHE = "https://annuaire-entreprises.data.gouv.fr/entreprise/{siren}"
CA_MINIMUM = 200_000

# Tranches d'effectif INSEE : code -> (libellé, effectif minimum)
EFFECTIFS = {
    "NN": ("pas de salarié", 0), "00": ("0 salarié", 0), "01": ("1 ou 2 salariés", 1), "02": ("3 à 5 salariés", 3),
    "03": ("6 à 9 salariés", 6), "11": ("10 à 19 salariés", 10), "12": ("20 à 49 salariés", 20),
    "21": ("50 à 99 salariés", 50), "22": ("100 à 199 salariés", 100), "31": ("200 à 249 salariés", 200),
    "32": ("250 à 499 salariés", 250), "41": ("500 à 999 salariés", 500), "42": ("1 000 à 1 999 salariés", 1000),
    "51": ("2 000 à 4 999 salariés", 2000), "52": ("5 000 à 9 999 salariés", 5000), "53": ("10 000 salariés et plus", 10000),
}
# Mots trop courants pour reconnaître une entreprise par son nom.
MOTS_VIDES = {"le", "la", "les", "de", "du", "des", "et", "l", "d", "au", "aux", "chez", "sarl", "sas", "sasu", "eurl",
              "sa", "snc", "ets", "etablissements", "societe", "the", "and"}

# Verdicts : « ok » (PME vérifiée ≥ minimum), « probable » (PME, CA non publié mais effectif suffisant),
# « inconnu » (impossible de vérifier), « exclu » (hors cible : trop petite ou trop grande).
LIBELLES = {"ok": "PME vérifiée", "probable": "PME probable", "inconnu": "À vérifier", "exclu": "Hors cible"}


def _normaliser(texte):
    t = unicodedata.normalize("NFKD", texte or "").encode("ascii", "ignore").decode().lower()
    return " ".join(m for m in re.findall(r"[a-z0-9]+", t) if m not in MOTS_VIDES)


def ressemblance(a, b):
    """0 à 1 : à quel point deux noms d'entreprise se ressemblent."""
    a, b = _normaliser(a), _normaliser(b)
    if not a or not b:
        return 0.0
    if a in b or b in a:
        return 0.95
    mots_a, mots_b = set(a.split()), set(b.split())
    commun = len(mots_a & mots_b) / max(1, min(len(mots_a), len(mots_b)))
    return max(SequenceMatcher(None, a, b).ratio(), commun * 0.9)


def code_postal(adresse):
    m = re.findall(r"\b(\d{5})\b", adresse or "")
    return m[-1] if m else None


def _noms(resultat):
    """Tous les noms sous lesquels l'entreprise est connue : raison sociale, enseignes, nom commercial."""
    noms = [resultat.get("nom_complet"), resultat.get("nom_raison_sociale")]
    for e in (resultat.get("matching_etablissements") or []) + [resultat.get("siege") or {}]:
        noms += [e.get("nom_commercial")] + list(e.get("liste_enseignes") or [])
    return [n for n in noms if n]


def _chercher(params, session):
    params = {k: v for k, v in params.items() if v}
    for essai in range(4):
        try:
            rep = session.get(URL, params={**params, "per_page": 10, "etat_administratif": "A"}, timeout=20)
        except (requests.ConnectionError, requests.Timeout):
            if essai == 3:
                raise
            time.sleep(1 + essai * 2)  # coupure passagère : on réessaie
            continue
        if rep.status_code == 429 or rep.status_code >= 500:  # trop de demandes d'un coup : on patiente
            time.sleep(2 + essai * 2)
            continue
        rep.raise_for_status()
        return rep.json().get("results") or []
    return []


def meme_adresse(adresse_google, adresse_annuaire):
    """Même numéro et même rue (au moins un mot de la rue en commun)."""
    a, b = _normaliser(adresse_google), _normaliser(adresse_annuaire)
    num_a, num_b = re.match(r"(\d+)", a), re.match(r"(\d+)", b)
    if not num_a or not num_b or num_a.group(1) != num_b.group(1):
        return False
    rue_a = set(a.split(",")[0].split()[1:4]) - {"rue", "avenue", "av", "bd", "boulevard", "place", "cours", "chemin", "route", "allee"}
    return bool(rue_a & set(b.split()))


def trouver(nom, adresse, siren=None, session=None):
    """Retrouve l'entreprise d'un commerce Google. Renvoie (résultat de l'API, confiance 0 à 1) ou (None, 0)."""
    session = session or requests.Session()
    if siren:
        res = _chercher({"q": re.sub(r"\D", "", siren)}, session)
        return (res[0], 1.0) if res else (None, 0)
    cp = code_postal(adresse)
    rue = (adresse or "").split(",")[0]
    # 1. Même nom dans le même code postal. 2. Sinon, plus large, mais il faut alors la même adresse
    # ou un nom quasi identique, et le rapprochement reste « à confirmer » (confiance plafonnée).
    essais = [({"q": nom, "code_postal": cp}, True)] if cp else []
    essais += [({"q": f"{nom} {rue}", "code_postal": cp}, True)] if cp else []
    essais += [({"q": nom, "departement": (cp[:3] if cp.startswith("97") else cp[:2]) if cp else None}, False)]
    for params, local in essais:
        meilleur, confiance = None, 0.0
        for r in _chercher(params, session):
            nom_ok = max((ressemblance(nom, n) for n in _noms(r)), default=0)
            adresse_ok = any(meme_adresse(rue, e.get("adresse")) for e in r.get("matching_etablissements") or [])
            if local:
                score = nom_ok + (0.15 if adresse_ok else 0)
            elif adresse_ok or nom_ok >= 0.95:
                score = min(0.7, nom_ok)
            else:
                continue
            if score > confiance:
                meilleur, confiance = r, score
        if meilleur and confiance >= 0.6:
            return meilleur, min(1.0, confiance)
        time.sleep(0.2)
    return None, 0


def dernier_ca(finances):
    """(chiffre d'affaires, année) des derniers comptes publiés avec un CA, ou (None, None).
    Un CA à 0 veut dire « comptes confidentiels », pas « aucune vente »."""
    for annee in sorted((finances or {}).keys(), reverse=True):
        ca = (finances[annee] or {}).get("ca")
        if ca:
            return int(ca), int(annee)
    return None, None


def euros(montant):
    if montant is None:
        return "non publié"
    if montant >= 1_000_000:
        return f"{montant / 1_000_000:.1f} M€".replace(".", ",")
    return f"{round(montant / 1000):d} k€"


def verdict(resultat, confiance, ca_minimum=CA_MINIMUM):
    """Transforme la fiche de l'annuaire en verdict lisible pour le logiciel."""
    if not resultat:
        return {"verdict": "inconnu", "raison": "entreprise introuvable dans l'annuaire : vérifie à la main"}
    categorie = resultat.get("categorie_entreprise")
    tranche = resultat.get("tranche_effectif_salarie") or "NN"
    effectif_txt, effectif_min = EFFECTIFS.get(tranche, ("effectif inconnu", 0))
    ca, annee = dernier_ca(resultat.get("finances"))
    infos = {
        "siren": resultat.get("siren"), "nom": resultat.get("nom_complet"), "categorie": categorie,
        "effectif": effectif_txt, "ca": ca, "annee_ca": annee, "confiance": round(confiance, 2),
        "lien": LIEN_FICHE.format(siren=resultat.get("siren")),
        "verifie_le": datetime.now().isoformat(timespec="seconds"),
    }
    seuil = euros(ca_minimum)
    if confiance < 0.8:
        infos["a_confirmer"] = True  # rapprochement incertain : la fiche invite à vérifier
    if categorie in ("ETI", "GE") or effectif_min >= 250:
        return {**infos, "verdict": "exclu", "raison": f"{'grande entreprise' if categorie == 'GE' else 'ETI'}, pas une PME"
                if categorie in ("ETI", "GE") else "250 salariés ou plus : pas une PME"}
    if ca is not None:
        if ca >= ca_minimum:
            return {**infos, "verdict": "ok", "raison": f"PME, chiffre d'affaires {euros(ca)} ({annee})"}
        return {**infos, "verdict": "exclu", "raison": f"chiffre d'affaires {euros(ca)} ({annee}), sous les {seuil}"}
    if effectif_min >= 3:
        return {**infos, "verdict": "probable",
                "raison": f"PME, comptes non publiés mais {effectif_txt} : sans doute plus de {seuil}"}
    if resultat.get("est_entrepreneur_individuel") or resultat.get("nature_juridique") == "1000":
        return {**infos, "verdict": "exclu", "raison": f"entrepreneur individuel sans salarié : sans doute sous les {seuil}"}
    return {**infos, "verdict": "inconnu", "raison": f"comptes non publiés et {effectif_txt} : vérifie le chiffre d'affaires"}


def verifier(commerce, ca_minimum=CA_MINIMUM, session=None):
    """Point d'entrée : renvoie le dict à enregistrer dans la fiche (colonne « entreprise »)."""
    if (commerce.get("pays") or "FR") != "FR":
        return {"verdict": "inconnu", "raison": "vérification possible seulement pour les entreprises françaises",
                "verifie_le": datetime.now().isoformat(timespec="seconds")}
    try:
        resultat, confiance = trouver(commerce.get("nom"), commerce.get("adresse"), commerce.get("siren_force"), session)
    except requests.RequestException as e:
        return {"verdict": "inconnu", "raison": f"annuaire des entreprises injoignable ({type(e).__name__}) : réessaie plus tard",
                "erreur": True, "verifie_le": datetime.now().isoformat(timespec="seconds")}
    return verdict(resultat, confiance, ca_minimum)
