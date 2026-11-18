# Hôtel Mahfouf, concept de refonte (non officiel)

Site vitrine animé réalisé par ReviewMaker pour une vidéo Instagram / TikTok.
Concept non officiel : non affilié à Hôtel Mahfouf ni à Léna Situations. Produits et prix illustratifs, aucun paiement.

- `index.html` : le site complet, autonome (Three.js, GSAP, ScrollTrigger et Lenis intégrés). Ouvrir dans Chrome.
- `src.html` : page et animations. `scene3d.js` : objets 3D temps réel (vêtements, casquette, clé, sonnette, valise, tote, chaussettes, panneau).
- Après modification : `python3 build.py` pour régénérer `index.html`.
- Sans WebGL, le site affiche automatiquement les illustrations 2D de secours.

## Parcours au scroll
1. Ouverture en portes d'ascenseur (compte à rebours 5 → RDC)
2. Lobby : enseigne animée, produits flottants, sonnette cliquable
3. Rubans croisés dont la vitesse suit le scroll
4. Règlement intérieur : texte qui se remplit mot à mot
5. Ascenseur épinglé : 5 étages, les portes se ferment et s'ouvrent sur chaque collection
6. Couloir horizontal : 7 portes de chambre qui s'ouvrent sur les produits
7. Panneau « Ne pas déranger » qui se balance selon la vitesse du scroll
8. Enseigne néon finale
