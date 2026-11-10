# Prospection : sites maquettes

Méthode : pour chaque commerce, on analyse sa DA (logo, carte, réseaux, avis), on livre un dossier
prêt à glisser sur Netlify Drop, des captures de la maquette et un message de prospection personnalisé.

## Préférences de Théo
- Sites époustouflants, fidèles à la DA et au logo du commerce.
- **Plus d'animations** (demandé après MRC Auto 78) : écran d'intro, titres révélés, bandeaux
  défilants, parallaxe, défilement horizontal, curseur personnalisé, boutons magnétiques…
- Dossier autonome (pas de build), formulaires Netlify Forms (penser à activer la détection des formulaires).
- **Livraison : un seul dossier par commerce**, `prospects/<nom>/` (+ `prospects/<nom>.zip`) :
  - `A-GLISSER-SUR-NETLIFY/` : le site, seul dossier à glisser sur Netlify Drop (glisser le dossier parent donne « Page not found »)
  - `photos/` : les captures de la maquette à joindre
  - `message.txt` : le message à copier-coller, la relance et la liste des photos à joindre

## Sites livrés
| Commerce | Dossier | En ligne |
|---|---|---|
| M.R.C Auto 78 (garage, Élancourt) | `prospects/mrc-auto-78/` | https://gentle-rabanadas-7aa338.netlify.app |
| Chez Ennio (trattoria, Les Clayes-sous-Bois) | `prospects/chez-ennio/` | https://coruscating-zuccutto-6d6acc.netlify.app |
| Taanneef Resto (sénégalais, Carrières-sous-Poissy) | `prospects/taanneef-resto/` | à déployer |
| Crêperie Trésor Breton (Conflans-Sainte-Honorine) | `prospects/tresor-breton/` | à déployer |
