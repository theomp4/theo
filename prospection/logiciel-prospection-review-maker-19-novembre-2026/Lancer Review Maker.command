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

# --- 3. L'application « Review Maker » (dossier Applications + raccourci sur le Bureau) ------
# Une vraie application Mac, avec l'icône Review Maker : un double-clic l'ouvre dans sa propre fenêtre,
# sans navigateur. Elle est refaite à chaque fois : elle pointe toujours vers ce dossier-ci.
DOSSIER="$(pwd)"
APPLIS="$HOME/Applications"
APP="$APPLIS/Review Maker.app"
mkdir -p "$APPLIS" data
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Review Maker</string>
  <key>CFBundleDisplayName</key><string>Review Maker</string>
  <key>CFBundleIdentifier</key><string>fr.reviewmaker.prospection</string>
  <key>CFBundleExecutable</key><string>ReviewMaker</string>
  <key>CFBundleIconFile</key><string>icone</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>10.15</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
cat > "$APP/Contents/MacOS/ReviewMaker" <<SCRIPT
#!/bin/bash
cd "$DOSSIER" || exit 1
mkdir -p data
exec ./.venv/bin/python -u app.py >> data/journal.txt 2>&1
SCRIPT
chmod +x "$APP/Contents/MacOS/ReviewMaker"
# Icône : faite à partir de assets/review-maker.png avec les outils du Mac (sips, iconutil)
ICONES="$(mktemp -d)/icone.iconset"
mkdir -p "$ICONES"
for t in 16 32 128 256 512; do
  sips -z $t $t assets/review-maker.png --out "$ICONES/icon_${t}x${t}.png" >/dev/null 2>&1
  sips -z $((t*2)) $((t*2)) assets/review-maker.png --out "$ICONES/icon_${t}x${t}@2x.png" >/dev/null 2>&1
done
iconutil -c icns "$ICONES" -o "$APP/Contents/Resources/icone.icns" 2>/dev/null
touch "$APP"
# Raccourci sur le Bureau (et on retire les anciens)
rm -f "$HOME/Desktop/Logiciel de prospection Review Maker.command" "$HOME/Desktop/Review Maker"
ln -s "$APP" "$HOME/Desktop/Review Maker"
echo "L'application « Review Maker » est dans ton dossier Applications, et un raccourci est sur ton Bureau."
echo "Astuce : fais-la glisser dans ton Dock pour l'ouvrir en un clic."

# --- 4. Ouvrir l'application ----------------------------------------------------------
echo
echo "Ouverture de Review Maker…"
open "$APP"
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://127.0.0.1:8765/api/etat; then
    echo "Review Maker est ouvert. Tu peux fermer cette fenêtre du Terminal."
    sleep 2
    exit 0
  fi
  sleep 1
done
# Pas de réponse : on montre l'erreur, puis on ouvre le logiciel dans le navigateur, comme avant.
echo
echo "L'application ne s'est pas ouverte. Dernières lignes du journal :"
tail -n 15 data/journal.txt
echo
echo "Ouverture dans le navigateur à la place. LAISSE CETTE FENÊTRE OUVERTE pendant que tu l'utilises."
.venv/bin/python -u serveur.py 2>&1 | tee -a data/journal.txt
CODE=${PIPESTATUS[0]}
if [ "$CODE" != "0" ]; then
  erreur "Le logiciel s'est arrêté à cause d'une erreur (code $CODE), affichée juste au-dessus.
Fais une capture d'écran de cette fenêtre et envoie-la à Claude."
fi
exit 0
