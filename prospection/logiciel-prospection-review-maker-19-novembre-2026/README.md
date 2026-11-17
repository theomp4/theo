# Logiciel de prospection Review Maker

Une **application pour Mac et Windows**, avec l'icône Review Maker : elle s'ouvre dans **sa propre
fenêtre**, sans navigateur (ni Chrome, ni Safari). Elle fait deux choses, simplement : **trouver des
commerces** (avec une **note de priorité sur 100**, leur email et leur Instagram) et **suivre tes
prospects** jusqu'à la vente. Le logiciel n'envoie rien tout seul : chaque fiche te prépare un email,
un message Instagram et un **audit PDF** aux couleurs de Review Maker, que tu envoies toi-même.

Deux espaces, en haut de l'écran : **Sites internet** (affiché en premier) et **Tags NFC** (Review Maker). Chaque espace a ses
propres prospects et ses chiffres. Le fond d'écran est une vraie photo, à choisir avec le bouton « Fond »
(les photos se téléchargent la première fois, il faut Internet).

Aucun abonnement. Tes données restent dans le dossier `data` de ton ordinateur.

---

## 1. Installer (une seule fois, environ 15 minutes)

1. Télécharge le ZIP du logiciel (son nom donne la date de la version) et décompresse-le
   (double-clic sur Mac ; clic droit > **Extraire tout** sur Windows). Range le dossier dans Documents.
2. Lance l'installation :
   - **Mac** : clic droit sur **`Lancer Review Maker.command`** > **Ouvrir** > **Ouvrir** (le premier
     lancement doit se faire par clic droit). Si Python manque, son installateur officiel s'ouvre :
     va jusqu'au bout, puis relance `Lancer Review Maker.command`.
   - **Windows** : double-clic sur **`Lancer Review Maker.bat`** (si Windows affiche « Windows a protégé
     votre ordinateur » : **Informations complémentaires** > **Exécuter quand même**).
3. La première fois, tout s'installe tout seul (5 à 10 minutes), puis **l'application Review Maker
   s'ouvre**.
4. Ensuite, ouvre-la comme n'importe quelle application :
   - **Mac** : **Review Maker** est dans ton dossier **Applications** (et un raccourci sur le Bureau).
     Fais-la glisser dans le Dock pour l'ouvrir en un clic.
   - **Windows** : icône **Review Maker** sur le Bureau et dans le menu Démarrer (clic droit >
     **Épingler à la barre des tâches**).
5. Va dans **Réglages > Tes coordonnées** : prénom, nom, email et téléphone. Ils s'affichent sur tes
   audits PDF et dans ta signature. Chacun remplit les siens sur son ordinateur.

Fermer la fenêtre ferme le logiciel. Les audits et les exports Excel sont rangés dans
**Documents > ReviewMaker** (dossiers Audits et Exports) et s'ouvrent tout seuls.
Si la fenêtre d'application ne peut pas s'ouvrir (composant manquant), le logiciel s'ouvre dans ton
navigateur, comme avant. Les messages d'erreur éventuels sont notés dans `data/journal.txt`.

---

## 2. Créer ta clé Google (une seule fois, environ 20 minutes)

Le logiciel utilise l'**API officielle Google Places**, pas le « scraping » de Google Maps
(qui est interdit par les conditions de Google et vite bloqué). Google offre chaque mois un
quota de requêtes gratuites ; au-delà, c'est payant. Le logiciel compte tes requêtes et
s'arrête avant ta limite.

1. Va sur https://console.cloud.google.com et connecte-toi avec ton compte Google.
2. En haut, clique sur le sélecteur de projet > **Nouveau projet**. Nom : `Review Maker Prospection`. Crée-le.
3. Google te demande d'activer la facturation : ajoute une carte bancaire. Elle sert seulement
   si tu dépasses le quota gratuit, ce que le logiciel t'empêche de faire.
4. Dans la barre de recherche en haut, tape **Places API (New)**, ouvre-la et clique sur **Activer**.
5. Menu > **API et services** > **Identifiants** > **Créer des identifiants** > **Clé API**.
   Copie la clé (elle commence par `AIza`).
6. Clique sur la clé pour la modifier : dans **Restrictions d'API**, choisis **Restreindre la clé**
   et coche uniquement **Places API (New)**. Enregistre.
7. **Sécurité anti-facture** : Menu > **API et services** > **Places API (New)** > onglet **Quotas**.
   Mets la limite de « Text Search requests per day » à **30** par jour. Google bloquera
   tout au-delà, même en cas d'erreur.
8. Optionnel : Menu > **Facturation** > **Budgets et alertes** > crée un budget de **1 €**
   pour être prévenu par email au moindre centime.
9. Vérifie le quota gratuit actuel sur la page des tarifs Google Maps Platform
   (ligne « Text Search Enterprise », car le logiciel demande la note et le nombre d'avis),
   et règle la **limite mensuelle** du logiciel juste en dessous (900 par défaut).
10. Dans le logiciel : **Réglages** > colle la clé dans « Clé API Google Places » > **Enregistrer**.

---

## 3. Utiliser le logiciel au quotidien

Choisis d'abord l'espace en haut de l'écran : **Tags NFC** ou **Sites internet**. Le menu est la colonne
à gauche : Accueil, Trouver, Prospects, Réglages.

**Raccourcis clavier** : touches `1` à `6` pour changer de page, `/` pour chercher un prospect.
Dans une fiche : `←` `→` pour passer au commerce précédent ou suivant, `Échap` pour fermer.

**Le plus rapide pour prospecter** : sur l'Accueil, clique sur **Contacter le meilleur prospect**.
La fiche s'ouvre : appelle ou écris, clique sur « J'ai contacté par… » (statut, historique et relance
sont faits pour toi), puis `→` pour le commerce suivant. Tout s'enregistre tout seul.

### Trouver des commerces (icône loupe)

1. Choisis le **pays** (la langue des messages s'adapte) et tape une ville
   (ex. `Lyon 3e`, `Bruxelles`, `London`).
2. Choisis les types de commerces.
3. Clique sur **Lancer la recherche**. Chaque type rapporte jusqu'à 60 commerces (3 requêtes).
4. L'étape 2 se lance toute seule (case cochée sous le bouton ; sinon, clique sur **Vérifier et
   analyser**) :
   - **l'entreprise** est vérifiée dans l'annuaire officiel des entreprises : le logiciel garde
     seulement les **PME qui font au moins 200 000 € de chiffre d'affaires** par an (montant réglable
     dans Réglages). Les autres passent en **Hors cible** ;
   - pour les entreprises retenues, **son site** est visité : email, Instagram et une analyse de base
     de ce qui ne va pas (voir plus bas).

Au Canada, en Allemagne, en Espagne, en Italie et en Australie, la loi demande un accord avant
d'envoyer un email de prospection : contacte ces commerces par téléphone ou Instagram.

### Le score sur 100 · Tags NFC

| Critère | Points | Pourquoi |
| --- | --- | --- |
| Nombre d'avis | jusqu'à 40 | Moins de 80 avis = beaucoup à gagner. Au-delà de 600, le commerce n'a presque plus besoin de toi. |
| Note Google | jusqu'à 30 | Entre 3,5 et 4,2 = cible idéale : quelques avis positifs font vite remonter la note. |
| Type de commerce | jusqu'à 20 | Restaurants, coiffeurs, beauté, cafés : passage en caisse et choix du client guidé par les avis. |
| Joignable | jusqu'à 10 | Téléphone, site, email trouvé. |

### Le score sur 100 · Sites internet

| Critère | Points | Pourquoi |
| --- | --- | --- |
| Pas de site (ou juste une page Facebook/Instagram) | 45 | Le besoin est évident. |
| Site dépassé | jusqu'à 45 | Non sécurisé, pas adapté au téléphone, lent, pas mis à jour depuis 3 ans. |
| Bonne réputation | jusqu'à 40 | Bonne note et beaucoup d'avis : des clients qui le cherchent sur Google. |
| Type et contact | jusqu'à 10 | Garages, artisans… et téléphone ou email trouvé. |

Un commerce fermé reçoit 0. Au-dessus de 75 : **priorité haute**, à contacter en premier.
Chaque fiche explique son score en une phrase.

### PME vérifiées : comment le logiciel décide

L'annuaire officiel (recherche-entreprises.api.gouv.fr, gratuit, sans clé) donne la catégorie
de l'entreprise (PME, ETI, grande entreprise), son effectif et le chiffre d'affaires de ses
derniers comptes publiés.

| Ce que dit l'annuaire | Dans le logiciel |
| --- | --- |
| PME, chiffre d'affaires publié ≥ 200 000 € | **PME vérifiée** (bonus de score) |
| PME, comptes non publiés, 3 salariés ou plus | **PME probable** (sans doute au-dessus de 200 000 €) |
| Comptes non publiés, moins de 3 salariés, ou entreprise introuvable | **CA à vérifier** (score baissé) |
| Chiffre d'affaires < 200 000 €, ETI, grande entreprise, entrepreneur individuel sans salarié | **Hors cible** (score 0, onglet « Hors cible ») |

- Beaucoup de petites entreprises gardent leurs comptes confidentiels : c'est pour ça que
  l'effectif sert d'estimation, et la fiche le dit.
- Si le logiciel s'est trompé d'entreprise (même nom, autre société), ouvre la fiche > **L'entreprise**
  > « Ce n'est pas la bonne entreprise ? » et tape son **SIREN** (dans ses mentions légales ou sur
  annuaire-entreprises.data.gouv.fr).
- La vérification ne marche que pour la France : ailleurs, la fiche affiche « À vérifier ».

### L'analyse du site et l'audit en PDF

Pour chaque site, le logiciel lit la page d'accueil et relève ce qui fait perdre des clients :
site non sécurisé, pas adapté au téléphone, lent, pas mis à jour, titre et description Google,
bouton pour appeler, mentions légales (obligatoires), horaires, plan d'accès, image de partage,
informations lisibles par Google, images sans description. Chaque point est classé
**Urgent**, **Important** ou **À améliorer**.

- Dans la fiche, le bloc **Son site internet** liste ces points avec une note sur 100.
- L'**email** et le **message Instagram** reprennent les 3 points les plus graves et annoncent
  l'audit gratuit.
- **Télécharger l'audit (PDF)** crée un document de 1 à 3 pages au nom du commerce, dans la charte de
  reviewmaker.fr (logo, bleu Review Maker, police Poppins) : la note du site, ce qui a été vérifié,
  chaque problème avec pourquoi il compte et comment le corriger, puis la proposition « Voyez votre site
  avant de payer » avec les deux formules (site vitrine, boutique en ligne : prix et délai des Réglages)
  et **ton contact** (prénom, nom, email, téléphone des Réglages). **Joins-le à ton email.**
- **Refaire l'analyse** relit le site (utile pour les sites analysés par une ancienne version).

L'analyse ne regarde que la page d'accueil : le document le précise.

### Suivre tes prospects (icône personnes)

- La liste est triée du meilleur prospect au moins bon. Les onglets en haut à droite filtrent :
  Tous, Sans site, À contacter, En cours, Vendus, Hors cible. Sous chaque nom : PME vérifiée, PME
  probable ou CA à vérifier. Tu peux aussi chercher un nom dans la barre du haut.
- Clique sur **Exporter en Excel** pour l'avoir dans un tableur.
- Clique sur un commerce pour ouvrir sa **fiche** : score expliqué, téléphone, **email modifiable**,
  un **email prêt à envoyer** (bouton « Ouvrir dans ma boîte mail ») et un **message Instagram prêt
  à copier**, puis le suivi : statut, date de relance, notes et historique.
- Après chaque appel ou message, note-le dans la fiche (« J'ai contacté par ») : il compte dans le
  graphique de l'Accueil.
- Quand un commerce achète, passe-le en **Vendu** : il compte dans tes ventes.
- L'**Accueil** montre tes chiffres, les commerces contactés par semaine, où en sont tes prospects,
  ton quota Google et les **relances du jour**.

### Reprises de commerces et marchés publics (dans « Mes prospects »)

Deux sources gratuites et officielles de clients qui ont un besoin, en plus de Google Maps :

**Onglet Reprises** : les commerces qui viennent d'être rachetés, d'après les annonces officielles
du BODACC (journal des annonces légales). Un nouveau propriétaire refait presque toujours son image,
et le commerce a déjà des clients.

1. Tape tes départements (ex. `69, 01, 38`) et combien de reprises ajouter, puis **Chercher les
   reprises** (annonces des 45 derniers jours ; restaurants, coiffeurs, beauté, commerces de bouche…
   d'abord).
2. Pour chaque reprise, le logiciel retrouve le commerce sur Google (1 requête de ton quota), l'ajoute
   à tes prospects, vérifie le chiffre d'affaires de **l'ancien exploitant** (la société du repreneur
   est souvent toute neuve) et analyse son site.
3. La fiche affiche « Commerce repris le … » avec le lien vers l'annonce, et l'email commence par
   **« Félicitations pour la reprise de… »**, suivi de l'analyse et de l'audit gratuit.

**Onglet Marchés publics** : les demandes officielles de création ou de refonte de site publiées au
BOAMP (mairies, offices de tourisme, écoles, hôpitaux…). Consulter et répondre est gratuit.

- Le logiciel relit le BOAMP toutes les 6 heures (bouton **Actualiser** pour le faire tout de suite).
- Les créations et refontes passent devant la simple maintenance ; chaque carte indique le nombre de
  jours pour répondre, et **Dans tes départements** quand c'est près de chez toi.
- **Voir l'avis officiel** ouvre l'annonce : elle indique les pièces à fournir et où déposer ton dossier.
  Note le suivi : À étudier, Candidaté, Gagné, Perdu, Pas pour nous.
- Il y en a peu (quelques-unes par semaine en France) et le dossier est plus long qu'un email :
  privilégie les « procédures adaptées ».

### Marketing (icône calendrier, touche 4)

La rubrique marketing est dans le logiciel, à côté de tes prospects :

- **Planning** : 26 semaines (9 nov. 2026 → 9 mai 2027), **un contenu par jour**, le même publié sur
  TikTok et sur Instagram. Les jours alternent entre Théo et Luke (91 chacun). Pour chaque contenu :
  le format, le sujet, l'accroche, comment le tourner, la durée et la phrase de fin. Clique sur
  **Marquer comme publié** quand il est en ligne. Les compteurs montrent l'avancement de chacun et
  les contenus en retard.
- **Collabs influenceurs** : une collab par mois, en 4 étapes datées, à cocher au fur et à mesure.
- **Messages** : les séquences pour les créateurs et pour les commerçants, à copier.

Le planning est dans `web/marketing/planning.json`. Les cases cochées sont dans `data/prospection.db`,
sur ton ordinateur : elles ne sont pas partagées avec ton coéquipier (chacun coche ses propres contenus).

### Journal de l'équipe (icône carnet, touche 5)

Pour savoir ce que l'autre a fait quand tu n'étais pas là :

- Écris en une ou deux phrases ce que tu as fait (« Appelé 8 garages à Lyon 7e, 2 intéressés »),
  choisis **Théo** ou **Luke**, puis **Ajouter la note** (ou Ctrl + Entrée, Cmd + Entrée sur Mac).
- Les notes s'affichent du plus récent au plus ancien, par jour, avec le prénom et l'heure.
  Les onglets **Tous / Théo / Luke** filtrent.
- Les notes passent par le **dossier Google Drive commun** (Réglages > Travail en équipe), comme les
  prospects : ton coéquipier les reçoit en quelques secondes.
- Une **pastille** sur l'icône Journal compte les notes de ton coéquipier depuis ta dernière visite ;
  elles sont marquées **Nouveau**.
- Passe la souris sur une note pour la **modifier** ou la **supprimer** (la modification arrive aussi
  chez l'autre).

### Réglages utiles

- **Google** : ta clé et la limite de requêtes par mois.
- **Fond d'écran** : 6 photos ou « Aurore violette ».
- **Messages Instagram**, **signature**, **prix et délai d'un site** : utilisés dans les messages prêts à copier.

---

## Travailler à deux (partage avec un coéquipier)

Toi et ton coéquipier voyez les mêmes prospects. Chaque ordinateur garde sa propre base ; le logiciel
dépose une copie de vos fiches dans un dossier Google Drive commun et récupère celles de l'autre
toutes les 10 secondes environ.

**Une seule fois, sur chaque ordinateur :**

1. Installe **Google Drive pour ordinateur** (google.com/drive/download) et connecte-toi avec le compte
   Google que vous partagez. Ton Drive apparaît dans l'Explorateur, en général `G:\Mon Drive`.
2. Sur le premier ordinateur seulement : dans `G:\Mon Drive`, crée un dossier **Review Maker équipe**.
   Il apparaît tout seul sur l'autre ordinateur au bout d'une minute.
3. Dans le logiciel : **Réglages → Travail en équipe**. Mets ton prénom, clique sur **Choisir…** et
   sélectionne le dossier **Review Maker équipe**, puis **Enregistrer les réglages**.

En haut de l'écran, la pastille verte « Partagé avec … » confirme que tout fonctionne.

- Si vous modifiez la même fiche, chaque champ (statut, notes, relance, email) garde la modification la
  plus récente. La fiche indique « Modifié par … » et l'historique dit qui a fait quoi.
- Si vous aviez déjà des prospects chacun de votre côté, ils sont réunis automatiquement.
- Ne mets jamais le dossier `data` du logiciel dans Google Drive : seule la copie dans
  « Review Maker équipe » doit y être.
- Les recherches Google comptent sur la clé de chacun : vous pouvez utiliser la même clé.
- Après une mise à jour, chacun n'apparaît qu'une fois dans « Partagé avec » : les fichiers laissés
  dans le dossier par tes anciennes versions sont retirés tout seuls après 2 jours.

## 4. Règles légales intégrées

- **Google** : seul l'identifiant du commerce est conservé durablement. Les autres données Google
  (adresse, téléphone, note…) sont effacées après 30 jours ; relance une recherche pour les rafraîchir.
  Ton suivi (statut, notes, email trouvé) est toujours conservé.
- **RGPD / CNIL** : l'email de prospection à un professionnel est autorisé sans accord préalable s'il
  concerne son activité. Dis qui tu es et propose de répondre STOP. Si quelqu'un refuse, passe sa fiche
  en « Ne plus contacter ».
- Les données restent sur ton ordinateur. Pense à sauvegarder le dossier `data` (clé USB, Google Drive).

## 5. En cas de problème

| Problème | Solution |
| --- | --- |
| « Python n'a pas pu être installé » | Installe-le depuis python.org en cochant « Add python.exe to PATH », puis relance `Lancer Review Maker.bat`. |
| L'application ne s'ouvre pas | Relance `Lancer Review Maker` (.command sur Mac, .bat sur Windows) : il affiche l'erreur et ouvre le logiciel dans le navigateur à la place. Le détail est dans `data/journal.txt`. |
| « Google a répondu 403 » | La clé est mauvaise ou l'API Places (New) n'est pas activée. |
| Pas de photo en fond | Il faut Internet la première fois pour la télécharger ; en attendant, le fond « Aurore violette » s'affiche. |
| La pastille dit « Partage en pause » | Google Drive n'est pas ouvert sur cet ordinateur, ou le dossier a été déplacé : rechoisis-le dans Réglages. |
| Mettre à jour le logiciel | Chaque version a son propre dossier, nommé avec sa date (ex. `logiciel-prospection-review-maker-3-novembre-2026-v2`). Décompresse le nouveau ZIP **à côté** de l'ancien dossier, puis double-clique sur `Lancer Review Maker.bat` dans le nouveau : tes prospects et réglages sont repris automatiquement. Tu pourras supprimer l'ancien dossier ensuite. |
