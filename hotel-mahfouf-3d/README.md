# Hôtel Mahfouf — maquette e-commerce immersive

**Maquette de présentation, concept non officiel.** Le paiement est désactivé.

L'accueil est l'hôtel lui-même, animé à partir de trois images photoréalistes (`public/references/`) :
nuages qui dérivent dans le ciel uniquement, fenêtres et lanternes qui s'allument au crépuscule puis scintillent,
halo du soleil, oiseaux, respiration de la caméra, parallaxe à la souris, trois points de vue (flèches, clavier, balayage).
Chaque fenêtre éclairée mène à une boutique : zoom cinématographique dans la lumière de la fenêtre, puis la photo de la pièce.

## Lancer
```bash
npm install
npm run build      # génère le site statique dans out/
npx serve out      # ou n'importe quel serveur statique
```
`npm run dev` pour développer. `npm run sync` met à jour le catalogue (produits, prix, tailles, stocks) depuis le catalogue public Shopify.

## Organisation
- `config/rooms.ts` : les pièces (numéro, nom, catégorie Shopify, couleurs) — à modifier librement.
- `config/views.ts` : les 3 points de vue, la fenêtre de chaque pièce sur chaque image, la photo d'intérieur de chaque pièce.
- `scripts/prepare-views.py` : détecte les éclairages de chaque image et dessine le masque du ciel (à relancer si les images changent).
- `components/PhotoExperience.tsx` : l'animation de la façade et des intérieurs.
- `components/Overlays.tsx`, `ProductPurchase.tsx`, `RoomShop.tsx`, `CartPage.tsx` : menu, recherche, fiche produit (photos, taille, couleur, quantité), panier.
- URLs : `/chambre/<pièce>/` pour chaque boutique, `/produit/<produit>/` pour chaque article, `/panier/`.

## Passer en production
Le panier utilise déjà les identifiants de variantes Shopify réels. Pour activer le paiement (avec l'accord de la marque) :
`NEXT_PUBLIC_CHECKOUT_ENABLED=true` (lien panier Shopify), ou brancher la Storefront API (`cartCreate` → `checkoutUrl`), voir `lib/commerce.ts`.
Pour encore plus de réalisme, les images de la façade peuvent être remplacées par des vidéos (même cadrage) générées à partir des mêmes images.
