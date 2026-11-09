"""Génère le planning de contenu Review Maker (sites internet) sur 26 semaines
et le dossier à importer dans le logiciel de prospection.

Sortie : prospection/Review-Maker-Prospection/ (CSV, .ics, README) + weeks.json pour la page planning.
Usage : python3 prospection/scripts/generer_dossier.py
"""
import csv
import json
import os
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "Review-Maker-Prospection")
START = date(2026, 11, 9)  # lundi, semaine A
WEEKS = 26
JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]

# (nom, article, mot-clé de recherche)
METIERS = [
    ("boulangerie", "d'une", "boulangerie"),
    ("restaurant", "d'un", "restaurant"),
    ("salon de coiffure", "d'un", "coiffeur"),
    ("garage", "d'un", "garage"),
    ("fleuriste", "d'un", "fleuriste"),
    ("pizzeria", "d'une", "pizzeria"),
    ("institut de beauté", "d'un", "institut de beauté"),
    ("boucherie", "d'une", "boucherie"),
    ("barbier", "d'un", "barbier"),
    ("fromagerie", "d'une", "fromagerie"),
    ("caviste", "d'un", "caviste"),
    ("salle de sport", "d'une", "salle de sport"),
    ("opticien", "d'un", "opticien"),
]
CYCLE = len(METIERS)  # 13 : en 26 semaines chaque sujet revient une fois, fait par l'autre personne


def m(week, offset):
    return METIERS[(week + offset) % CYCLE]


def cap(s):
    return s[0].upper() + s[1:]


AVANT = ["Fiche Google sans site", "Site des années 2000", "Page Facebook seule", "Site illisible sur téléphone"]
ERREURS = [
    "Pas de bouton pour appeler", "Horaires introuvables", "Texte minuscule sur téléphone", "Photos floues ou absentes",
    "Site trop lent à charger", "Pas d'adresse ni de plan", "Carte ou tarifs en PDF à télécharger",
    "Pas de réservation en ligne", "Infos pas à jour (ouvert ? fermé ?)", "Aucun lien vers les réseaux",
    "Design qui date de 10 ans", "Pas de site du tout, juste Facebook", "Trop de texte, on ne trouve rien",
]
TEST_TEL = [
    "Menu de restaurant", "Prise de rendez-vous", "Plan d'accès", "Galerie photos", "Bouton « Appeler »",
    "Formulaire de contact", "Horaires", "Carte des prix", "Page d'accueil", "Réservation", "Click & collect",
    "Page « Notre histoire »", "Temps de chargement",
]
MESSAGES = [
    "Ton commerce mérite un site à sa hauteur.", "Tes clients te cherchent d'abord sur Google.",
    "Un beau site, c'est ta vitrine ouverte 24 h/24.", "Ton site, pensé d'abord pour le téléphone.",
    "La première impression se joue en ligne.", "Un site simple, beau, qui donne envie d'entrer.",
    "Ton savoir-faire mérite d'être vu.", "Un client qui te trouve, c'est un client qui vient.",
    "Moins de clics, plus de clients.", "Ton site travaille même quand tu fermes.",
    "Fait pour ton commerce, pas pour tout le monde.", "Clair sur téléphone. Beau sur ordi. Trouvé sur Google.",
    "On s'occupe du site, tu t'occupes de tes clients.",
]
FONCTIONS = [
    "Réservation en ligne", "Bouton « Appeler » et itinéraire", "Click & collect", "Prise de rendez-vous",
    "Carte et menu en ligne", "Galerie photos", "Horaires toujours à jour", "Formulaire de devis",
    "Version mobile rapide", "Plan Google Maps intégré", "Liens vers les réseaux sociaux",
    "Page « Notre histoire »", "Page contact claire",
]
LIEUX = [
    "Rue commerçante du centre", "Marché du week-end", "Zone artisanale", "Quartier des restaurants",
    "Rue piétonne", "Place du village", "Halles / marché couvert", "Quartier de la gare",
    "Commerces de bouche", "Galerie marchande", "Commerces du quartier résidentiel", "Artisans du centre-ville",
    "Commerces ouverts le dimanche",
]
OBJECTIONS = [
    "« Un site, c'est trop cher ? »", "« J'ai déjà Facebook, ça suffit ? »", "« Je n'ai pas le temps de m'en occuper. »",
    "« Mes clients me connaissent déjà. »", "« Mon neveu peut me le faire. »", "« Je peux le faire moi-même gratuitement. »",
    "« Ça sert à quoi si j'ai Instagram ? »", "« Et si je veux changer quelque chose après ? »",
    "« Je ne suis pas à l'aise avec l'informatique. »", "« Combien de temps ça prend ? »",
    "« Mes clients réservent par téléphone. »", "« Mon commerce est trop petit pour un site. »",
    "« J'ai déjà un site, il marche très bien. »",
]
REACTIONS = ["Livraison d'un site client (réaction filmée)", "Transition ordi → téléphone sur un son tendance", "« Mon client quand il voit son site »"]
COULISSES = [
    "Une journée type", "Un rendez-vous client", "La mise en ligne d'un site", "Notre façon de travailler",
    "Comment on choisit les couleurs d'un site", "Notre setup de travail", "Le premier jet vs le site final",
    "Pourquoi on a lancé Review Maker", "Une semaine en 30 secondes", "Ce qu'on fait avant de commencer un site",
    "Le site dont on est le plus fiers", "Nos ratés de la semaine", "Le bilan du mois",
]

# Temps forts : lundi de la semaine -> (note, surcharges éventuelles {slot: sujet})
TEMPS_FORTS = {
    date(2026, 11, 23): ("Black Friday (ven. 27 nov.) : les gens cherchent les commerces en ligne tout le week-end. Pas de fausse promo, angle « ton commerce est-il trouvable ? ».", {}),
    date(2026, 11, 30): ("Début des fêtes : les clients cherchent leurs cadeaux et leurs traiteurs en ligne.", {"insta_mer": "« Tes clients préparent Noël en ligne. Ils te trouvent ? »"}),
    date(2026, 12, 7): ("Marchés de Noël : idéal pour le micro-trottoir.", {"tiktok_ven": "Marché de Noël"}),
    date(2026, 12, 14): ("Dernière semaine avant Noël : programmez les posts de la semaine suivante à l'avance.", {"tiktok_lun": "Chocolatier (spécial Noël)"}),
    date(2026, 12, 21): ("Semaine de Noël : posts plus courts, publiés à l'avance. Pensez à répondre aux messages.", {"tiktok_dim": "Notre Noël chez Review Maker"}),
    date(2026, 12, 28): ("Nouvel an : bilan et bonnes résolutions des commerçants.", {"tiktok_dim": "Le bilan de notre année 2026", "insta_mer": "« 2027 : ton commerce mérite un site à sa hauteur. »"}),
    date(2027, 1, 4): ("Bonnes résolutions : « cette année, je fais mon site ».", {"tiktok_sam": "« Cette année, je m'occupe enfin de mon site. »"}),
    date(2027, 1, 11): ("Soldes d'hiver (mi-janvier) : les boutiques ont besoin d'être visibles.", {}),
    date(2027, 2, 8): ("Saint-Valentin (dim. 14 fév.) : restaurants et fleuristes au premier plan.", {"tiktok_lun": "Fleuriste (spécial Saint-Valentin)", "insta_mar": "« restaurant Saint-Valentin »"}),
    date(2027, 3, 1): ("Fête des grands-mères (dim. 7 mars) : fleuristes et chocolatiers.", {}),
    date(2027, 3, 22): ("Pâques (dim. 28 mars) : boulangeries et chocolatiers.", {"tiktok_lun": "Boulangerie-chocolaterie (spécial Pâques)"}),
    date(2027, 4, 26): ("Pont du 1er mai : rappelez aux commerçants de mettre leurs horaires à jour.", {"tiktok_jeu": "Horaires des jours fériés introuvables"}),
}


def build_week(w):
    """Les 14 posts de la semaine w (0 = semaine du 9 nov. 2026)."""
    k = w % CYCLE
    is_a = w % 2 == 0
    monday = START + timedelta(weeks=w)
    last_week_of_month = (monday + timedelta(days=7)).month != monday.month
    note, over = TEMPS_FORTS.get(monday, ("", {}))

    def mt(off):
        return m(w, off)

    posts = {
        ("tiktok", 0): dict(format="Le scroll satisfaisant", sujet=cap(mt(0)[0]),
                            accroche=f"« Le site {mt(0)[1]} {mt(0)[0]} quand c'est bien fait. »",
                            comment="Capture d'écran fluide (60 i/s) d'un site qui défile lentement, ou téléphone filmé en main devant un fond propre. Son tendance calme.",
                            duree="8–12 s", fin="« Le tien ressemble à ça ? Lien en bio. »"),
        ("insta", 0): dict(type="vitrine", format="Vitrine · Réalisation", sujet=f"Site {mt(4)[0]}",
                           accroche="Nom du commerce + 3 mots (ex. « Maison Lumière · Restaurant · Réservation en ligne »).",
                           comment="Carrousel de 3 visuels dans la DA : site sur ordi + téléphone, page mobile en grand, un détail.",
                           duree="Carrousel 3 visuels", fin="Légende : ce que le site apporte au commerce, puis « Ton site ? Lien en bio. »"),
        ("tiktok", 1): dict(format="Avant / Après", sujet=f"{AVANT[w % 4]} → nouveau site · {mt(2)[0]}",
                            accroche=f"« On a refait le site {mt(2)[1]} {mt(2)[0]}. »",
                            comment="L'« avant » 2 s, coupe sur le beat, nouveau site qui défile. Vrai client avec son accord, sinon site d'exemple.",
                            duree="10–15 s", fin="« Tu veux le même ? Écris SITE en commentaire. »"),
        ("insta", 1): dict(type="reel", format="POV : ton client te cherche sur Google", sujet=f"« {mt(6)[2]} près de moi »",
                           accroche="« POV : un client te cherche sur Google. »",
                           comment="Filmer l'écran du téléphone : recherche, clic sur le site, la page s'ouvre, belle et rapide. Texte à chaque étape.",
                           duree="10–15 s", fin="« C'est ce qu'il voit quand il te cherche ? Lien en bio. »"),
        ("tiktok", 2): dict(format="Un site en 60 secondes", sujet=cap(mt(8)[0]),
                            accroche=f"« On crée le site {mt(8)[1]} {mt(8)[0]} en 60 secondes. »",
                            comment="Enregistrer l'écran pendant la création, accélérer, finir sur 3 s du résultat qui défile.",
                            duree="30–60 s", fin="« Le prochain, c'est le tien ? Lien en bio. »"),
        ("insta", 2): dict(type="vitrine", format="Vitrine · Message fort", sujet=f"« {MESSAGES[k]} »",
                           accroche="La phrase en très gros, un mot en bleu.",
                           comment="Visuel typographique dans la DA, sans photo, pour rythmer la grille.",
                           duree="1 visuel", fin="Légende : la phrase développée en 3 lignes + « Lien en bio »."),
        ("tiktok", 3): dict(format="Les erreurs qui font fuir les clients", sujet=ERREURS[k],
                            accroche="« Si ton site fait ça, tu perds des clients. »",
                            comment="Face caméra avec l'exemple à l'écran derrière (fond vert TikTok ou capture). Rythme rapide.",
                            duree="20–35 s", fin="« Envoie-nous ton site en DM, on te dit ce qui cloche. »"),
        ("insta", 3): dict(type="reel", format="Le test du téléphone", sujet=TEST_TEL[(k + 5) % CYCLE],
                           accroche="« Ouvre ton site sur ton téléphone. Maintenant. »",
                           comment="Une main tient le téléphone : site mal adapté, puis site Review Maker fluide. Écran partagé possible.",
                           duree="8–15 s", fin="« Il a passé le test ? Lien en bio. »"),
        ("tiktok", 4): dict(format="Micro-trottoir commerçants", sujet=LIEUX[k],
                            accroche="« Est-ce que votre commerce a un site ? »",
                            comment="Commerçants du quartier, avec leur accord pour filmer : réponse, réaction, et 10 s de leur site possible.",
                            duree="20–40 s", fin="« Ton commerce n'a pas de site ? Lien en bio. »"),
        ("insta", 4): dict(type="vitrine", format="Vitrine · Fonctionnalité", sujet=FONCTIONS[(k + 3) % CYCLE],
                           accroche="Le nom de la fonctionnalité + ce qu'elle apporte au commerçant.",
                           comment="Visuel DA avec la capture du widget sur un site (comme dans la vidéo V4). Ne montrez que ce que vous savez livrer.",
                           duree="1 visuel ou carrousel 2", fin="Légende : pour quel métier c'est utile + « Lien en bio »."),
        ("tiktok", 5): dict(format="Objection du commerçant", sujet=OBJECTIONS[k],
                            accroche="La question telle que les commerçants la posent.",
                            comment="Face caméra, réponse franche en 3 points, texte à l'écran. Avec vos vrais tarifs et délais.",
                            duree="20–40 s", fin="« Une autre question ? Pose-la en commentaire. »"),
        ("insta", 5): dict(type="reel", format="La découverte du site", sujet=REACTIONS[w % 3],
                           accroche="« Sa réaction quand il découvre son site. »",
                           comment="Client qui découvre son site (avec son accord). Sans client cette semaine : transition ordi → téléphone sur un son tendance.",
                           duree="10–20 s", fin="« Le prochain, c'est toi ? Lien en bio. »"),
        ("tiktok", 6): dict(format="Les coulisses à deux", sujet=COULISSES[k],
                            accroche="« On est deux et on crée des sites pour les commerces de [ville]. »",
                            comment="Vlog rapide : plans courts de 1 s, Théo et Luke à l'écran.",
                            duree="15–25 s", fin="« Abonne-toi pour suivre les prochains. »"),
        ("insta", 6): dict(type="reel", format="Les sites de la semaine", sujet="Best-of du mois" if last_week_of_month else "Best-of de la semaine",
                           accroche="« Les sites de la semaine. »",
                           comment="Montage motion design dans la DA (comme la vidéo V4) : 3–4 sites qui défilent, calés sur la musique.",
                           duree="10–15 s", fin="« Ton site la semaine prochaine ? Lien en bio. »"),
    }
    slot_names = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
    out = []
    for d in range(7):
        for net in ("tiktok", "insta"):
            p = dict(posts[(net, d)])
            key = f"{net}_{slot_names[d]}"
            if key in over:
                p["sujet"] = over[key]
            theo_tiktok = d % 2 == 0
            theo = theo_tiktok if net == "tiktok" else not theo_tiktok
            owner = "Théo" if theo == is_a else "Luke"
            kind = "tiktok" if net == "tiktok" else p.get("type", "reel")
            out.append(dict(
                date=(monday + timedelta(days=d)).isoformat(), jour=JOURS[d], day=d, reseau="TikTok" if net == "tiktok" else "Instagram",
                kind=kind, type={"tiktok": "Marketing", "reel": "Marketing (Reel)", "vitrine": "Vitrine (grille)"}[kind],
                format=p["format"], sujet=p["sujet"], accroche=p["accroche"], comment=p["comment"], duree=p["duree"], fin=p["fin"],
                responsable=owner,
            ))
    return dict(index=w, lettre="A" if is_a else "B", lundi=monday.isoformat(), temps_fort=note, posts=out)


COLLAB_FORMATS = [
    ("« On a refait le site de ton business »", "Avant / après de son site + sa réaction, publié en post Collab Instagram."),
    ("Le resto préféré d'un influenceur food", "Il présente son restaurant préféré de la ville, on crée le site du resto. Parfait pour les fêtes."),
    ("« Tu lances ta marque ? On t'a fait le site »", "Janvier = lancements de l'année. Stitch / duo TikTok avec la maquette, publié avec son accord."),
    ("On crée le site avec lui", "Vlog de 30 s : il choisit les couleurs et les photos avec vous."),
    ("Micro-influenceur local + programme ambassadeur", "Compte local de 5 000 à 50 000 abonnés, puis un lien ou code perso avec commission."),
    ("« On a refait le site de ton business » (saison 2)", "Même format que novembre avec un nouveau créateur, en s'appuyant sur ce qui a le mieux marché."),
]
ETAPES = [
    ("Repérage + DM", "Repérer 10 créateurs qui ont un business, regarder leur site, envoyer la séquence influenceurs."),
    ("Appel + accord écrit", "Appel avec ceux qui répondent. Accord écrit : format, date, mention, droit de réutiliser les images, mention « collaboration commerciale »."),
    ("Création + tournage", "Création du site. Tournage : l'avant, la création, la réaction."),
    ("Publication", "Post Collab Instagram + TikTok le même jour, story avec le lien chez le créateur. Répondre aux commentaires dans l'heure."),
]


def build_collabs():
    rows = []
    months = [(2026, 11), (2026, 12), (2027, 1), (2027, 2), (2027, 3), (2027, 4)]
    for i, (y, mo) in enumerate(months):
        owner = "Théo" if mo % 2 == 1 else "Luke"
        first = date(y, mo, 1)
        # premier lundi du mois (ou le 9 nov. pour le premier mois)
        monday = first + timedelta(days=(7 - first.weekday()) % 7)
        if (y, mo) == (2026, 11):
            monday = START
        fmt, detail = COLLAB_FORMATS[i]
        for s, (etape, txt) in enumerate(ETAPES):
            a = monday + timedelta(weeks=s)
            rows.append(dict(mois=f"{MOIS[mo - 1]} {y}", responsable=owner, format=fmt, format_detail=detail,
                             etape=f"Semaine {s + 1} · {etape}", debut=a.isoformat(), fin=(a + timedelta(days=6)).isoformat(), detail=txt))
    return rows


SEQ_INFLU = [
    (1, 0, "DM Instagram", "", "Salut {{firstName}} ! On suit ce que tu fais avec {{companyName}}, c'est top.\nOn est Théo et Luke de Review Maker, on crée des sites pour les commerces et les marques.\nOn a regardé ton site et on a plein d'idées pour le rendre encore plus beau (et mieux trouvé sur Google).\nOn te propose de te le refaire et de filmer la création + ta réaction, pour un post en collab.\nÇa te dit qu'on t'envoie une maquette ?"),
    (2, 3, "DM Instagram", "", "Re {{firstName}} ! Pour que tu voies à quoi ça ressemblerait, voici un aperçu de la page d'accueil qu'on imagine pour {{companyName}} 👇\n[capture de la maquette]\nDis-nous si ça te parle, on peut en discuter 10 min cette semaine."),
    (3, 7, "Email (si disponible)", "Une idée pour le site de {{companyName}}", "Bonjour {{firstName}},\n\nJe vous ai écrit sur Instagram, je me permets de vous recontacter ici.\nAvec Luke, on crée des sites pour les commerces et les marques (Review Maker). On aimerait refaire celui de {{companyName}} et filmer la création pour un post en collaboration.\n\nVous trouverez la maquette de la page d'accueil en pièce jointe. Si l'idée vous plaît, on peut s'appeler 10 minutes.\n\nBelle journée,\nThéo – Review Maker"),
    (4, 14, "DM Instagram", "", "Dernier message promis {{firstName}} 🙂 Si ce n'est pas le bon moment, aucun souci. La proposition reste valable si tu changes d'avis, et on continuera à suivre {{companyName}} !"),
]
SEQ_COMMERCANTS = [
    (1, 0, "DM Instagram / Email", "Le site de {{companyName}}", "Bonjour {{firstName}},\n\nJe suis tombé sur {{companyName}} en cherchant un(e) {{metier}} à {{city}}. Vos clients ont l'air ravis, mais en ligne on ne trouve [pas de site / un site difficile à lire sur téléphone].\n\nAvec Luke, on crée des sites pour les commerces (Review Maker) : beaux, pensés pour le téléphone et faciles à trouver sur Google.\nOn a préparé un aperçu de ce que pourrait être le vôtre. Je vous l'envoie ?\n\nThéo – Review Maker"),
    (2, 3, "DM Instagram / Email", "Re : le site de {{companyName}}", "Re {{firstName}},\n\nVoici l'aperçu dont je vous parlais 👇\n[capture de la maquette]\n\nEn 30 secondes, on vous montre comment vos clients vous trouveraient sur Google et réserveraient depuis leur téléphone. Ça vous dit d'en parler 10 minutes ?"),
    (3, 7, "DM Instagram / Email", "Avant / après", "Bonjour {{firstName}},\n\nPour vous donner une idée concrète, voici une vidéo avant / après d'un site qu'on a refait : [lien vers votre vidéo avant / après].\nOn peut faire la même chose pour {{companyName}}. Je vous appelle quand ?"),
    (4, 14, "DM Instagram / Email", "Je ne vous embête plus", "Bonjour {{firstName}},\n\nJe ne veux pas vous déranger plus longtemps : si ce n'est pas le moment, aucun souci.\nLe jour où vous voulez un site pour {{companyName}}, répondez simplement à ce message.\n\nBonne continuation,\nThéo – Review Maker"),
]


def write_csv(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def ics_escape(s):
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    b = line.encode("utf-8")
    out, cur = [], b""
    for ch in line:
        c = ch.encode("utf-8")
        if len(cur) + len(c) > 73:
            out.append(cur.decode("utf-8"))
            cur = b" " + c
        else:
            cur += c
    out.append(cur.decode("utf-8"))
    return "\r\n".join(out)


def main():
    os.makedirs(OUT, exist_ok=True)
    weeks = [build_week(w) for w in range(WEEKS)]
    collabs = build_collabs()

    # page planning
    with open(os.path.join(ROOT, "weeks.json"), "w", encoding="utf-8") as f:
        json.dump(dict(weeks=weeks, collabs=collabs), f, ensure_ascii=False)

    # 1. calendrier des publications
    rows = []
    for wk in weeks:
        for p in wk["posts"]:
            rows.append([p["date"], p["jour"], f"S{wk['index'] + 1} ({wk['lettre']})", p["reseau"], p["type"], p["format"], p["sujet"],
                         p["accroche"], p["comment"], p["duree"], p["fin"], p["responsable"],
                         "18:00" if p["reseau"] == "TikTok" else "12:00", wk["temps_fort"], "À faire"])
    write_csv(os.path.join(OUT, "01_calendrier_publications.csv"),
              ["Date", "Jour", "Semaine", "Réseau", "Type", "Format", "Sujet", "Accroche", "Comment le tourner", "Durée",
               "Fin (appel à l'action)", "Responsable", "Heure conseillée", "Temps fort", "Statut"], rows)

    # 2. collabs
    write_csv(os.path.join(OUT, "02_collabs_influenceurs.csv"),
              ["Mois", "Responsable", "Format de collab", "Description du format", "Étape", "Début", "Fin", "Détail", "Statut"],
              [[c["mois"], c["responsable"], c["format"], c["format_detail"], c["etape"], c["debut"], c["fin"], c["detail"], "À faire"] for c in collabs])

    # 3–4. séquences
    for name, seq in [("03_sequence_influenceurs.csv", SEQ_INFLU), ("04_sequence_commercants.csv", SEQ_COMMERCANTS)]:
        write_csv(os.path.join(OUT, name), ["Étape", "Délai (jours après le 1er message)", "Canal", "Objet (email)", "Message"],
                  [list(s) for s in seq])

    # 5–6. modèles de listes (en-têtes seulement)
    write_csv(os.path.join(OUT, "05_modele_liste_influenceurs.csv"),
              ["firstName", "lastName", "pseudo", "reseau", "lienProfil", "abonnes", "companyName", "siteActuel", "city", "email",
               "statut", "responsable", "moisCollab", "notes"], [])
    write_csv(os.path.join(OUT, "06_modele_liste_commercants.csv"),
              ["firstName", "lastName", "companyName", "metier", "city", "adresse", "phone", "email", "instagram",
               "siteActuel (aucun / obsolète / correct)", "statut", "responsable", "notes"], [])

    # 7. calendrier .ics (Google Agenda, Outlook, Apple)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Review Maker//Planning contenu//FR", "CALSCALE:GREGORIAN",
             "X-WR-CALNAME:Review Maker · Planning contenu", "X-WR-TIMEZONE:Europe/Paris"]
    for wk in weeks:
        for i, p in enumerate(wk["posts"]):
            d = p["date"].replace("-", "")
            hour = "1800" if p["reseau"] == "TikTok" else "1200"
            desc = f"Sujet : {p['sujet']}\nAccroche : {p['accroche']}\nComment : {p['comment']}\nDurée : {p['duree']}\nFin : {p['fin']}"
            if wk["temps_fort"]:
                desc += f"\nTemps fort : {wk['temps_fort']}"
            lines += ["BEGIN:VEVENT", f"UID:rm-post-{d}-{i}@reviewmaker", f"DTSTAMP:{stamp}",
                      f"DTSTART;TZID=Europe/Paris:{d}T{hour}00", f"DTEND;TZID=Europe/Paris:{d}T{hour[:2]}3000",
                      fold("SUMMARY:" + ics_escape(f"[{p['responsable']}] {p['reseau']} · {p['format']}")),
                      fold("DESCRIPTION:" + ics_escape(desc)), "END:VEVENT"]
    for j, c in enumerate(collabs):
        a = c["debut"].replace("-", "")
        b = (date.fromisoformat(c["fin"]) + timedelta(days=1)).isoformat().replace("-", "")
        lines += ["BEGIN:VEVENT", f"UID:rm-collab-{j}@reviewmaker", f"DTSTAMP:{stamp}", f"DTSTART;VALUE=DATE:{a}", f"DTEND;VALUE=DATE:{b}",
                  fold("SUMMARY:" + ics_escape(f"[{c['responsable']}] Collab influenceur · {c['etape']}")),
                  fold("DESCRIPTION:" + ics_escape(f"{c['format']}\n{c['detail']}")), "END:VEVENT"]
    lines.append("END:VCALENDAR")
    with open(os.path.join(OUT, "07_planning_agenda.ics"), "w", encoding="utf-8", newline="") as f:
        f.write("\r\n".join(lines) + "\r\n")
    print(len(rows), "posts,", len(collabs), "étapes de collab")


if __name__ == "__main__":
    main()
