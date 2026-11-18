# Hôtel Mahfouf, concept de refonte (non officiel)

Site vitrine animé réalisé par ReviewMaker pour une vidéo Instagram / TikTok.
Concept non officiel : non affilié à Hôtel Mahfouf. Produits, photos et prix issus de hotelmahfouf.com (relevés le 18/11/2026). Aucun paiement.

- `index.html` : le site complet et autonome (photos, Three.js, GSAP, ScrollTrigger et Lenis intégrés). Ouvrir dans Chrome.
- `src.html` : page, mise en page et animations.
- `scene3d.js` : 3D temps réel (clé d'hôtel en laiton et cuir, sonnette en laiton sur marbre, galerie circulaire des photos).
- `assets/` : photos produits et éditoriales (webp), intégrées par `build.py`.
- Après modification : `python3 build.py` régénère `index.html`.
- `archive-v2/` : version précédente (univers rose, illustrations 3D).

## Parcours au scroll
1. Ouverture : compteur « Check-in 000 → 104 », puis rideau
2. Lobby : clé d'hôtel 3D devant l'enseigne, suit la souris, tourne en quittant l'écran
3. Règlement intérieur : texte révélé mot à mot
4. Galerie 3D épinglée : 9 pièces sur un anneau qui tourne au scroll, nom et prix synchronisés
5. Les chambres : 4 photos éditoriales avec rideau et parallaxe
6. La boutique : 9 pièces, seconde photo au survol, choix de taille → valise
7. Le minibar : bougie « It smells like fig »
8. Réception : sonnette 3D cliquable, inscription à la lettre
9. Enseigne finale
