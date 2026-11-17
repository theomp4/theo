"""Analyse de base du site d'un commerce et audit en PDF.

1. `signaux(html)` : ce qu'on lit sur la page d'accueil (titre Google, description, bouton d'appel,
   mentions légales, horaires…). Enregistré avec le reste de l'analyse dans `site_etat`.
2. `constats(commerce)` : la liste des problèmes, du plus grave au moins grave, avec pour chacun
   une explication simple (pourquoi ça fait perdre des clients) et la correction.
3. `points_message(commerce)` : les 2 ou 3 problèmes principaux, en une phrase chacun, pour le
   message de prospection.
4. `pdf(commerce, …)` : le document d'audit à joindre au message.

L'analyse ne regarde que la page d'accueil : le document le dit, honnêtement.
"""
import io
import re
from datetime import datetime

from .scoring import etat_site, sans_vrai_site

TITRE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
META_RE = re.compile(r"<meta\b[^>]*>", re.I)
ATTR_RE = re.compile(r"""([a-zA-Z:-]+)\s*=\s*(["'])(.*?)\2""", re.S)
H1_RE = re.compile(r"<h1[\s>]", re.I)
TEL_RE = re.compile(r"""href\s*=\s*["']\s*tel:""", re.I)
MENTIONS_RE = re.compile(r"mentions?[\s_-]*l[ée]gales?|legal|cgu|conditions[\s_-]*g[ée]n[ée]rales|impressum", re.I)
HORAIRES_RE = re.compile(r"horaires?|ouvert|lundi|mardi|mercredi|jeudi|vendredi|samedi|opening hours|\b\d{1,2}\s?h\s?\d{0,2}\s?[-–à]\s?\d{1,2}\s?h", re.I)
CARTE_RE = re.compile(r"google\.[a-z.]+/maps|maps\.google|maps\.app\.goo\.gl|openstreetmap|mapbox|leaflet", re.I)
JSONLD_RE = re.compile(r"application/ld\+json|schema\.org/(?:LocalBusiness|Restaurant|Store|AutoRepair|HairSalon|BeautySalon|Bakery|Hotel|Organization)", re.I)
IMG_RE = re.compile(r"<img\b[^>]*>", re.I)
GENERIQUES = {"accueil", "home", "homepage", "page d'accueil", "bienvenue", "index", "site", "untitled", "welcome"}


def _metas(html):
    for balise in META_RE.findall(html):
        yield {k.lower(): v for k, _, v in ATTR_RE.findall(balise)}


def signaux(html):
    """Ce qu'on peut vérifier sur la page d'accueil, sans rien télécharger d'autre."""
    titre = TITRE_RE.search(html or "")
    titre = re.sub(r"\s+", " ", titre.group(1)).strip() if titre else ""
    description, image_partage = "", False
    for m in _metas(html or ""):
        nom = (m.get("name") or m.get("property") or "").lower()
        if nom == "description":
            description = (m.get("content") or "").strip()
        if nom in ("og:image", "twitter:image") and m.get("content"):
            image_partage = True
    images = IMG_RE.findall(html or "")
    sans_alt = sum(1 for i in images if not re.search(r"""\balt\s*=\s*["'][^"']+["']""", i, re.I))
    texte = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html or "", flags=re.S | re.I)
    return {
        "titre": titre[:160], "description": description[:300], "h1": bool(H1_RE.search(html or "")),
        "tel": bool(TEL_RE.search(html or "")), "mentions": bool(MENTIONS_RE.search(html or "")),
        "horaires": bool(HORAIRES_RE.search(re.sub(r"<[^>]+>", " ", texte))),
        "carte": bool(CARTE_RE.search(html or "")), "partage": image_partage,
        "donnees_google": bool(JSONLD_RE.search(html or "")),
        "images": len(images), "images_sans_alt": sans_alt, "poids_ko": round(len((html or "").encode()) / 1024),
        "analyse": 2,  # version de l'analyse : 2 = avec ces signaux
    }


# --- Les constats ------------------------------------------------------------------
# gravité : 1 = urgent, 2 = important, 3 = à améliorer
GRAVITES = {1: "Urgent", 2: "Important", 3: "À améliorer"}


def _c(cle, gravite, titre, pourquoi, conseil, court_fr, court_en):
    return {"cle": cle, "gravite": gravite, "niveau": GRAVITES[gravite], "titre": titre, "pourquoi": pourquoi,
            "conseil": conseil, "court": {"fr": court_fr, "en": court_en}}


def constats(commerce):
    """Problèmes du site, du plus grave au moins grave. Liste vide si le site est correct ou pas analysé."""
    site = commerce.get("site_web")
    if not site or sans_vrai_site(site):
        return [_c("pas_de_site", 1, "Pas de site internet" if not site else "Seulement une page de réseau social",
                   "Les clients qui vous cherchent sur Google trouvent d'abord les concurrents qui ont un site : "
                   "horaires, photos, avis, prix. Une page Facebook ou Instagram ne remplace pas un site.",
                   "Un site simple à votre nom : horaires, photos, avis Google, plan d'accès et un bouton pour appeler.",
                   "je n'ai pas trouvé de site internet à votre nom" if not site else "vous n'avez qu'une page de réseau social, pas de vrai site",
                   "I couldn't find a website for your business" if not site else "you only have a social media page, not a real website")]
    etat = etat_site(commerce)
    if etat is None:
        return []
    if etat.get("plateforme"):
        return [_c("plateforme", 1, "Seulement une page sur une plateforme",
                   "Votre adresse internet renvoie vers une plateforme (TheFork, Planity…) : vous n'êtes pas chez vous, "
                   "les concurrents s'affichent à côté de vous et la plateforme prend une commission.",
                   "Un site à votre nom, qui garde le lien vers la plateforme pour les réservations.",
                   "votre lien internet renvoie vers une plateforme, pas vers votre propre site",
                   "your web link goes to a booking platform, not to your own website")]
    if etat.get("injoignable"):
        return [_c("injoignable", 1, "Le site ne s'ouvre pas",
                   "Le lien affiché sur votre fiche Google mène à une erreur : chaque client qui clique repart aussitôt.",
                   "Remettre le site en ligne (hébergement, nom de domaine) ou le remplacer.",
                   "le site affiché sur votre fiche Google ne s'ouvre pas", "the website on your Google listing doesn't load")]
    l = []
    if not etat.get("https"):
        l.append(_c("https", 1, "Site « non sécurisé »",
                    "Chrome et Safari affichent « Non sécurisé » à côté de votre adresse : beaucoup de visiteurs repartent, "
                    "et Google classe moins bien les sites non sécurisés.",
                    "Activer le certificat https (souvent gratuit chez l'hébergeur) et rediriger toutes les pages.",
                    "votre site s'affiche « non sécurisé » dans le navigateur", "your website shows as \"not secure\" in the browser"))
    if not etat.get("mobile"):
        l.append(_c("mobile", 1, "Pas adapté au téléphone",
                    "La plupart des clients cherchent un commerce depuis leur téléphone. Sur votre site, il faut zoomer "
                    "pour lire : ils abandonnent et appellent un concurrent.",
                    "Un site conçu d'abord pour le téléphone : gros textes, gros boutons, menu simple.",
                    "il s'affiche mal sur téléphone (il faut zoomer pour lire)", "it is hard to read on a phone"))
    s = etat.get("secondes") or 0
    if s > 3:
        l.append(_c("lent", 2, f"Lent à s'ouvrir ({s:.0f} s)".replace(".", ","),
                    "Au-delà de 3 secondes d'attente, beaucoup de visiteurs ferment la page avant de la voir.",
                    "Alléger les images, changer d'hébergement si besoin, enlever les extensions inutiles.",
                    f"il met {s:.0f} secondes à s'ouvrir", f"it takes {s:.0f} seconds to load"))
    annee = etat.get("annee")
    if annee and annee <= datetime.now().year - 3:
        l.append(_c("ancien", 2, f"Pas mis à jour depuis {annee}",
                    "Un site figé donne l'impression d'un commerce moins actif, et les informations (horaires, prix, "
                    "services) risquent d'être fausses.",
                    "Mettre à jour les informations et les photos, et garder le site vivant (actualités, saisons).",
                    f"il n'a pas été mis à jour depuis {annee}", f"it hasn't been updated since {annee}"))
    if etat.get("analyse"):  # signaux de la version 2 de l'analyse
        if not etat.get("tel"):
            l.append(_c("tel", 2, "Pas de bouton pour appeler",
                        "Sur téléphone, le client doit recopier votre numéro à la main : une partie abandonne.",
                        "Un bouton « Appeler » bien visible en haut de chaque page.",
                        "il n'y a pas de bouton pour vous appeler depuis un téléphone", "there is no tap-to-call button"))
        titre = (etat.get("titre") or "").strip()
        if len(titre) < 10 or titre.lower() in GENERIQUES:
            l.append(_c("titre", 2, "Titre Google absent ou trop vague" + (f" (« {titre} »)" if titre else ""),
                        "C'est le texte bleu que Google affiche dans ses résultats. Sans votre métier et votre ville "
                        "dedans, vous êtes moins bien placé et moins cliqué.",
                        "Un titre du type « Nom · métier à Ville », différent sur chaque page.",
                        "le titre affiché par Google est absent ou trop vague", "the title Google shows is missing or too vague"))
        if not etat.get("description"):
            l.append(_c("description", 3, "Pas de description pour Google",
                        "Sans description, Google choisit un morceau de texte au hasard sous votre nom.",
                        "Deux phrases qui donnent envie : ce que vous faites, où, et ce qui vous distingue.",
                        "Google n'a pas de description à afficher sous votre nom", "Google has no description to show under your name"))
        if not etat.get("mentions"):
            l.append(_c("mentions", 2, "Mentions légales introuvables",
                        "Elles sont obligatoires pour tout site professionnel en France (loi pour la confiance dans "
                        "l'économie numérique), et elles rassurent les clients.",
                        "Une page « Mentions légales » reliée en bas de chaque page.",
                        "les mentions légales, obligatoires, sont introuvables", "there is no legal notice page"))
        if not etat.get("horaires"):
            l.append(_c("horaires", 3, "Horaires absents de l'accueil",
                        "Les horaires sont la première information que les clients cherchent. S'ils ne les trouvent pas "
                        "tout de suite, ils appellent… ou vont ailleurs.",
                        "Les horaires visibles dès l'accueil, à jour (jours fériés, vacances).",
                        "vos horaires ne sont pas sur la page d'accueil", "your opening hours are not on the home page"))
        if not etat.get("carte"):
            l.append(_c("carte", 3, "Pas de plan d'accès",
                        "Un plan Google Maps permet au client de lancer l'itinéraire en un geste.",
                        "Un plan intégré et un bouton « Itinéraire ».",
                        "il n'y a pas de plan pour venir chez vous", "there is no map to find you"))
        if not etat.get("partage"):
            l.append(_c("partage", 3, "Aucune image quand on partage le site",
                        "Quand un client envoie votre site sur WhatsApp, Messenger ou Facebook, l'aperçu est vide.",
                        "Une image de partage (photo de la devanture ou d'un produit phare).",
                        "aucune image ne s'affiche quand on partage votre site", "no preview image shows when your site is shared"))
        if not etat.get("donnees_google"):
            l.append(_c("donnees", 3, "Informations pratiques illisibles pour Google",
                        "Votre adresse, vos horaires et votre téléphone ne sont pas décrits dans un format que Google "
                        "comprend : il les met moins facilement en avant.",
                        "Ajouter une fiche « établissement local » invisible pour les visiteurs (données structurées).",
                        "Google lit mal vos informations pratiques", "Google can't read your business details well"))
        n, sans = etat.get("images") or 0, etat.get("images_sans_alt") or 0
        if n >= 4 and sans / n > 0.3:
            l.append(_c("alt", 3, f"{sans} images sans description sur {n}",
                        "Google ne voit pas les images : sans description, elles ne vous aident pas à être trouvé "
                        "(et les personnes malvoyantes ne savent pas ce qu'elles montrent).",
                        "Une courte description pour chaque image (« vitrine de la boulangerie à Lyon 3e »).",
                        "vos images n'ont pas de description pour Google", "your images have no descriptions for Google"))
    return sorted(l, key=lambda c: c["gravite"])


def note_site(commerce):
    """Note du site sur 100 (100 = rien à redire). Pas de site : 0. Pas analysé : None."""
    liste = constats(commerce)
    if liste and liste[0]["cle"] in ("pas_de_site", "plateforme", "injoignable"):
        return 0 if liste[0]["cle"] != "plateforme" else 15
    if etat_site(commerce) is None:
        return None
    retrait = {1: 25, 2: 12, 3: 5}
    return max(5, 100 - sum(retrait[c["gravite"]] for c in liste))


def points_message(commerce, langue="fr", combien=3):
    """Les problèmes principaux, une ligne chacun, pour le message de prospection."""
    lg = "fr" if langue == "fr" else "en"
    lignes = [c["court"][lg] for c in constats(commerce)[:combien]]
    return "\n".join(f"- {l[0].upper()}{l[1:]}" for l in lignes)


def point_principal(commerce, langue="fr"):
    """Le problème le plus grave, en une phrase sans majuscule (« votre site s'affiche… »), ou ""."""
    liste = constats(commerce)
    return liste[0]["court"]["fr" if langue == "fr" else "en"] if liste else ""


def verifications(commerce):
    """Tableau de l'audit : (ce qu'on a vérifié, résultat « ok » / « ko » / « na », détail)."""
    etat = etat_site(commerce) or {}
    site = commerce.get("site_web")
    if not site or sans_vrai_site(site) or etat.get("plateforme") or etat.get("injoignable"):
        return []
    s = etat.get("secondes")
    v2 = bool(etat.get("analyse"))
    def sig(cle, ok_txt, ko_txt):
        if not v2:
            return ("na", "non vérifié")
        return ("ok", ok_txt) if etat.get(cle) else ("ko", ko_txt)
    titre = (etat.get("titre") or "").strip()
    return [
        ("Sécurité (https)", "ok" if etat.get("https") else "ko", "certificat actif" if etat.get("https") else "« Non sécurisé » affiché"),
        ("Affichage sur téléphone", "ok" if etat.get("mobile") else "ko", "adapté" if etat.get("mobile") else "il faut zoomer"),
        ("Vitesse d'ouverture", "na" if s is None else "ok" if s <= 3 else "ko", "–" if s is None else f"{s:.1f} s".replace(".", ",")),
        ("Mise à jour", "na" if not etat.get("annee") else "ok" if etat["annee"] > datetime.now().year - 3 else "ko",
         f"dernière date affichée : {etat['annee']}" if etat.get("annee") else "aucune date trouvée"),
        ("Titre affiché par Google", *(("na", "non vérifié") if not v2 else ("ok", f"« {titre[:60]} »")
                                       if len(titre) >= 10 and titre.lower() not in GENERIQUES else ("ko", "absent ou trop vague"))),
        ("Description pour Google", *sig("description", "présente", "absente")),
        ("Bouton pour appeler", *sig("tel", "présent", "absent")),
        ("Mentions légales", *sig("mentions", "présentes", "introuvables")),
        ("Horaires sur l'accueil", *sig("horaires", "présents", "absents")),
        ("Plan d'accès", *sig("carte", "présent", "absent")),
        ("Image de partage", *sig("partage", "présente", "absente")),
        ("Informations lisibles par Google", *sig("donnees_google", "présentes", "absentes")),
    ]


# --- Le document PDF (charte Review Maker : blanc, bleu #0055FD, marine #192340, Poppins) -----------

ASSETS = __import__("pathlib").Path(__file__).resolve().parent.parent / "assets"
BLEU, MARINE, NUIT = "#0055FD", "#192340", "#0C1533"
GRIS, LIGNE, FOND = "#5B6683", "#E4E9F5", "#F3F6FE"
ROUGE, ORANGE, VERT = "#E5484D", "#F59E0B", "#16A34A"
OFFRE_DEFAUT = {"vitrine": "990 €", "vitrine_detail": "ou 3 × 330 € sans frais", "boutique": "1 790 €",
                "boutique_detail": "ou 3 × 597 € sans frais", "delai": "5 à 10 jours"}


def _polices():
    """Poppins (la police du site reviewmaker.fr), avec Helvetica en secours si les fichiers manquent."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    noms = {"r": "Poppins-Regular", "m": "Poppins-Medium", "sb": "Poppins-SemiBold", "b": "Poppins-Bold"}
    try:
        for nom in noms.values():
            if nom not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(nom, str(ASSETS / "polices" / f"{nom}.ttf")))
        return noms
    except Exception:
        return {"r": "Helvetica", "m": "Helvetica", "sb": "Helvetica-Bold", "b": "Helvetica-Bold"}


def pdf(commerce, contact=None, offre=None):
    """Audit prêt à joindre à l'email, dans la charte Review Maker.

    contact : {"prenom", "nom", "email", "telephone"} de celui qui envoie (Réglages de son ordinateur).
    offre : prix et délai affichés dans la proposition (Réglages), sinon ceux du site reviewmaker.fr."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, Image, KeepTogether, PageTemplate, Paragraph,
                                    Spacer, Table, TableStyle)

    F = _polices()
    C = colors.HexColor
    contact = {k: (v or "").strip() for k, v in (contact or {}).items()}
    offre = {**OFFRE_DEFAUT, **{k: v for k, v in (offre or {}).items() if v and "[" not in v}}
    for f in ("vitrine", "boutique"):  # paiement en 3 fois : seulement pour les tarifs du site
        if offre[f].replace("\u202f", " ") != OFFRE_DEFAUT[f] and offre.get(f"{f}_detail") == OFFRE_DEFAUT[f"{f}_detail"]:
            offre[f"{f}_detail"] = "prix fixe, sans abonnement"
    esc = lambda t: (str(t or "")).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    def S(nom, parent=None, **k):
        if parent is not None:
            return ParagraphStyle(nom, parent=parent, **k)
        return ParagraphStyle(nom, **{"fontName": F["r"], "fontSize": 9.5, "leading": 14, "textColor": C(MARINE), **k})
    st = {
        "sur": S("sur", fontName=F["sb"], fontSize=7.5, leading=10, textColor=C(BLEU)),
        "h1": S("h1", fontName=F["sb"], fontSize=25, leading=29),
        "h2": S("h2", fontName=F["sb"], fontSize=15, leading=19, spaceAfter=2),
        "p": S("p", fontSize=9.2, leading=13), "gris": S("gris", fontSize=8.5, leading=12.5, textColor=C(GRIS)),
        "b": S("b", fontName=F["sb"], fontSize=10.5, leading=14),
        "chiffre": S("chiffre", fontName=F["sb"], fontSize=19, leading=22, alignment=TA_CENTER),
        "leg": S("leg", fontSize=7.8, leading=10, textColor=C(GRIS), alignment=TA_CENTER),
    }

    class Pastille(Flowable):
        """Petite étiquette arrondie (« Urgent », « OK »…), comme les badges du site."""
        def __init__(self, texte, fond, encre, taille=7):
            super().__init__()
            self.texte, self.fond, self.encre, self.taille = texte, fond, encre, taille
            from reportlab.pdfbase.pdfmetrics import stringWidth
            self.width, self.height = stringWidth(texte, F["sb"], taille) + 12, taille + 7

        def draw(self):
            c = self.canv
            c.setFillColor(C(self.fond))
            c.roundRect(0, 0, self.width, self.height, self.height / 2, stroke=0, fill=1)
            c.setFillColor(C(self.encre))
            c.setFont(F["sb"], self.taille)
            c.drawCentredString(self.width / 2, 3.6, self.texte)

    class Jauge(Flowable):
        """Note du site sur 100 : anneau coloré, chiffre au centre."""
        def __init__(self, note, d=30 * mm):
            super().__init__()
            self.note, self.width, self.height = note, d, d

        def draw(self):
            c, r = self.canv, self.width / 2
            c.setLineWidth(3.2 * mm)
            c.setStrokeColor(C(LIGNE))
            c.circle(r, r, r - 2.2 * mm, stroke=1, fill=0)
            if self.note:
                c.setStrokeColor(C(VERT if self.note >= 75 else ORANGE if self.note >= 45 else ROUGE))
                c.arc(2.2 * mm, 2.2 * mm, self.width - 2.2 * mm, self.height - 2.2 * mm, 90, -360 * self.note / 100)
            c.setFillColor(C(MARINE))
            c.setFont(F["sb"], 22)
            c.drawCentredString(r, r - 2.5 * mm, "–" if self.note is None else str(self.note))
            c.setFont(F["r"], 7.5)
            c.setFillColor(C(GRIS))
            c.drawCentredString(r, r - 7 * mm, "sur 100")

    def grille(lignes, largeurs, **style):
        t = Table(lignes, colWidths=largeurs, hAlign="LEFT")
        t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                               ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                               ("VALIGN", (0, 0), (-1, -1), style.get("valign", "MIDDLE"))]))
        return t

    def carte(contenu, largeur, fond="#FFFFFF", bord=LIGNE, pad=10, rayon=8):
        """Carte arrondie de `largeur` (marges intérieures comprises)."""
        t = Table([[contenu]], colWidths=[largeur], hAlign="LEFT")
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), C(fond)), ("BOX", (0, 0), (-1, -1), 0.8, C(bord)),
                               ("ROUNDEDCORNERS", [rayon] * 4), ("LEFTPADDING", (0, 0), (-1, -1), pad),
                               ("RIGHTPADDING", (0, 0), (-1, -1), pad), ("TOPPADDING", (0, 0), (-1, -1), pad),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), pad), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        return t

    liste, note = constats(commerce), note_site(commerce)
    nom = commerce.get("nom") or "Votre établissement"
    aujourd_hui = datetime.now().strftime("%d/%m/%Y")
    largeur = A4[0] - 36 * mm
    tampon = io.BytesIO()
    signataire = " ".join(x for x in [contact.get("prenom"), contact.get("nom")] if x) or "L'équipe ReviewMaker"

    def fond_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(C(BLEU))
        canvas.rect(0, A4[1] - 2.2 * mm, A4[0], 2.2 * mm, stroke=0, fill=1)
        canvas.setStrokeColor(C(LIGNE))
        canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
        canvas.setFont(F["r"], 7.5)
        canvas.setFillColor(C(GRIS))
        canvas.drawString(18 * mm, 9.5 * mm, f"Audit offert par {signataire} · ReviewMaker · reviewmaker.fr")
        canvas.drawRightString(A4[0] - 18 * mm, 9.5 * mm, f"{aujourd_hui}  ·  page {doc.page}")
        canvas.restoreState()

    doc = BaseDocTemplate(tampon, pagesize=A4, title=f"Audit du site internet · {nom}", author=f"{signataire} · ReviewMaker")
    cadre = Frame(18 * mm, 20 * mm, largeur, A4[1] - 34 * mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(frames=[cadre], onPage=fond_page)])
    h = []

    # En-tête : logo et date
    logo = ASSETS / "marque" / "logo-couleurs.png"
    tete = [Image(str(logo), width=42 * mm, height=42 * mm * 365 / 1663) if logo.exists() else Paragraph("ReviewMaker", st["h2"]),
            Paragraph(f"Audit de présence en ligne<br/>{aujourd_hui}", S("d", fontSize=8, leading=11, textColor=C(GRIS), alignment=TA_RIGHT))]
    h += [Spacer(1, 4), grille([tete], [largeur / 2, largeur / 2]), Spacer(1, 16)]

    # Titre + jauge
    titre = [Paragraph("AUDIT OFFERT", st["sur"]), Spacer(1, 4), Paragraph(esc(nom), st["h1"]), Spacer(1, 5),
             Paragraph(esc(" · ".join(x for x in [commerce.get("adresse"), commerce.get("site_web")] if x)), st["gris"])]
    h += [grille([[titre, Jauge(note)]], [largeur - 34 * mm, 34 * mm]), Spacer(1, 12)]

    # Trois chiffres
    urgents = sum(1 for c in liste if c["gravite"] == 1)
    importants = sum(1 for c in liste if c["gravite"] == 2)
    note_g = commerce.get("note")
    tuiles = [([Paragraph(f"{str(note_g).replace('.', ',')}/5" if note_g else "–", st["chiffre"]),
                Paragraph(f"note Google · {commerce.get('nb_avis') or 0} avis", st["leg"])]),
              ([Paragraph(str(urgents), S("cu", parent=st["chiffre"], textColor=C(ROUGE if urgents else MARINE))),
                Paragraph("point urgent" if urgents < 2 else "points urgents", st["leg"])]),
              ([Paragraph(str(importants), S("ci", parent=st["chiffre"], textColor=C(ORANGE if importants else MARINE))),
                Paragraph("point important" if importants < 2 else "points importants", st["leg"])])]
    g = 4 * mm
    tuile = (largeur - 2 * g) / 3
    h += [grille([[carte(tuiles[0], tuile, fond=FOND, bord=FOND, pad=10), "", carte(tuiles[1], tuile, fond=FOND, bord=FOND, pad=10), "",
                   carte(tuiles[2], tuile, fond=FOND, bord=FOND, pad=10)]], [tuile, g, tuile, g, tuile]), Spacer(1, 12)]

    sans_site = bool(liste) and liste[0]["cle"] in ("pas_de_site", "plateforme")
    if note_g and (commerce.get("nb_avis") or 0) >= 20 and note_g >= 4:
        intro = (f"Vos clients vous apprécient : {str(note_g).replace('.', ',')}/5 sur {commerce.get('nb_avis')} avis Google. "
                 + ("Mais un nouveau client qui vous cherche sur Google ne trouve pas de site à votre nom : c'est autant de "
                    "clients qui partent chez un concurrent." if sans_site else
                    "Votre site devrait être à la hauteur de cette réputation : c'est souvent la première chose que voit "
                    "un nouveau client avant de vous appeler ou de venir."))
    else:
        intro = ("Votre site internet est souvent la première chose que voit un nouveau client avant de vous appeler ou "
                 "de venir. Voici ce que nous avons relevé, et comment le corriger.")
    if not liste and note is not None:
        intro += " Bonne nouvelle : nous n'avons rien relevé d'important sur votre page d'accueil."
    h += [Paragraph(esc(intro), S("intro", fontSize=10, leading=15)), Spacer(1, 6)]

    # Ce qui a été vérifié
    lignes = verifications(commerce)
    if lignes:
        etiquettes = {"ok": ("OK", "#E8F7EE", VERT), "ko": ("À CORRIGER", "#FDECEC", ROUGE), "na": ("NON VÉRIFIÉ", FOND, GRIS)}
        donnees = [[Paragraph(esc(q), S("q", fontName=F["m"], fontSize=9)), Pastille(*etiquettes[r]), Paragraph(esc(d), st["gris"])]
                   for q, r, d in lignes]
        t = Table(donnees, colWidths=[64 * mm, 30 * mm, largeur - 94 * mm], hAlign="LEFT")
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LINEBELOW", (0, 0), (-1, -2), 0.6, C(LIGNE)),
                               ("TOPPADDING", (0, 0), (-1, -1), 4.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
                               ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
        h.append(KeepTogether([Spacer(1, 8), Paragraph("CE QUE NOUS AVONS VÉRIFIÉ", st["sur"]), Spacer(1, 3),
                               Paragraph("Votre site en un coup d'œil", st["h2"]), Spacer(1, 4), t]))

    # Les points à corriger
    if liste:
        couleurs = {1: ("#FDECEC", ROUGE), 2: ("#FEF3E2", "#B45309"), 3: ("#E8EFFF", BLEU)}
        titre_section = [Spacer(1, 14), Paragraph("LES POINTS À CORRIGER", st["sur"]), Spacer(1, 3),
                         Paragraph("Par ordre de priorité", st["h2"]), Spacer(1, 6)]
        blocs = []
        for c in [c for c in liste if c["gravite"] <= 2]:
            fond_p, encre = couleurs[c["gravite"]]
            corps = [Pastille(c["niveau"].upper(), fond_p, encre), Spacer(1, 5), Paragraph(esc(c["titre"]), st["b"]), Spacer(1, 3),
                     Paragraph(f'<font color="{GRIS}">Pourquoi c\'est important : </font>{esc(c["pourquoi"])}', st["p"]), Spacer(1, 3),
                     Paragraph(f'<font name="{F["sb"]}" color="{BLEU}">Notre recommandation : </font>{esc(c["conseil"])}', st["p"])]
            blocs.append(carte(corps, largeur))
        petits = [c for c in liste if c["gravite"] == 3]
        if petits:
            corps = [Pastille("À AMÉLIORER", *couleurs[3]), Spacer(1, 5),
                     Paragraph("Plus petits, mais ils comptent pour Google", st["b"]), Spacer(1, 4)]
            for c in petits:
                corps += [Paragraph(f'<font name="{F["sb"]}">{esc(c["titre"])}</font> : {esc(c["conseil"])}',
                                    S("pt3", fontSize=9, leading=13, leftIndent=9, bulletIndent=0, bulletFontName=F["sb"],
                                      bulletColor=C(BLEU)), bulletText="•"), Spacer(1, 3)]
            blocs.append(carte(corps, largeur))
        h.append(KeepTogether(titre_section + blocs[:1]))
        for b in blocs[1:]:
            h += [Spacer(1, 5), KeepTogether(b)]

    # La proposition (bloc bleu, comme « Voyez votre site avant de payer » sur reviewmaker.fr)
    blanc, bleu_clair = C("#FFFFFF"), C("#D6E2FF")
    pad_bloc = 14
    W = largeur - 2 * pad_bloc
    formule = lambda titre, prix, detail, points: carte(
        [Paragraph(titre, S("ft", fontName=F["sb"], fontSize=10.5, leading=13)),
         Paragraph(esc(prix), S("fp", fontName=F["sb"], fontSize=20, leading=25)),
         Paragraph(esc(detail), st["gris"]), Spacer(1, 5),
         *[Paragraph(f'<font color="{BLEU}">•</font>  {esc(x)}', S("fx", fontSize=8.5, leading=12.5)) for x in points]],
        (W - 4 * mm) / 2, pad=11)
    t2 = grille([[formule("Site vitrine", offre["vitrine"], offre["vitrine_detail"],
                         ["Toutes les pages utiles à votre activité", "Pensé pour le téléphone et pour Google",
                          "Réservation ou prise de rendez-vous", "Tag NFC avis Google offert"]),
                 formule("Boutique en ligne", offre["boutique"], offre["boutique_detail"],
                         ["Vos produits en ligne, avec de belles fiches", "Paiement sécurisé depuis le téléphone",
                          "Vous gérez ensuite vos produits", "Tag NFC avis Google offert"])]],
                [(W - 4 * mm) / 2 + 4 * mm, (W - 4 * mm) / 2], valign="TOP")
    # Le contact (prénom, nom, email, téléphone de celui qui envoie l'audit), en bas du bloc bleu
    infos = [x for x in [contact.get("email"), contact.get("telephone")] if x] or ["contact@reviewmaker.fr"]
    initiales = "".join(m[0] for m in signataire.split()[:2]).upper() if contact.get("prenom") else "RM"

    class Avatar(Flowable):
        def __init__(self):
            super().__init__()
            self.width = self.height = 12 * mm

        def draw(self):
            c = self.canv
            c.setFillColor(C("#FFFFFF"))
            c.circle(self.width / 2, self.height / 2, self.width / 2, stroke=0, fill=1)
            c.setFillColor(C(BLEU))
            c.setFont(F["sb"], 12)
            c.drawCentredString(self.width / 2, self.height / 2 - 4.2, initiales)

    contact_bloc = grille([[Avatar(), [
        Paragraph("VOTRE CONTACT", S("vc", fontName=F["sb"], fontSize=7.5, leading=10, textColor=bleu_clair)),
        Paragraph(esc(signataire), S("cn", fontName=F["sb"], fontSize=12.5, leading=16, textColor=blanc)),
        Paragraph(" · ".join(esc(x) for x in infos) + " · reviewmaker.fr", S("ci2", fontSize=9.5, leading=13, textColor=blanc))]]],
        [16 * mm, W - 16 * mm])
    bloc = [Paragraph("NOTRE PROPOSITION", S("ps", fontName=F["sb"], fontSize=7.5, leading=10, textColor=bleu_clair)), Spacer(1, 4),
            Paragraph("Voyez votre site avant de payer", S("pt", fontName=F["sb"], fontSize=17, leading=21, textColor=blanc)), Spacer(1, 5),
            Paragraph(f"Nous corrigeons tous les points de cet audit. Nous préparons d'abord, gratuitement, l'aperçu de votre "
                      f"page d'accueil : vous ne payez rien tant qu'il ne vous plaît pas. En ligne en {esc(offre['delai'])}, "
                      f"prix fixe, sans abonnement.", S("pp", fontSize=9.5, leading=14, textColor=bleu_clair)), Spacer(1, 9), t2,
            Spacer(1, 12), contact_bloc, Spacer(1, 10),
            Paragraph(f"Analyse automatique de la page d'accueil, réalisée le {aujourd_hui} : une première idée, qui ne remplace "
                      "pas un audit complet de toutes les pages.", S("mention", fontSize=7.2, leading=10, textColor=bleu_clair))]
    h += [Spacer(1, 8), KeepTogether(carte(bloc, largeur, fond=BLEU, bord=BLEU, pad=pad_bloc, rayon=12))]
    doc.build(h)
    return tampon.getvalue()
