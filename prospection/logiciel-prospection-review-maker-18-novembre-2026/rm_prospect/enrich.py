"""Enrichissement : trouve l'email de contact et le compte Instagram sur le site du commerce,
et analyse l'état du site (sécurisé, adapté au téléphone, rapide, récent, titre Google, bouton
d'appel, mentions légales…) pour l'espace « Sites » et l'audit.

On lit seulement quelques pages publiques (accueil, contact, mentions légales), lentement.
"""
import html as html_lib
import re
import time
from datetime import datetime
from urllib.parse import unquote, urljoin, urlparse

import requests

from .audit import signaux

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
INSTA_RE = re.compile(r"https?://(?:www\.)?instagram\.com/([A-Za-z0-9_.]+)/?", re.I)
LIEN_RE = re.compile(r"""href=["']([^"'#]+)["']""", re.I)

EXCLUS = ("example.", "sentry", "wixpress", "domain.", "votre", "email@", "nom@",
          "@2x", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", "godaddy", "shopify")
INSTA_EXCLUS = {"p", "reel", "reels", "explore", "accounts", "stories", "tv", "sharer"}
VIEWPORT_RE = re.compile(r"<meta[^>]+name=[\"']viewport[\"']", re.I)
ANNEE_RE = re.compile(r"(?:©|&copy;|copyright)[^<]{0,40}?((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?", re.I)
# En-têtes d'un vrai navigateur : beaucoup d'hébergeurs bloquent les robots qui se présentent autrement.
EN_TETES = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}
CF_RE = re.compile(r"""(?:data-cfemail=["']|/cdn-cgi/l/email-protection#)([0-9a-fA-F]{6,})""")
MAILTO_RE = re.compile(r"""mailto:([^"'?>\s]+)""", re.I)
# Pages où les commerces mettent souvent leur email, même quand l'accueil n'y renvoie pas.
PAGES_HABITUELLES = ("contact", "nous-contacter", "contactez-nous", "mentions-legales")
# Sites qui ne sont pas ceux du commerce : on n'y trouvera pas d'email.
PLATEFORMES = ("facebook.com", "instagram.com", "linktr.ee", "thefork", "lafourchette", "tripadvisor",
               "ubereats", "deliveroo", "just-eat", "planity", "treatwell", "google.com", "pagesjaunes")


def _get(url, timeout=12):
    """Télécharge une page ; si le https échoue (certificat cassé, fréquent), réessaie en http."""
    try:
        return requests.get(url, headers=EN_TETES, timeout=timeout)
    except requests.exceptions.SSLError:
        if url.lower().startswith("https://"):
            return requests.get("http://" + url[8:], headers=EN_TETES, timeout=timeout)
        raise


def _est_html(rep):
    return "html" in rep.headers.get("Content-Type", "text/html").lower()


def _telecharger(url):
    try:
        rep = _get(url)
        if rep.ok and _est_html(rep):
            return rep.text
    except requests.RequestException:
        pass
    return ""


def analyser_accueil(site):
    """Renvoie (html, etat, url_finale) : etat = {https, mobile, secondes, annee} ou {injoignable: True}."""
    try:
        debut = time.monotonic()
        rep = _get(site, timeout=15)
        secondes = time.monotonic() - debut
    except requests.RequestException:
        return "", {"injoignable": True}, site
    if not rep.ok:
        return "", {"injoignable": True}, site
    html = rep.text if _est_html(rep) else ""
    return html, {
        "https": rep.url.lower().startswith("https://"),
        "mobile": bool(VIEWPORT_RE.search(html)),
        "secondes": round(secondes, 1),
        "annee": extraire_annee(html),
        **signaux(html),  # titre Google, description, bouton d'appel, mentions légales… (voir audit.py)
    }, rep.url


def extraire_annee(html):
    """Année la plus récente du « © 2019 » en bas de page, ou None."""
    annees = []
    for debut, fin in ANNEE_RE.findall(html):
        annees.append(int(fin or debut))
    annees = [a for a in annees if a <= datetime.now().year]
    return max(annees) if annees else None


def _decoder_cloudflare(code):
    """Cloudflare cache les emails (« [email protected] ») : on les décode."""
    try:
        cle = int(code[:2], 16)
        return "".join(chr(int(code[i:i + 2], 16) ^ cle) for i in range(2, len(code), 2))
    except ValueError:
        return ""


def _demasquer(html):
    """Remet les @ et les points cachés : &#64;, %40, \\u0040, [at], (arobase), [dot]…"""
    t = html_lib.unescape(html).replace("\\u0040", "@").replace("%40", "@")
    t = re.sub(r"\s*[\[\(\{]\s*(?:at|arobase|chez)\s*[\]\)\}]\s*", "@", t, flags=re.I)
    t = re.sub(r"\s*[\[\(\{]\s*(?:dot|point)\s*[\]\)\}]\s*", ".", t, flags=re.I)
    return t


def extraire_emails(html):
    trouves = set()
    candidats = [_decoder_cloudflare(c) for c in CF_RE.findall(html)]
    candidats += [unquote(m) for m in MAILTO_RE.findall(html)]
    candidats += EMAIL_RE.findall(_demasquer(html))
    for e in candidats:
        m = EMAIL_RE.search(e)
        if not m:
            continue
        e = m.group(0).strip(".").lower()
        if not any(x in e for x in EXCLUS):
            trouves.add(e)
    return trouves


def extraire_instagram(html):
    for compte in INSTA_RE.findall(html):
        if compte.lower() not in INSTA_EXCLUS:
            return f"https://www.instagram.com/{compte}"
    return None


def meilleur_email(emails, site):
    """Préfère une adresse du même domaine que le site, puis contact@ / info@ / bonjour@."""
    if not emails:
        return None
    domaine = _domaine(site) if site else ""

    def rang(e):
        local, _, dom = e.partition("@")
        return (0 if domaine and dom.endswith(domaine) else 1,
                0 if local in ("contact", "info", "bonjour", "hello", "reservation") else 1,
                len(e))
    return sorted(emails, key=rang)[0]


def _domaine(url):
    return urlparse(url).netloc.lower().split(":")[0].removeprefix("www.")


def enrichir_site(site, pause=1.0):
    """Renvoie {'email', 'instagram', 'site_etat'} à partir du site web d'un commerce."""
    if not site:
        return {"email": None, "instagram": None, "site_etat": None}
    if not site.lower().startswith(("http://", "https://")):
        site = "https://" + site
    if any(p in _domaine(site) for p in PLATEFORMES):
        # Google donne parfois une page Facebook, Instagram ou TheFork au lieu d'un vrai site.
        return {"email": None, "instagram": extraire_instagram(site), "site_etat": {"plateforme": True}}
    accueil, etat, finale = analyser_accueil(site)
    if etat.get("injoignable"):
        return {"email": None, "instagram": None, "site_etat": etat}
    pages = [accueil]
    emails = extraire_emails(accueil)
    liens = []
    # Les liens sont comparés à l'adresse finale (après redirection, avec ou sans « www »).
    for href in LIEN_RE.findall(accueil):
        h = href.lower()
        if h.startswith(("mailto:", "tel:", "javascript:")):
            continue
        if any(m in h for m in ("contact", "mention", "legal", "a-propos", "about", "infos", "reserv")):
            url = urljoin(finale, href)
            if _domaine(url) == _domaine(finale) and url not in liens:
                liens.append(url)
    for chemin in PAGES_HABITUELLES:
        url = urljoin(finale, "/" + chemin)
        if url not in liens:
            liens.append(url)
    for url in liens[:6]:
        if emails and any(_domaine(finale) in e for e in emails):
            break  # on a déjà l'adresse du commerce
        time.sleep(pause)
        page = _telecharger(url)
        pages.append(page)
        emails |= extraire_emails(page)
    tout = "\n".join(pages)
    return {"email": meilleur_email(emails, finale), "instagram": extraire_instagram(tout),
            "site_etat": etat}
