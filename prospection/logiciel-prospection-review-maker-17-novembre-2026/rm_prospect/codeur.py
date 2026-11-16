"""Demandes de sites publiées sur Codeur.com : les plus récentes, triées pour ne garder que les nôtres.

Source : les flux RSS publics de Codeur.com (faits pour suivre les nouveaux projets, autorisés par
son robots.txt). On lit le flux général et le flux « Développement », 2 à 3 pages chacun : environ
une semaine de projets, en 5 requêtes. La page d'un projet (description complète, nombre d'offres)
n'est lue que quand tu l'ouvres dans le logiciel.

On ne répond jamais à ta place : il faut ton compte Codeur.com. Le logiciel prépare la proposition,
tu la colles sur Codeur.com.
"""
import html as html_lib
import re
import time
import unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import requests

FLUX = [
    "https://www.codeur.com/projects.rss",
    "https://www.codeur.com/projects.rss?page=2",
    "https://www.codeur.com/projects.rss?page=3",
    "https://www.codeur.com/projects/c/developpement.rss",
    "https://www.codeur.com/projects/c/developpement.rss?page=2",
]
EN_TETES = {"User-Agent": "Mozilla/5.0 (compatible; logiciel de prospection; lecteur RSS)",
            "Accept": "application/rss+xml, application/xml, text/html;q=0.8"}
JOURS_GARDES = 30
STATUTS = ["Nouveau", "À répondre", "Répondu", "Retenu", "Perdu", "Pas pour nous"]

# Ce qui ressemble à une demande de site (points de pertinence), et ce qui n'en est pas une.
MOTS_SITE = {
    "creation de site": 30, "creation d un site": 30, "site internet": 25, "site web": 25, "site vitrine": 30,
    "refonte": 28, "refaire mon site": 28, "nouveau site": 25, "landing page": 22, "page de vente": 18, "one page": 18,
    "wordpress": 22, "elementor": 18, "wix": 22, "webflow": 20, "squarespace": 20, "shopify": 20, "prestashop": 16,
    "woocommerce": 20, "e commerce": 18, "ecommerce": 18, "boutique en ligne": 20, "site marchand": 18,
    "mettre en ligne": 12, "mise en ligne": 12, "maquette": 8, "responsive": 10, "referencement": 8, "seo": 8,
}
CATEGORIES_SITE = {
    "creation de site internet": 30, "site e commerce": 22, "migration ou refonte de site": 30, "wordpress": 22,
    "web design": 16, "gestion site web": 14, "prestashop": 14, "shopify": 18, "wix": 20, "landing page": 20,
    "integration web": 14, "referencement": 6, "seo geo": 6,
}
MOTS_HORS_SUJET = {
    "application mobile": -30, "android": -20, "ios": -15, "saas": -20, "jeu video": -35, "unity": -30,
    "illustrat": -30, "logo": -18, "video": -20, "montage": -20, "traduction": -30, "redaction": -15,
    "scraping": -25, "python": -15, "data": -12, "crm": -15, "erp": -20, "chatbot": -15, "automatisation": -15,
    "zapier": -15, "blockchain": -30, "community management": -20, "print": -20, "flyer": -25, "3d": -25,
    "formation": -15, "comptab": -25, "excel": -20,
}
TYPES = [  # (type, mots) : le premier qui correspond donne le ton de la proposition
    ("refonte", ("refonte", "refaire", "moderniser", "migration", "ameliorer mon site", "relooker")),
    ("e-commerce", ("e commerce", "ecommerce", "boutique en ligne", "shopify", "woocommerce", "prestashop", "site marchand")),
    ("landing", ("landing page", "page de vente", "one page", "page unique")),
    ("wordpress", ("wordpress", "elementor", "wix", "webflow", "squarespace")),
    ("creation", ("creation", "site vitrine", "nouveau site", "site internet", "site web")),
]
URL_RE = re.compile(r"https?://[^\s<>\"')]+|(?:www\.)[a-z0-9-]+\.[a-z.]{2,}[^\s<>\"')]*"
                    r"|(?<![@\w.-])[a-z0-9][a-z0-9-]*\.(?:fr|com|net|org|eu|be|ch|lu|ca|io|co|shop|store|bio|paris|bzh|art|info)\b(?:/[^\s<>\"')]*)?", re.I)
SITES_IGNORES = ("codeur.com", "google.", "facebook.com", "instagram.com", "youtube.com", "linkedin.com", "canva.com",
                 "figma.com", "drive.google", "dropbox.com", "wetransfer")


def _norm(texte):
    t = unicodedata.normalize("NFKD", texte or "").encode("ascii", "ignore").decode().lower()
    return " " + " ".join(re.findall(r"[a-z0-9]+", t)) + " "


def _texte(html):
    t = re.sub(r"<br\s*/?>|</p>|</li>", "\n", html or "", flags=re.I)
    t = html_lib.unescape(re.sub(r"""<(?:"[^"]*"|'[^']*'|[^'">])*>""", " ", t))  # balises, même avec « > » dans un attribut
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n\n", t)).strip()


def lire_flux(contenu):
    """Projets d'un flux RSS : [{id, titre, lien, date (UTC, ISO), budget, categories, extrait}]."""
    projets = []
    for it in ET.fromstring(contenu).findall("./channel/item"):
        brut = it.findtext("description") or ""
        m = re.search(r"Budget\s*:\s*(.*?)\s*-\s*Catégories\s*:\s*(.*?)</p>", brut, re.S)
        corps = re.sub(r"^.*?</p>", "", brut, count=1, flags=re.S) if m else brut
        corps = re.sub(r"<a [^>]*>Voir ce projet sur Codeur</a>", "", corps)
        try:
            date = parsedate_to_datetime(it.findtext("pubDate")).astimezone(timezone.utc)
        except (TypeError, ValueError):
            continue
        projets.append({
            "id": (it.findtext("guid") or "").strip(), "titre": html_lib.unescape(it.findtext("title") or "").strip(),
            "lien": (it.findtext("link") or "").strip(), "date": date.isoformat(timespec="seconds"),
            "budget": html_lib.unescape(m.group(1)).strip() if m else "",
            "categories": html_lib.unescape(m.group(2)).strip() if m else "",
            "extrait": _texte(corps).rstrip(" …").strip(),
        })
    return [p for p in projets if p["id"] and p["lien"]]


def recuperer(session=None, pause=1.0):
    """Lit tous les flux (poliment, une seconde entre deux) et renvoie les projets récents, sans doublon."""
    session = session or requests.Session()
    vus, projets, erreurs = set(), [], []
    limite = datetime.now(timezone.utc) - timedelta(days=JOURS_GARDES)
    for i, url in enumerate(FLUX):
        if i:
            time.sleep(pause)
        try:
            rep = session.get(url, headers=EN_TETES, timeout=20)
            rep.raise_for_status()
            for p in lire_flux(rep.content):
                if p["id"] not in vus and datetime.fromisoformat(p["date"]) >= limite:
                    vus.add(p["id"])
                    projets.append(p)
        except (requests.RequestException, ET.ParseError) as e:
            erreurs.append(f"{url.split('codeur.com')[-1]} : {type(e).__name__}")
    if erreurs and not projets:
        raise ConnectionError("Codeur.com ne répond pas (" + ", ".join(erreurs[:2]) + "). Réessaie plus tard.")
    return projets


def pertinence(p):
    """(score sur 100, type, raisons) : à quel point la demande correspond à notre offre (sites)."""
    texte = _norm(f"{p.get('titre')} {p.get('extrait')} {p.get('description') or ''}")
    cats = [_norm(c) for c in re.split(r",\s*", p.get("categories") or "")]
    points, raisons = 0, []
    trouves = [m for m in MOTS_SITE if f" {m} " in texte]
    points += min(45, sum(MOTS_SITE[m] for m in trouves))
    cats_site = [c.strip() for c in cats if c.strip() in CATEGORIES_SITE]
    points += min(35, sum(CATEGORIES_SITE[c] for c in cats_site))
    hors = [m for m in MOTS_HORS_SUJET if f" {m}" in texte]
    if hors and not cats_site:
        points += sum(MOTS_HORS_SUJET[m] for m in hors)
    if trouves or cats_site:
        raisons.append("demande de site" if any(m in trouves for m in ("creation de site", "site vitrine", "nouveau site",
                                                                         "creation d un site")) else "site internet")
    b = budget_min(p.get("budget"))
    if b is not None:
        points += 20 if b >= 1000 else 12 if b >= 500 else 4
        raisons.append(f"budget {p.get('budget')}")
    type_ = next((t for t, mots in TYPES if any(f" {m}" in texte for m in mots)), "site")
    return max(0, min(100, points)), type_, raisons


def budget_min(budget):
    """Montant minimum du budget indiqué (« 500 € à 1 000 € » -> 500), ou None."""
    b = (budget or "").replace(" ", " ").replace("\xa0", " ")
    if not b:
        return None
    if b.lower().startswith("moins"):
        return 0
    m = re.search(r"(\d[\d ]*)", b)
    return int(m.group(1).replace(" ", "")) if m else None


def detail(lien, session=None):
    """Lit la page du projet : description complète, nombre d'offres et de vues, site mentionné."""
    session = session or requests.Session()
    rep = session.get(lien, headers=EN_TETES, timeout=20)
    rep.raise_for_status()
    page = rep.text
    m = re.search(r'class="project-description[^"]*">(.*?)</div>\s*</div>\s*</div>', page, re.S)
    if not m:
        m = re.search(r'class="project-description[^"]*">(.*?)(?:Budget indicatif|<footer)', page, re.S)
    description = _texte(m.group(1)).replace("\u200b", "").strip() if m else ""
    offres = re.search(r"(\d[\d\s]*)\s*offres?\b", page)
    vues = re.search(r"(\d[\d\s]*)\s*vues?\b", page)
    return {
        "description": description[:6000],
        "offres": int(re.sub(r"\D", "", offres.group(1))) if offres else None,
        "vues": int(re.sub(r"\D", "", vues.group(1))) if vues else None,
        "site": site_mentionne(description),
    }


def site_mentionne(texte):
    """Le site actuel du client s'il le cite dans sa demande (pour l'analyser), sinon None."""
    for url in URL_RE.findall((texte or "").replace("\u200b", "")):
        url = url.rstrip(".,;:!?")
        if not any(s in url.lower() for s in SITES_IGNORES):
            return url if url.lower().startswith("http") else "https://" + url
    return None


INTROS = {
    "refonte": "je refais des sites internet pour les rendre modernes, rapides et bien adaptés au téléphone",
    "e-commerce": "je crée des boutiques en ligne simples à gérer, avec paiement sécurisé et pages produits soignées",
    "landing": "je crée des pages de vente et des landing pages pensées pour convertir les visiteurs en clients",
    "wordpress": "je crée et j'améliore des sites WordPress (et Wix, Webflow…) modernes et faciles à modifier vous-même",
    "creation": "je crée des sites internet modernes, pensés pour le téléphone et bien placés sur Google",
    "site": "je crée des sites internet modernes, pensés pour le téléphone et bien placés sur Google",
}


def proposition(p, signature="", prix="", delai="", points_site=""):
    """Texte de réponse prêt à coller sur Codeur.com, à relire et compléter (les [crochets])."""
    prix = prix if prix and "[" not in prix else ""
    delai = delai if delai and "[" not in delai else ""
    lignes = [
        "Bonjour,",
        "",
        f"Votre projet « {p.get('titre')} » correspond exactement à ce que je fais : {INTROS.get(p.get('type') or 'site')}.",
    ]
    if points_site:
        lignes += ["", "J'ai regardé votre site actuel et j'ai déjà relevé quelques points à corriger :", points_site,
                   "Je vous envoie volontiers l'audit complet, offert."]
    lignes += [
        "",
        "Ce que je vous propose :",
        "- une maquette de la page d'accueil avant de commencer, pour valider le style ensemble ;",
        "- un site rapide, adapté au téléphone, avec les bases du référencement Google ;",
        "- la mise en ligne et une prise en main simple, pour que vous soyez autonome.",
        "",
        "Pour votre besoin précis : [une phrase sur leur demande].",
    ]
    if prix or delai:
        lignes += ["", " · ".join(x for x in [f"Tarif : {prix}" if prix else "", f"délai : {delai}" if delai else ""] if x) + "."]
    lignes += ["", "Je peux vous montrer des exemples de sites réalisés. Échangeons 10 minutes pour préciser votre projet ?"]
    if signature:
        lignes += ["", signature]
    return "\n".join(lignes)
