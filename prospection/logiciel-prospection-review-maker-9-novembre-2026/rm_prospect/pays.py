"""Pays proposés : code Google, langue des messages et règle d'envoi d'emails de prospection.

Les règles sont un résumé pour t'aider, pas un avis juridique : en cas de doute, renseigne-toi
sur la loi du pays avant une grosse campagne.
"""

# code -> (nom, langue des messages, mot de liaison dans la recherche Google, emails autorisés, règle)
PAYS = {
    "FR": ("France", "fr", "à", True,
           "B2B autorisé sans accord préalable si l'offre concerne l'activité (CNIL). Dis qui tu es et propose STOP."),
    "BE": ("Belgique", "fr", "à", True,
           "B2B toléré vers les adresses génériques (info@, contact@). Propose STOP."),
    "CH": ("Suisse", "fr", "à", True,
           "B2B toléré si l'expéditeur est clairement identifié et propose de refuser."),
    "LU": ("Luxembourg", "fr", "à", True, "Règles proches de la France. Propose STOP."),
    "CA": ("Canada", "fr", "à", False,
           "Loi anti-pourriel (LCAP/CASL) : un accord préalable est obligatoire. Contacte par téléphone ou Instagram."),
    "MA": ("Maroc", "fr", "à", True, "Identifie-toi clairement et propose STOP."),
    "GB": ("Royaume-Uni", "en", "in", True,
           "B2B autorisé vers les sociétés (pas les auto-entrepreneurs). Propose de refuser (opt-out)."),
    "US": ("États-Unis", "en", "in", True,
           "CAN-SPAM : autorisé, mais ton adresse postale et un moyen de refuser sont obligatoires."),
    "IE": ("Irlande", "en", "in", True, "B2B vers les sociétés autorisé. Propose de refuser."),
    "AU": ("Australie", "en", "in", False,
           "Spam Act : un accord préalable (même supposé) est requis. Préfère le téléphone ou Instagram."),
    "ES": ("Espagne", "es", "en", False,
           "Accord préalable requis pour les emails commerciaux (LSSI). Préfère le téléphone ou Instagram."),
    "IT": ("Italie", "it", "a", False,
           "Accord préalable requis (Garante). Préfère le téléphone ou Instagram."),
    "DE": ("Allemagne", "de", "in", False,
           "Très strict (UWG) : pas d'email de prospection sans accord. Préfère le téléphone ou Instagram."),
    "PT": ("Portugal", "pt", "em", True, "B2B toléré vers les sociétés. Propose de refuser."),
    "NL": ("Pays-Bas", "nl", "in", True, "B2B toléré vers les sociétés. Propose de refuser."),
}

LANGUES = {"fr": "Français", "en": "English", "es": "Español", "it": "Italiano",
           "de": "Deutsch", "pt": "Português", "nl": "Nederlands"}


def nom(code):
    return PAYS.get(code, (code,))[0]


def langue(code):
    return PAYS.get(code, ("", "fr"))[1]


def emails_autorises(code):
    return PAYS.get(code, ("", "fr", "à", True))[3]


def regle(code):
    return PAYS.get(code, ("", "fr", "à", True, ""))[4]


def requete(mots, ville, code):
    """Texte envoyé à Google, ex. « restaurant à Lyon » ou « restaurant in London »."""
    liaison = PAYS.get(code, ("", "fr", "à"))[2]
    return f"{mots} {liaison} {ville}"
