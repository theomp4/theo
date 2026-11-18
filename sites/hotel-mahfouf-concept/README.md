# Hôtel Mahfouf, concept de refonte (non officiel)

Site vitrine animé réalisé par ReviewMaker, pensé pour être filmé écran (Reels / TikTok).
Concept non officiel : non affilié à Hôtel Mahfouf. Photos et produits issus de hotelmahfouf.com.

- `index.html` : le site complet et autonome (photos, Three.js, GSAP, ScrollTrigger, Lenis intégrés). Ouvrir dans Chrome.
- `src.html` : page et animations. `scene3d.js` : toute la 3D (clé, sonnette, casier à clés, anneau, photos liquides).
- `assets/` : photos (webp). `build.py` n'intègre que celles utilisées dans `src.html`.
- `archive-v2/` à `archive-v4/` : versions précédentes.

## Parcours
1. Portes d'ascenseur en laiton qui s'ouvrent (indicateur 5 → RDC)
2. Lobby : plongée dans la clé 3D (court passage épinglé)
3. Règlement intérieur : phrase qui se lève mot à mot
4. Les chambres : 6 photos d'intérieurs en WebGL (révélation en vague avec liseré laiton, onde au survol, déformation à la vitesse)
5. La réception : casier à clés 3D en bois et laiton, la caméra le parcourt et la clé 104 sort (court passage épinglé)
6. Le dressing : anneau 3D de 9 pièces qui tourne pendant la traversée de la section
7. Typo cinétique liée à la vitesse du scroll
8. Room service : traversée de la lettre jusqu'à la photo (court passage épinglé)
9. Sonnette 3D : cliquer la fait sonner et remonte tout le site (boucle de vidéo)
