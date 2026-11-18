# Hôtel Mahfouf, concept de refonte (non officiel)

Visite 3D d'un hôtel au scroll, réalisée par ReviewMaker pour être filmée écran (Reels / TikTok).
Concept non officiel : non affilié à Hôtel Mahfouf. Photos et produits issus de hotelmahfouf.com.

- `index.html` : le site complet et autonome (Three.js et photos intégrés). Ouvrir dans Chrome.
- `src.html` : toute la scène et l'interface. `python3 build.py` régénère `index.html` (photos redimensionnées à 760 px).
- `archive-v2/` à `archive-v5/` : versions précédentes.

## Parcours (une seule scène 3D, le scroll déplace la caméra)
1. La rue au crépuscule : façade haussmannienne, fenêtres éclairées, balcons, marquise, enseigne, pavés mouillés
2. Les portes en laiton et verre s'ouvrent
3. Le lobby : damier bordeaux et crème, boiseries, lustre, réception
4. L'ascenseur vitré monte dans l'atrium et pivote vers une boutique par étage (manteaux, robes, bureau, room service, suite)
5. Le toit sous le ciel : fin, bouton pour redescendre

## Performance
Un seul rendu par image, pas de bibliothèque d'animation, pas d'ombres calculées, géométries répétées instanciées
(environ 20 à 55 appels de dessin), résolution plafonnée à 1,5x, lissage du scroll indépendant de la fréquence d'écran.
