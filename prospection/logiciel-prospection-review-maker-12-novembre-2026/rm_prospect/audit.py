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


# --- Le document PDF ------------------------------------------------------------------

def _euros_txt(prix):
    return prix if prix and "[" not in prix else ""


def pdf(commerce, expediteur="Review Maker", signature="", prix="", delai=""):
    """Audit d'une à deux pages, prêt à joindre à l'email. Renvoie les octets du PDF."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)
    from reportlab.graphics.shapes import Circle, Drawing, String, Wedge

    VIOLET, ENCRE, GRIS, FOND = colors.HexColor("#6D4AF0"), colors.HexColor("#17141F"), colors.HexColor("#6B6778"), colors.HexColor("#F4F1FE")
    ROUGE, ORANGE, BLEU, VERT = colors.HexColor("#E5484D"), colors.HexColor("#F59E0B"), colors.HexColor("#6D4AF0"), colors.HexColor("#16A34A")
    COUL_GRAV = {1: ROUGE, 2: ORANGE, 3: BLEU}
    esc = lambda t: (str(t or "")).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    st = {
        "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=ENCRE),
        "sur": ParagraphStyle("sur", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=VIOLET),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=ENCRE, spaceBefore=10, spaceAfter=6),
        "p": ParagraphStyle("p", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=ENCRE),
        "gris": ParagraphStyle("gris", fontName="Helvetica", fontSize=8.5, leading=12, textColor=GRIS),
        "b": ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=ENCRE),
        "chiffre": ParagraphStyle("chiffre", fontName="Helvetica-Bold", fontSize=16, leading=19, textColor=ENCRE, alignment=TA_CENTER),
        "leg": ParagraphStyle("leg", fontName="Helvetica", fontSize=8, leading=10, textColor=GRIS, alignment=TA_CENTER),
    }

    liste = constats(commerce)
    note = note_site(commerce)
    nom = commerce.get("nom") or "Votre établissement"
    aujourd_hui = datetime.now().strftime("%d/%m/%Y")
    tampon = io.BytesIO()

    def pied(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(VIOLET)
        canvas.rect(0, A4[1] - 6 * mm, A4[0], 6 * mm, stroke=0, fill=1)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(GRIS)
        canvas.drawString(18 * mm, 10 * mm, f"Audit offert par {expediteur} · {aujourd_hui}")
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(tampon, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                            bottomMargin=18 * mm, title=f"Audit du site internet · {nom}", author=expediteur)
    largeur = A4[0] - 36 * mm
    h = []

    # En-tête : titre + jauge de la note
    jauge = Drawing(34 * mm, 34 * mm)
    cx = cy = 17 * mm
    jauge.add(Circle(cx, cy, 15 * mm, fillColor=FOND, strokeColor=None))
    if note:
        coul = VERT if note >= 75 else ORANGE if note >= 45 else ROUGE
        jauge.add(Wedge(cx, cy, 15 * mm, 90 - 360 * note / 100, 90, fillColor=coul, strokeColor=None))
    jauge.add(Circle(cx, cy, 11.5 * mm, fillColor=colors.white, strokeColor=None))
    jauge.add(String(cx, cy - 1 * mm, "–" if note is None else str(note), fontName="Helvetica-Bold", fontSize=20,
                     fillColor=ENCRE, textAnchor="middle"))
    jauge.add(String(cx, cy - 6 * mm, "sur 100", fontName="Helvetica", fontSize=7, fillColor=GRIS, textAnchor="middle"))
    entete = [Paragraph("AUDIT DE PRÉSENCE EN LIGNE", st["sur"]), Spacer(1, 3),
              Paragraph(esc(nom), st["h1"]), Spacer(1, 4),
              Paragraph(esc(" · ".join(x for x in [commerce.get("adresse"), commerce.get("site_web")] if x)), st["gris"]),
              Spacer(1, 2), Paragraph(f"Analyse du {aujourd_hui}", st["gris"])]
    t = Table([[entete, jauge]], colWidths=[largeur - 38 * mm, 38 * mm])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    h += [Spacer(1, 6), t, Spacer(1, 8)]

    # Résumé en trois chiffres
    urgents = sum(1 for c in liste if c["gravite"] == 1)
    importants = sum(1 for c in liste if c["gravite"] == 2)
    note_g = commerce.get("note")
    cases = [
        [Paragraph(f"{str(note_g).replace('.', ',')}/5" if note_g else "–", st["chiffre"]),
         Paragraph(f"note Google ({commerce.get('nb_avis') or 0} avis)", st["leg"])],
        [Paragraph(str(urgents), st["chiffre"]), Paragraph("point urgent" if urgents < 2 else "points urgents", st["leg"])],
        [Paragraph(str(importants), st["chiffre"]), Paragraph("point important" if importants < 2 else "points importants", st["leg"])],
    ]
    t = Table([cases], colWidths=[largeur / 3] * 3)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), FOND), ("BOX", (0, 0), (-1, -1), 0, colors.white),
                           ("LINEAFTER", (0, 0), (1, 0), 3, colors.white), ("TOPPADDING", (0, 0), (-1, -1), 9),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]))
    h += [t, Spacer(1, 10)]

    # Phrase de synthèse
    sans_site = bool(liste) and liste[0]["cle"] in ("pas_de_site", "plateforme")
    if note_g and (commerce.get("nb_avis") or 0) >= 20 and note_g >= 4:
        intro = (f"Vos clients vous apprécient : {str(note_g).replace('.', ',')}/5 sur {commerce.get('nb_avis')} avis Google. "
                 + ("Mais un nouveau client qui vous cherche sur Google ne trouve pas de site à votre nom : c'est autant de "
                    "clients qui partent chez un concurrent." if sans_site else
                    "Votre site internet devrait être à la hauteur de cette réputation : c'est souvent la première chose "
                    "que voit un nouveau client avant de venir."))
    else:
        intro = ("Votre site internet est souvent la première chose que voit un nouveau client avant de vous appeler "
                 "ou de venir. Voici ce que nous avons relevé.")
    if not liste and note is not None:
        intro += " Bonne nouvelle : nous n'avons rien relevé d'important sur votre page d'accueil."
    h += [Paragraph(esc(intro), st["p"]), Spacer(1, 6)]

    # Ce qui a été vérifié
    lignes = verifications(commerce)
    if lignes:
        libelle = {"ok": ("OK", VERT), "ko": ("À CORRIGER", ROUGE), "na": ("–", GRIS)}
        donnees = []
        for quoi, res, detail in lignes:
            txt, coul = libelle[res]
            donnees.append([Paragraph(esc(quoi), st["p"]),
                            Paragraph(f'<font color="{coul.hexval().replace("0x", "#")}"><b>{txt}</b></font>', st["p"]),
                            Paragraph(esc(detail), st["gris"])])
        t = Table(donnees, colWidths=[62 * mm, 28 * mm, largeur - 90 * mm])
        t.setStyle(TableStyle([("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, FOND]), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                               ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
        h.append(KeepTogether([Paragraph("Ce que nous avons vérifié", st["h2"]), t]))

    # Les points à corriger
    if liste:
        h.append(Paragraph("Les points à corriger, par priorité", st["h2"]))
        for c in liste:
            pastille = Table([[Paragraph(f'<font color="white"><b>{c["niveau"].upper()}</b></font>',
                                         ParagraphStyle("pa", fontName="Helvetica-Bold", fontSize=7, leading=9, alignment=TA_CENTER))]],
                             colWidths=[22 * mm])
            pastille.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), COUL_GRAV[c["gravite"]]),
                                          ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5)]))
            corps = [Paragraph(esc(c["titre"]), st["b"]), Spacer(1, 2),
                     Paragraph(f'<font color="#6B6778">Pourquoi c\'est important :</font> {esc(c["pourquoi"])}', st["p"]),
                     Spacer(1, 2),
                     Paragraph(f'<font color="#6D4AF0"><b>Notre recommandation :</b></font> {esc(c["conseil"])}', st["p"])]
            bloc = Table([[pastille, corps]], colWidths=[26 * mm, largeur - 26 * mm])
            bloc.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                      ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#E7E3F3")),
                                      ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
            h.append(KeepTogether(bloc))

    # La proposition
    prix_txt, delai_txt = _euros_txt(prix), _euros_txt(delai)
    offre = [Paragraph("Notre proposition", ParagraphStyle("po", parent=st["h2"], textColor=colors.white, spaceBefore=0)),
             Paragraph("Nous créons pour vous un site simple et moderne, pensé pour le téléphone : horaires, photos, "
                       "avis Google, plan d'accès et bouton d'appel. Tous les points de cet audit sont corrigés, et nous "
                       "nous occupons de tout, à distance.",
                       ParagraphStyle("pp", parent=st["p"], textColor=colors.white))]
    if prix_txt or delai_txt:
        offre += [Spacer(1, 5), Paragraph(" · ".join(x for x in [f"<b>{esc(prix_txt)}</b>" if prix_txt else "",
                                                                  f"prêt en {esc(delai_txt)}" if delai_txt else ""] if x),
                                          ParagraphStyle("pq", parent=st["p"], textColor=colors.white, fontSize=11, leading=15))]
    offre += [Spacer(1, 5), Paragraph("Une question ? Répondez simplement à notre email, ou appelez-nous.",
                                      ParagraphStyle("pr", parent=st["p"], textColor=colors.HexColor("#E4DCFF")))]
    if signature:
        offre += [Spacer(1, 6), Paragraph(esc(signature).replace("\n", "<br/>"),
                                          ParagraphStyle("ps", parent=st["p"], textColor=colors.white, fontName="Helvetica-Bold"))]
    t = Table([[offre]], colWidths=[largeur])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), VIOLET), ("LEFTPADDING", (0, 0), (-1, -1), 14),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 14), ("TOPPADDING", (0, 0), (-1, -1), 12),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 14)]))
    h += [Spacer(1, 12), KeepTogether(t), Spacer(1, 8),
          Paragraph("Analyse automatique de la page d'accueil, réalisée le " + aujourd_hui + ". Elle donne une première "
                    "idée et ne remplace pas un audit complet de toutes les pages.", st["gris"])]
    doc.build(h, onFirstPage=pied, onLaterPages=pied)
    return tampon.getvalue()
