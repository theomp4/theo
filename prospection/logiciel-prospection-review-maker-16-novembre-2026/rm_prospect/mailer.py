"""Envoi d'emails de prospection, réglé pour éviter les spams.

Règles appliquées automatiquement :
- texte simple, sans image ni pièce jointe, personnalisé pour chaque commerce ;
- montée en charge progressive (10 puis 20 puis 30 emails par jour) ;
- pause aléatoire entre deux envois ;
- en-tête de désinscription + phrase « répondez STOP » (obligatoire en prospection B2B, CNIL) ;
- jamais d'envoi aux désinscrits, refus, ventes, ni deux fois la même étape.
"""
import email
import email.policy
import imaplib
import random
import re
import smtplib
import ssl
from datetime import datetime, timedelta
from email.header import decode_header
from email.message import EmailMessage
from email.utils import formataddr, make_msgid, parseaddr

from . import audit, db

# Modèles par défaut : MODELES_DEFAUT[espace][langue][etape]. Courts (60 mots max), humains,
# sans proposer de visite (tout se fait à distance), et qui invitent à poser des questions.
MODELES_DEFAUT = {
    "nfc": {
        "fr": {
            "premier": {
                "sujets": "Vos avis Google, {nom}\nUne question pour {nom}\nPlus d'avis Google pour {nom}",
                "corps": "Bonjour,\n\nJ'ai vu la fiche Google de {nom} : {phrase_avis}\n\nReview Maker est un tag à "
                         "coller sur le comptoir : le client approche son téléphone et laisse son avis en moins de "
                         "15 secondes, sans application.\n\n35 € une seule fois, livraison offerte, garanti à vie.\n\n"
                         "Une question ? Répondez simplement à cet email.\n\n{signature}",
            },
            "relance1": {
                "sujets": "Re: Vos avis Google, {nom}",
                "corps": "Bonjour,\n\nJe me permets de vous relancer.\n\nAvec le tag Review Maker sur votre comptoir, "
                         "vos clients laissent leur avis avant de partir. À 35 €, il se rembourse en quelques clients."
                         "\n\nUne question ? Répondez à cet email.\n\n{signature}",
            },
            "relance2": {
                "sujets": "Dernier message pour {nom}",
                "corps": "Bonjour,\n\nDernier message, promis.\n\nSi un jour vous voulez plus d'avis Google pour {nom}, "
                         "répondez simplement à cet email.\n\nBelle journée,\n\n{signature}",
            },
        },
        "en": {
            "premier": {
                "sujets": "Your Google reviews, {nom}\nA quick question for {nom}\nMore Google reviews for {nom}",
                "corps": "Hello,\n\nI saw {nom} on Google: {phrase_avis}\n\nReview Maker is a small tag for your "
                         "counter: customers tap it with their phone and leave a review in under 15 seconds, no app "
                         "needed.\n\n€35 one-off, free delivery, lifetime warranty.\n\nAny questions? Just reply to "
                         "this email.\n\n{signature}",
            },
            "relance1": {
                "sujets": "Re: Your Google reviews, {nom}",
                "corps": "Hello,\n\nJust following up.\n\nWith a Review Maker tag on your counter, customers leave "
                         "their review before they walk out. At €35, it pays for itself after a few customers.\n\n"
                         "Any questions? Just reply to this email.\n\n{signature}",
            },
            "relance2": {
                "sujets": "Last message for {nom}",
                "corps": "Hello,\n\nLast message, I promise.\n\nIf you ever want more Google reviews for {nom}, "
                         "just reply to this email.\n\nHave a great day,\n\n{signature}",
            },
        },
    },
    "web": {
        "fr": {
            "premier": {
                "sujets": "Audit gratuit du site de {nom}\nVotre site internet, {nom}\n{nom} sur Google",
                "corps": "Bonjour,\n\nJ'ai vu {nom} sur Google : {note} et {nb_avis} avis, bravo. En ligne, j'ai "
                         "relevé des points qui vous font perdre des clients :\n{analyse_site}\n\nJe vous ai préparé "
                         "un audit gratuit, en pièce jointe, avec les corrections.\n\nJe crée des sites modernes pour "
                         "les PME, à distance. {prix}, prêt en {delai}.\n\nUne question ? Répondez simplement à cet "
                         "email.\n\n{signature}",
            },
            "relance1": {
                "sujets": "Re: Audit gratuit du site de {nom}",
                "corps": "Bonjour,\n\nJe me permets de vous relancer au sujet de l'audit de votre site.\n\n"
                         "Le point le plus urgent : {point_principal}. Chaque jour, ce sont des clients qui vous "
                         "cherchent sur Google et partent chez un concurrent.\n\nJe peux tout corriger pour {nom}, "
                         "à distance. Une question ? Répondez à cet email.\n\n{signature}",
            },
            "relance2": {
                "sujets": "Dernier message pour {nom}",
                "corps": "Bonjour,\n\nDernier message, promis.\n\nSi un jour vous pensez à un site pour {nom}, "
                         "répondez simplement à cet email.\n\nBelle journée,\n\n{signature}",
            },
        },
        "en": {
            "premier": {
                "sujets": "Free audit of {nom}'s website\n{nom}'s website\n{nom} on Google",
                "corps": "Hello,\n\nI saw {nom} on Google: {note} with {nb_avis} reviews, well done. Online, I "
                         "noticed a few things that cost you customers:\n{analyse_site}\n\nI've prepared a free "
                         "audit for you, attached, with the fixes.\n\nI build modern websites for small businesses, "
                         "remotely. {prix}, ready in {delai}.\n\nAny questions? Just reply to this email.\n\n{signature}",
            },
            "relance1": {
                "sujets": "Re: {nom}'s website",
                "corps": "Hello,\n\nJust following up.\n\nA clear website helps people who find you on Google to call "
                         "you. I take care of everything for {nom}, remotely.\n\nAny questions? Just reply to this "
                         "email.\n\n{signature}",
            },
            "relance2": {
                "sujets": "Last message for {nom}",
                "corps": "Hello,\n\nLast message, I promise.\n\nIf you ever think about a website for {nom}, just "
                         "reply to this email.\n\nHave a great day,\n\n{signature}",
            },
        },
    },
}

ETAPES = ["premier", "relance1", "relance2"]
NOMS_ETAPES = {"premier": "Premier email", "relance1": "Relance 1 (J+4)", "relance2": "Relance 2 (J+10)"}
DELAIS_RELANCE = {"relance1": 4, "relance2": 10}  # jours après le premier email
MENTIONS_STOP = {
    "fr": "\n\n--\nVous ne souhaitez plus recevoir de message de ma part ? Répondez simplement STOP.",
    "en": "\n\n--\nDon't want to hear from me again? Just reply STOP.",
}
MENTION_STOP = MENTIONS_STOP["fr"]


def langue_modele(langue):
    """Les modèles fixes existent en français et en anglais ; l'IA écrit dans toutes les langues."""
    return langue if langue in ("fr", "en") else "en"


def modele(espace, langue, etape):
    return MODELES_DEFAUT[espace][langue_modele(langue)][etape]


def phrase_avis(note, nb_avis, langue="fr"):
    note_txt = str(note).replace(".", ",") if langue == "fr" else str(note)
    if langue != "fr":
        if not nb_avis:
            return "no reviews yet, although happy customers could easily leave some."
        if note and note <= 4.2:
            return f"{nb_avis} reviews, rated {note_txt}. A few more good reviews would quickly lift your rating."
        return f"{nb_avis} reviews, your happy customers could leave many more."
    if not nb_avis:
        return "aucun avis pour l'instant, alors que vos clients satisfaits pourraient en laisser facilement."
    if note and note <= 4.2:
        return f"{nb_avis} avis, note {note_txt}. Quelques avis de plus feraient vite remonter la note."
    return f"{nb_avis} avis, vos clients satisfaits pourraient en laisser bien plus."


def phrase_site(commerce, langue="fr"):
    """Une phrase sur le site du commerce, tirée de l'analyse (pas de site, non sécurisé…)."""
    from .scoring import etat_site, sans_vrai_site
    fr = langue == "fr"
    if sans_vrai_site(commerce.get("site_web")):
        return "Par contre, je n'ai pas trouvé de site internet." if fr else "However, I couldn't find a website."
    etat = etat_site(commerce) or {}
    if etat.get("injoignable"):
        return "Par contre, votre site ne s'ouvre pas." if fr else "However, your website doesn't load."
    if etat and not etat.get("https"):
        return ("Par contre, votre site s'affiche « non sécurisé »." if fr
                else "However, your website shows as \"not secure\".")
    if etat and not etat.get("mobile"):
        return ("Par contre, votre site s'affiche mal sur téléphone." if fr
                else "However, your website is hard to read on a phone.")
    return "Votre site mériterait un petit coup de neuf." if fr else "Your website could use a refresh."


def remplir(texte, commerce, signature, langue="fr", prix="[TON PRIX]", delai="[DÉLAI]"):
    note = commerce.get("note") or ""
    valeurs = {
        "nom": commerce.get("nom") or ("votre établissement" if langue == "fr" else "your business"),
        "ville": commerce.get("ville_recherche") or "",
        "note": str(note).replace(".", ",") if langue == "fr" else str(note),
        "nb_avis": commerce.get("nb_avis") or 0,
        "phrase_avis": phrase_avis(commerce.get("note"), commerce.get("nb_avis"), langue),
        "phrase_site": phrase_site(commerce, langue),
        "analyse_site": audit.points_message(commerce, langue) or phrase_site(commerce, langue),
        "point_principal": audit.point_principal(commerce, langue) or phrase_site(commerce, langue).rstrip("."),
        "prix": prix, "delai": delai,
        "signature": signature,
    }
    return texte.format_map(_Defaut(valeurs))


class _Defaut(dict):
    def __missing__(self, cle):
        return "{" + cle + "}"


def limite_du_jour(conn, maximum):
    """Montée en charge : 10/jour la 1re semaine, 20 la 2e, 30 la 3e, puis le maximum réglé."""
    row = conn.execute("SELECT MIN(date) FROM emails_envoyes").fetchone()
    if not row[0]:
        return min(10, maximum)
    semaines = (datetime.now() - datetime.fromisoformat(row[0])).days // 7
    return min(maximum, [10, 20, 30][semaines] if semaines < 3 else maximum)


def construire_message(cfg, destinataire, sujet, corps, langue="fr"):
    msg = EmailMessage()
    msg["From"] = formataddr((cfg["nom_expediteur"], cfg["adresse"]))
    msg["To"] = destinataire
    msg["Subject"] = sujet
    msg["Reply-To"] = cfg["adresse"]
    msg["Message-ID"] = make_msgid(domain=cfg["adresse"].split("@")[-1])
    msg["List-Unsubscribe"] = f"<mailto:{cfg['adresse']}?subject=STOP>"
    msg.set_content(corps + MENTIONS_STOP.get(langue, MENTIONS_STOP["en"]))
    return msg


def ouvrir_smtp(cfg):
    port = int(cfg["port"])
    if port == 465:
        serveur = smtplib.SMTP_SSL(cfg["serveur"], port, context=ssl.create_default_context(), timeout=30)
    else:
        serveur = smtplib.SMTP(cfg["serveur"], port, timeout=30)
        serveur.starttls(context=ssl.create_default_context())
    serveur.login(cfg["identifiant"], cfg["mot_de_passe"])
    return serveur


def candidats(conn, espace, etape):
    """Commerces de l'espace qui peuvent recevoir cette étape aujourd'hui."""
    exclus = ("Refus", "Vendu", "Ne plus contacter", "A répondu", "Intéressé")
    lignes = conn.execute(
        f"SELECT * FROM commerces WHERE espace=? AND email IS NOT NULL AND email != '' "
        f"AND statut NOT IN ({','.join('?' * len(exclus))}) ORDER BY score DESC", (espace, *exclus)).fetchall()
    resultat = []
    for c in lignes:
        if db.est_desinscrit(conn, c["email"]):
            continue
        deja = {r["etape"]: r["date"] for r in conn.execute(
            "SELECT etape, date FROM emails_envoyes WHERE cle=?", (c["cle"],))}
        if etape in deja:
            continue
        if etape == "premier":
            resultat.append(dict(c))
        elif "premier" in deja:
            precedente = ETAPES[ETAPES.index(etape) - 1]
            depuis = datetime.now() - datetime.fromisoformat(deja["premier"])
            if precedente in deja and depuis >= timedelta(days=DELAIS_RELANCE[etape]):
                resultat.append(dict(c))
    return resultat


def enregistrer_envoi(conn, commerce, sujet, etape, email=None):
    """Note l'envoi. `email` = l'adresse réellement utilisée (si tu l'as changée avant l'envoi)."""
    email = email or commerce["email"]
    conn.execute("INSERT INTO emails_envoyes(cle, email, date, sujet, etape) VALUES(?, ?, ?, ?, ?)",
                 (commerce["cle"], email, db.maintenant(), sujet, etape))
    statut = "Contacté" if etape == "premier" else "Relance"
    relance = None
    if etape != "relance2":
        prochaine = ETAPES[ETAPES.index(etape) + 1]
        relance = (datetime.now() + timedelta(days=DELAIS_RELANCE[prochaine] - (DELAIS_RELANCE.get(etape, 0)))).strftime("%Y-%m-%d")
    conn.execute("UPDATE commerces SET statut=?, relance_le=?, email=? WHERE cle=?",
                 (statut, relance, email, commerce["cle"]))
    conn.commit()
    db.ajouter_historique(conn, commerce["cle"], "Email", f"{NOMS_ETAPES[etape]} : {sujet}")


def _decoder(valeur):
    morceaux = []
    for texte, enc in decode_header(valeur or ""):
        morceaux.append(texte.decode(enc or "utf-8", errors="ignore") if isinstance(texte, bytes) else texte)
    return "".join(morceaux)


def verifier_reponses(conn, cfg, jours=21):
    """Lit la boîte de réception (IMAP) : un STOP désinscrit, une autre réponse passe en « A répondu »."""
    adresses = {r["email"].lower(): r["cle"] for r in conn.execute(
        "SELECT DISTINCT email, cle FROM emails_envoyes")}
    if not adresses:
        return 0, 0
    boite = imaplib.IMAP4_SSL(cfg["serveur_imap"])
    boite.login(cfg["identifiant"], cfg["mot_de_passe"])
    boite.select("INBOX", readonly=True)
    depuis = (datetime.now() - timedelta(days=jours)).strftime("%d-%b-%Y")
    _, data = boite.search(None, f'(SINCE "{depuis}")')
    stops = reponses = 0
    for num in data[0].split():
        _, msg_data = boite.fetch(num, "(RFC822)")
        msg = email.message_from_bytes(msg_data[0][1], policy=email.policy.default)
        expediteur = parseaddr(msg.get("From"))[1].lower()
        if expediteur not in adresses:
            continue
        cle = adresses[expediteur]
        texte = _decoder(msg.get("Subject"))
        partie = msg.get_body(preferencelist=("plain",))
        if partie is not None:
            try:
                texte += "\n" + partie.get_content()[:500]
            except Exception:
                pass
        if re.search(r"\bstop\b|désinscri|desinscri|unsubscribe", texte, re.I):
            if not db.est_desinscrit(conn, expediteur):
                db.desinscrire(conn, expediteur)
                db.ajouter_historique(conn, cle, "Email", "Désinscription (STOP)")
                stops += 1
        else:
            statut = conn.execute("SELECT statut FROM commerces WHERE cle=?", (cle,)).fetchone()
            if statut and statut["statut"] in ("Contacté", "Relance"):
                db.maj_commerce(conn, cle, statut="A répondu")
                db.ajouter_historique(conn, cle, "Email", "Réponse reçue : à lire dans ta boîte mail")
                reponses += 1
    boite.logout()
    return stops, reponses
