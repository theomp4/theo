#!/bin/bash
# Logiciel de prospection Review Maker : lanceur pour Mac.
# Double-clique sur ce fichier (la première fois : clic droit > Ouvrir).
cd "$(dirname "$0")" || exit 1
clear
echo
echo "  =============================================="
echo "     Logiciel de prospection Review Maker"
echo "  =============================================="
echo

erreur() {
  echo
  echo "$1"
  echo
  read -r -p "Appuie sur Entrée pour fermer cette fenêtre." _
  exit 1
}

# macOS bloque les fichiers sortis d'un ZIP téléchargé : on enlève ce blocage pour tout le dossier.
xattr -dr com.apple.quarantine . 2>/dev/null

# --- 1. Trouver Python 3.11 ou plus récent (le logiciel en a besoin) -----------------
python_ok() { "$1" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' >/dev/null 2>&1; }
PY=""
for candidat in /Library/Frameworks/Python.framework/Versions/3.1[1-9]/bin/python3 \
                /opt/homebrew/bin/python3 /usr/local/bin/python3; do
  if [ -x "$candidat" ] && python_ok "$candidat"; then PY="$candidat"; fi
done

if [ -z "$PY" ] && [ ! -x ".venv/bin/python" ]; then
  echo "Première fois : il faut installer Python, le langage du logiciel."
  echo "Téléchargement de l'installateur officiel (python.org), environ 1 minute..."
  curl -fL --progress-bar -o /tmp/python-installer.pkg \
    https://www.python.org/ftp/python/3.13.1/python-3.13.1-macos11.pkg \
    || erreur "Le téléchargement a échoué. Vérifie ta connexion Internet, puis double-clique à nouveau sur ce fichier."
  open /tmp/python-installer.pkg
  erreur "L'installateur de Python vient de s'ouvrir : clique sur Continuer jusqu'à la fin (ton mot de passe Mac te sera demandé).
Quand c'est terminé, double-clique à nouveau sur « Lancer Review Maker.command »."
fi

# --- 2. Installer le logiciel (la première fois, ou après une mise à jour) -----------
if [ ! -x ".venv/bin/python" ]; then
  echo "Installation du logiciel. Environ 3 minutes, une seule fois..."
  "$PY" -m venv .venv || erreur "Python n'a pas pu préparer le logiciel. Installe Python depuis https://www.python.org/downloads/ puis relance ce fichier."
fi
if ! cmp -s requirements.txt .venv/installe.txt; then
  echo "Installation des composants du logiciel..."
  .venv/bin/python -m pip install --upgrade pip --quiet
  .venv/bin/python -m pip install -r requirements.txt --quiet \
    || erreur "Le téléchargement a échoué. Vérifie ta connexion Internet, puis double-clique à nouveau sur ce fichier."
  cp requirements.txt .venv/installe.txt
fi

# --- 3. Raccourci sur le Bureau (refait à chaque fois : il pointe vers ce dossier-ci) --
RACCOURCI="$HOME/Desktop/Logiciel de prospection Review Maker.command"
DOSSIER="$(pwd)"
printf '#!/bin/bash\nexec "%s/Lancer Review Maker.command"\n' "$DOSSIER" > "$RACCOURCI" && chmod +x "$RACCOURCI" \
  && echo "Le raccourci « Logiciel de prospection Review Maker » est sur ton Bureau : utilise-le pour ouvrir le logiciel."

# --- 4. Lancer ----------------------------------------------------------------------
# Le logiciel s'arrête tout seul quand la page est fermée. Messages et erreurs : data/journal.txt.
mkdir -p data
echo "Le logiciel s'ouvre dans ton navigateur... Tu peux fermer cette fenêtre."
nohup .venv/bin/python serveur.py >> data/journal.txt 2>&1 &
disown
sleep 2
exit 0
