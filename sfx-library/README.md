# Bibliothèque d'effets sonores (motion design)

484 sons prêts pour les montages, tous **libres de droits** :

- `packs/` : 467 sons de 24 packs **CC0** (domaine public) téléchargés sur OpenGameArt, rangés par usage. Détail, auteurs et sources dans [CATALOG.md](CATALOG.md).
- `generated/` : 17 sons synthétisés pour nos vidéos (whooshs, risers, booms, scintillements, ding), 48 kHz stéréo.
- `catalog.json` : chaque fichier avec son pack, sa catégorie et sa durée, pour chercher un son par script.

| Dossier | Pour quoi faire |
|---|---|
| `packs/whoosh-transitions` + `generated/whoosh-*` | changements de scène, éléments qui traversent l'écran |
| `generated/riser-*`, `generated/swell-inverse` | montée avant une révélation |
| `packs/impacts-booms` + `generated/boom-*` | coup sur un logo, un prix (à baisser fort) |
| `packs/pops` + `generated/pop-*` | apparition de pastilles, d'icônes, d'étoiles |
| `packs/ui-clics` | boutons, curseurs, cartes d'interface |
| `packs/magie-scintillements` + `generated/scintillement*` | brillances, reflets, apparition d'un logo |
| `packs/notifications-dings` + `generated/ding` | prix, validation, fin de séquence |
| `packs/digital-scifi` | glitchs, HUD, transitions tech |

## Utiliser dans Remotion

Copier les sons choisis dans `video/public/sfx/`, puis :

```tsx
<Sequence from={Math.round(1.2 * FPS)} layout="none">
  <Audio src={staticFile("sfx/whoosh-moyen.wav")} volume={0.5} />
</Sequence>
```

## Régénérer

```
python3 tools/build_library.py <dossier des packs extraits>   # range les packs, refait catalog.json et CATALOG.md
python3 tools/make_generated.py                                # refait generated/
```

Licence : CC0 1.0 pour tous les packs (aucun crédit obligatoire, usage commercial libre). Les sons de `generated/` sont produits par nos scripts.
