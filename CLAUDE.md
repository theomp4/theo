# Consignes du projet

## Logiciel de prospection Review Maker (`prospection/`)

- **Numéro de version** : les versions du logiciel se nomment par un numéro, comme un jeu :
  la prochaine est **1.2**, puis 1.3, 1.4… (plus de date). La version du 19 novembre 2026 est la
  dernière nommée par une date.
  - Dossier et ZIP : `prospection/logiciel-prospection-review-maker-1.2/` et `…-1.2.zip`.
  - Dans `serveur.py` : `VERSION = "1.2"` (affiché dans Réglages ; sert aussi à fermer une ancienne
    version encore ouverte).
- Chaque version a son propre dossier : l'utilisateur la décompresse à côté de l'ancienne, et le
  logiciel reprend tout seul la base `data/prospection.db` de la version précédente.
- Ne jamais écrire de clé API, d'email ou de mot de passe dans le code ou le ZIP : ils vont dans
  les Réglages du logiciel (base locale de chaque ordinateur).
