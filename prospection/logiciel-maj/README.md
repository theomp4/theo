# Logiciel de prospection Review Maker

Une petite application qui tourne **sur ton ordinateur Windows** et s'ouvre dans ton navigateur.
Elle trouve les commerces d'une ville, partout dans le monde, leur donne une **note de priorité sur 100**,
trouve leur email, suit chaque prospect jusqu'à la vente et envoie des emails de prospection réglés pour
éviter les spams, écrits par toi ou par l'IA.

Deux espaces, en haut du menu : **Tags NFC** (Review Maker) et **Sites internet**. Chaque espace a ses
propres prospects, son score, ses emails et ses statistiques.

Aucun abonnement. Tes données restent dans le dossier `data` de ton ordinateur.

---

## 1. Installer (une seule fois, environ 15 minutes)

### Étape 1 : récupérer le logiciel

1. Télécharge le fichier `prospection-review-maker.zip` que Claude t'a envoyé.
2. Fais un clic droit dessus > **Extraire tout** > **Extraire**.
3. Déplace le dossier `prospection` sur ton Bureau (ou dans Documents).

### Étape 2 : double-cliquer sur « Lancer Review Maker »

1. Ouvre le dossier `prospection` et double-clique sur **`Lancer Review Maker.bat`**.
2. Si Windows affiche « Windows a protégé votre ordinateur », clique sur **Informations complémentaires**
   puis **Exécuter quand même** (c'est normal pour un fichier que tu as téléchargé toi-même).
3. La première fois, une fenêtre noire installe tout toute seule (Python, puis le logiciel) :
   compte 5 à 10 minutes. Si Windows demande une autorisation pour Python, clique sur **Oui**.
4. Ton navigateur s'ouvre sur le logiciel, et un raccourci **Review Maker** apparaît sur ton Bureau.

Les fois suivantes, double-clique simplement sur le raccourci **Review Maker** du Bureau : le logiciel
s'ouvre en quelques secondes. Laisse la fenêtre noire ouverte pendant que tu l'utilises ; ferme-la
quand tu as fini.

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

## 3. Créer ta clé Claude pour l'IA (optionnel, environ 5 minutes)

L'IA écrit un email personnalisé pour chaque commerce. Elle se paie à l'usage, sans abonnement :
avec **Claude Haiku 5.5**, 100 emails coûtent environ **2 centimes**.

1. Va sur https://console.anthropic.com et crée un compte.
2. **Billing** : ajoute 5 $ de crédit (de quoi écrire plus de 20 000 emails).
3. **API Keys** > **Create Key**, copie la clé (elle commence par `sk-ant-`).
4. Dans le logiciel : **Réglages** > « Clé API Claude » > colle la clé. Garde un **budget maximum par
   mois** (2 $ par défaut) : le logiciel s'arrête avant de le dépasser.

Ce n'est pas compris dans un abonnement Claude.ai : c'est un compte à part.

---

## 4. Utiliser le logiciel au quotidien

Choisis d'abord l'espace en haut du menu : **Tags NFC** ou **Sites internet**.

### Trouver des commerces (menu « 1. Trouver des commerces »)

1. Choisis le **pays** (la langue des messages et les règles d'envoi s'adaptent) et tape une ville
   (ex. `Lyon 3e`, `Bruxelles`, `London`).
2. Choisis les types de commerces.
3. Clique sur **Lancer la recherche**. Chaque type rapporte jusqu'à 60 commerces (3 requêtes).
4. Puis clique sur **Chercher les emails et analyser les sites** : le logiciel visite le site des
   commerces les mieux notés, récupère leur email et leur Instagram, et vérifie si le site est sécurisé,
   adapté au téléphone, rapide et récent.

Au Canada, en Allemagne, en Espagne, en Italie et en Australie, la loi demande un accord avant
d'envoyer un email de prospection : le logiciel n'envoie pas d'email vers ces pays. Utilise le téléphone
ou Instagram.

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

### Suivre tes prospects (menu « 2. Mes prospects »)

- La liste est triée du meilleur prospect au moins bon, avec filtres par ville, type, statut et score.
- Clique sur **Exporter en Excel** pour l'avoir dans un tableur.
- En bas, ouvre la **fiche** d'un commerce : statut, **email modifiable**, notes (l'IA les lit),
  date de relance, historique des contacts et un **message Instagram prêt à copier** déjà personnalisé.
- Quand un commerce achète, passe-le en **Vendu** : il compte dans tes ventes et apparaît en rose sur le globe.
- Le **Tableau de bord** montre tes chiffres, 4 graphiques (emails et réponses par semaine, ventes,
  du prospect à la vente, taux de réponse par type de commerce) et les **relances du jour**.
- La **Carte en direct** montre tes prospects sur la Terre : fais-la tourner à la souris, zoome à la
  molette, ou clique sur « Faire tourner ».

Instagram n'autorise pas l'envoi automatique de messages : copie-colle le message
depuis la fiche et envoie-le toi-même depuis l'appli Instagram.

### Envoyer des emails (menu « 3. Envoyer des emails »)

Lis d'abord **[GUIDE_EMAILS.md](GUIDE_EMAILS.md)** : il explique comment ne pas finir en spam
(c'est surtout une question de réglages de ton adresse, à faire une fois).

1. Choisis l'étape : premier email, relance 1 (4 jours après), relance 2 (10 jours après).
2. Choisis la rédaction :
   - **IA personnalisée** : clique sur **Écrire les emails avec l'IA**. Pour chaque commerce, relis
     l'email, corrige-le à la main ou demande une modification (boutons « Plus court », « Plus
     chaleureux »… ou ta propre demande). Coche « Retenir pour tous les prochains emails » pour que
     l'IA l'applique toujours. Clique sur **Valider cet email** : seuls les emails validés partent.
   - **Modèle fixe** : relis et adapte le modèle (français ou anglais). Les variables comme `{nom}`
     sont remplacées pour chaque commerce.
3. Dans **À qui j'envoie**, coche les commerces qui reçoivent l'email, change une adresse en cliquant
   dessus, et choisis l'adresse d'envoi.
4. Envoie-toi un **test** et vérifie qu'il arrive bien en boîte de réception.
5. Clique sur **Envoyer**. Laisse la page ouverte : le logiciel fait une pause de 45 à 120 secondes
   entre chaque email, comme un humain.
6. Chaque jour, clique sur **Vérifier les réponses** : les commerces qui ont répondu passent en
   « A répondu » (plus de relance automatique), et ceux qui ont écrit STOP sont désinscrits pour toujours.

### Marketing · Planning (menu « Marketing · Planning »)

La rubrique marketing regroupe le planning des posts TikTok et Instagram pour l'espace **Sites internet** :

- **Planning** : 26 semaines (9 nov. 2026 → 9 mai 2027), un post par jour sur chaque réseau, partagés
  entre Théo et Luke (182 chacun, les rôles s'inversent chaque semaine). Pour chaque post : le format,
  le sujet, l'accroche, comment le tourner, la durée et la phrase de fin. Coche **Marquer comme publié**
  quand c'est fait : c'est enregistré dans la base. Les compteurs montrent l'avancement de chacun et
  les posts en retard.
- **Collabs influenceurs** : une collab par mois, en 4 étapes datées, à cocher au fur et à mesure.
- **Messages de prospection** : les séquences pour les créateurs et pour les commerçants, à copier.

Le planning est dans `web/marketing/planning.json`. Les cases cochées sont dans la base
(`data/prospection.db`), donc elles restent quand tu mets le logiciel à jour.

### Réglages utiles

- **Apparence** : thème sombre ou clair, et couleur principale (or, émeraude, corail, violet).
  Relance le logiciel pour voir le changement partout.
- **Sites internet** : ton prix et ton délai, utilisés dans les emails de l'espace Sites.
- **Intelligence artificielle** : clé, modèle, budget du mois et consignes que l'IA respecte toujours.

---

## 5. Règles légales intégrées

- **Google** : seul l'identifiant du commerce est conservé durablement. Les autres données Google
  (adresse, téléphone, note…) sont effacées après 30 jours ; relance une recherche pour les rafraîchir.
  Ton suivi (statut, notes, email trouvé) est toujours conservé.
- **RGPD / CNIL** : l'email de prospection à un professionnel est autorisé sans accord préalable s'il
  concerne son activité. Chaque email indique qui tu es et propose de répondre STOP. Les désinscrits
  ne sont plus jamais contactés.
- Avec l'IA, la fiche du commerce (nom, ville, note, avis, état du site, tes notes) est envoyée à
  Anthropic pour écrire l'email. Ne mets pas d'informations personnelles sensibles dans tes notes.
- Les données restent sur ton ordinateur. Pense à sauvegarder le dossier `data` (clé USB, Google Drive).

## 6. En cas de problème

| Problème | Solution |
| --- | --- |
| « Python n'a pas pu être installé » | Installe-le depuis python.org en cochant « Add python.exe to PATH », puis relance `Lancer Review Maker.bat`. |
| Le navigateur ne s'ouvre pas | Ouvre-le toi-même sur http://127.0.0.1:8765 |
| « Google a répondu 403 » | La clé est mauvaise ou l'API Places (New) n'est pas activée. |
| « Username and Password not accepted » | Utilise un mot de passe d'application, pas ton mot de passe normal (voir GUIDE_EMAILS.md). |
| « Clé API Claude refusée » | Recopie la clé depuis console.anthropic.com > API Keys. |
| « Plus de crédit sur ton compte Claude » | Ajoute du crédit dans console.anthropic.com > Billing. |
| Mettre à jour le logiciel | Télécharge le nouveau ZIP, remplace tout **sauf** le dossier `data`, puis double-clique sur `Lancer Review Maker.bat`. |
