# Review Maker · Dossier prospection et contenu (9 nov. 2026 → 9 mai 2027)

Tous les fichiers sont en CSV (UTF-8, séparateur virgule), le format que la plupart des logiciels de prospection et des CRM savent importer (lemlist, Waalaxy, La Growth Machine, HubSpot, Pipedrive, Notion, Airtable, Google Sheets…).

| Fichier | Contenu | Où l'importer |
|---|---|---|
| `01_calendrier_publications.csv` | Les 364 posts des 26 semaines : date, réseau, type, format, sujet, accroche, comment le tourner, durée, fin, responsable, heure conseillée, temps fort, statut | Outil de gestion de tâches ou CRM (en tâches), ou Google Sheets |
| `02_collabs_influenceurs.csv` | Les 6 collabs du semestre (une par mois), découpées en 4 étapes datées | Pipeline / tâches du logiciel |
| `03_sequence_influenceurs.csv` | Séquence de 4 messages pour les créateurs (J0, J+3, J+7, J+14) | Modèles de séquence / campagne |
| `04_sequence_commercants.csv` | Séquence de 4 messages pour les commerçants (J0, J+3, J+7, J+14) | Modèles de séquence / campagne |
| `05_modele_liste_influenceurs.csv` | En-têtes vides pour la liste de créateurs à contacter | Import de prospects |
| `06_modele_liste_commercants.csv` | En-têtes vides pour la liste de commerçants à contacter | Import de prospects |
| `07_planning_agenda.ics` | Les 364 posts + les étapes de collab sous forme d'événements | Google Agenda, Outlook ou Apple Calendrier (Importer) |

## Variables dans les messages

Les séquences utilisent `{{firstName}}`, `{{companyName}}`, `{{city}}` et `{{metier}}`. Ce sont les noms de variables les plus courants. Si votre logiciel en utilise d'autres (par exemple `{prenom}` ou `[[firstName]]`), faites un « rechercher / remplacer » avant l'import. Les colonnes des fichiers 05 et 06 portent les mêmes noms, pour que les variables se remplissent toutes seules.

Les passages entre crochets (`[capture de la maquette]`, `[lien vers votre vidéo avant / après]`, `[pas de site / un site difficile à lire sur téléphone]`) sont à remplacer à la main pour chaque prospect.

## Rotation Théo / Luke

- Semaine A (paire) : Théo fait les TikTok du lundi, mercredi, vendredi et dimanche, plus l'Instagram du mardi, jeudi et samedi. Luke fait l'inverse.
- Semaine B : on échange.
- Sur les 26 semaines : 182 posts chacun, avec autant de TikTok, de Reels et de vitrines pour les deux.
- Collabs : Théo les mois impairs (nov., janv., mars), Luke les mois pairs (déc., févr., avr.).

## À compléter avant d'utiliser

- Remplacer `[ville]` dans les accroches.
- Répondre aux objections avec vos vrais tarifs et délais.
- Filmer les commerçants et les clients seulement avec leur accord.
- Signaler toute collab rémunérée ou en échange d'un site comme « collaboration commerciale ».

## Régénérer le dossier

`python3 prospection/scripts/generer_dossier.py` (depuis la racine du dépôt) recrée tous les fichiers à partir des listes de sujets du script.
