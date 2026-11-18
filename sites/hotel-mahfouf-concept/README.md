# Hôtel Mahfouf, concept de refonte (non officiel)

Film au scroll réalisé par ReviewMaker, pensé pour être filmé écran (Reels / TikTok).
Concept non officiel : non affilié à Hôtel Mahfouf. Produits et photos issus de hotelmahfouf.com.

- `index.html` : le site complet et autonome (photos, Three.js, GSAP, ScrollTrigger, Lenis intégrés). Ouvrir dans Chrome.
- `src.html` : scènes et animations. `scene3d.js` : clé 3D et tunnel de photos.
- `assets/` : photos (webp) intégrées par `build.py`. Après modification : `python3 build.py`.
- `archive-v2/`, `archive-v3/` : versions précédentes.

## Les scènes
1. Lobby : la caméra plonge dans le porte-clé 3D, les lettres du titre explosent
2. La grille : une photo plein écran se rétracte dans une grille de 9 images
3. Le registre : lignes de typo géantes dont la vitesse suit le scroll
4. Le couloir : tunnel 3D de photos traversé par la caméra
5. La pellicule : défilement horizontal, cartes qui se déforment à la vitesse
6. Les chambres : photos plein écran qui s'empilent
7. La traversée : zoom à travers la lettre « t » jusqu'à la photo
8. Check-out : bouton « Rejouer le séjour » qui remonte tout en 5 secondes (boucle de vidéo)
