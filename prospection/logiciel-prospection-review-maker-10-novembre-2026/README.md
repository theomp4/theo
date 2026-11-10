# Logiciel de prospection Review Maker

Une petite application qui tourne **sur ton ordinateur Windows** et s'ouvre dans ton navigateur.
Elle fait deux choses, simplement : **trouver des commerces** (partout dans le monde, avec une
**note de priorité sur 100**, leur email et leur Instagram) et **suivre tes prospects** jusqu'à la vente.
Le logiciel n'envoie rien tout seul : chaque fiche te prépare un email et un message Instagram à copier,
que tu envoies toi-même depuis ta boîte mail ou ton téléphone.

Deux espaces, en haut de l'écran : **Sites internet** (affiché en premier) et **Tags NFC** (Review Maker). Chaque espace a ses
propres prospects et ses chiffres. Le fond d'écran est une vraie photo, à choisir avec le bouton « Fond »
(les photos se téléchargent la première fois, il faut Internet).

Aucun abonnement. Tes données restent dans le dossier `data` de ton ordinateur.

---

## 1. Installer (une seule fois, environ 15 minutes)

### Étape 1 : récupérer le logiciel

1. Télécharge le fichier ZIP du logiciel (son nom donne la date de la version) que Claude t'a envoyé.
2. Fais un clic droit dessus > **Extraire tout** > **Extraire**.
3. Déplace le dossier `prospection` sur ton Bureau (ou dans Documents).

### Étape 2 : double-cliquer sur « Lancer Review Maker »

1. Ouvre le dossier `prospection` et double-clique sur **`Lancer Review Maker.bat`**.
2. Si Windows affiche « Windows a protégé votre ordinateur », clique sur **Informations complémentaires**
   puis **Exécuter quand même** (c'est normal pour un fichier que tu as téléchargé toi-même).
3. La première fois, une fenêtre noire installe tout toute seule (Python, puis le logiciel) :
   compte 5 à 10 minutes. Si Windows demande une autorisation pour Python, clique sur **Oui**.
4. Ton navigateur s'ouvre sur le logiciel, et une icône **Logiciel de prospection Review Maker** (loupe violette) apparaît sur ton Bureau.
   Le logiciel débloque aussi ses fichiers : l'avertissement « Éditeur inconnu » de Windows ne
   revient plus.

Les fois suivantes, double-clique simplement sur l'icône **Logiciel de prospection Review Maker** du Bureau : le logiciel
s'ouvre en quelques secondes, sans fenêtre noire. Quand tu as fini, ferme simplement la page :
le logiciel s'arrête tout seul dans les secondes qui suivent (une recherche en cours va toujours
jusqu'au bout). Les messages d'erreur éventuels sont notés dans `data\journal.txt`.

### Sur Mac

1. Double-clique sur le ZIP : le Mac crée le dossier du logiciel. Range-le dans Documents.
2. Dans ce dossier, fais un **clic droit** sur **`Lancer Review Maker.command`** > **Ouvrir** > **Ouvrir**.
   (Le premier lancement doit se faire par clic droit : sinon le Mac dit « développeur non identifié ».)
   Si le Mac refuse quand même : **Réglages Système** > **Confidentialité et sécurité** > en bas,
   **Ouvrir quand même**.
3. La première fois, si Python n'est pas installé, son installateur officiel s'ouvre : clique sur
   **Continuer** jusqu'à la fin (ton mot de passe Mac est demandé), puis relance
   `Lancer Review Maker.command`. L'installation du logiciel prend ensuite 3 à 5 minutes.
4. Ton navigateur s'ouvre sur le logiciel, et un raccourci **Logiciel de prospection Review Maker**
   apparaît sur ton Bureau : utilise-le les fois suivantes.
5. **Laisse la fenêtre du Terminal ouverte** pendant que tu utilises le logiciel : c'est lui qui tourne
   dedans. Si le logiciel s'arrête à cause d'une erreur, elle s'affiche dans cette fenêtre.

N'ouvre pas `Lancer Review Maker.bat` sur Mac : c'est le lanceur pour Windows.

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

**Raccourcis clavier** : touches `1` à `5` pour changer de page, `/` pour chercher un prospect.
Dans une fiche : `←` `→` pour passer au commerce précédent ou suivant, `Échap` pour fermer.

**Le plus rapide pour prospecter** : sur l'Accueil, clique sur **Contacter le meilleur prospect**.
La fiche s'ouvre : appelle ou écris, clique sur « J'ai contacté par… » (statut, historique et relance
sont faits pour toi), puis `→` pour le commerce suivant. Tout s'enregistre tout seul.

### Trouver des commerces (icône loupe)

1. Choisis le **pays** (la langue des messages s'adapte) et tape une ville
   (ex. `Lyon 3e`, `Bruxelles`, `London`).
2. Choisis les types de commerces.
3. Clique sur **Lancer la recherche**. Chaque type rapporte jusqu'à 60 commerces (3 requêtes).
4. Les emails et comptes Instagram sont ensuite cherchés tout seuls (case cochée sous le bouton ;
   sinon, clique sur **Chercher les emails** dans l'étape 2, car Google ne donne jamais les emails) : le logiciel visite le site des
   commerces les mieux notés, récupère leur email et leur Instagram, et vérifie si le site est sécurisé,
   adapté au téléphone, rapide et récent.

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

### Suivre tes prospects (icône personnes)

- La liste est triée du meilleur prospect au moins bon. Les onglets en haut à droite filtrent :
  Tous, À contacter, En cours, Vendus. Tu peux aussi chercher un nom dans la barre du haut.
- Clique sur **Exporter en Excel** pour l'avoir dans un tableur.
- Clique sur un commerce pour ouvrir sa **fiche** : score expliqué, téléphone, **email modifiable**,
  un **email prêt à envoyer** (bouton « Ouvrir dans ma boîte mail ») et un **message Instagram prêt
  à copier**, puis le suivi : statut, date de relance, notes et historique.
- Après chaque appel ou message, note-le dans la fiche (« J'ai contacté par ») : il compte dans le
  graphique de l'Accueil.
- Quand un commerce achète, passe-le en **Vendu** : il compte dans tes ventes.
- L'**Accueil** montre tes chiffres, les commerces contactés par semaine, où en sont tes prospects,
  ton quota Google et les **relances du jour**.

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
| Le navigateur ne s'ouvre pas | Ouvre-le toi-même sur http://127.0.0.1:8765 |
| « Google a répondu 403 » | La clé est mauvaise ou l'API Places (New) n'est pas activée. |
| Pas de photo en fond | Il faut Internet la première fois pour la télécharger ; en attendant, le fond « Aurore violette » s'affiche. |
| La pastille dit « Partage en pause » | Google Drive n'est pas ouvert sur cet ordinateur, ou le dossier a été déplacé : rechoisis-le dans Réglages. |
| Mettre à jour le logiciel | Chaque version a son propre dossier, nommé avec sa date (ex. `logiciel-prospection-review-maker-3-novembre-2026-v2`). Décompresse le nouveau ZIP **à côté** de l'ancien dossier, puis double-clique sur `Lancer Review Maker.bat` dans le nouveau : tes prospects et réglages sont repris automatiquement. Tu pourras supprimer l'ancien dossier ensuite. |
