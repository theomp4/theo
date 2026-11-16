@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Logiciel de prospection Review Maker
echo.
echo  ==============================================
echo     Logiciel de prospection Review Maker
echo  ==============================================
echo.

rem --- 1. Trouver Python, ou l installer tout seul -------------------------
set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PY (
  echo Premiere fois : installation de Python, le langage du logiciel. Environ 3 minutes...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri https://www.python.org/ftp/python/3.13.1/python-3.13.1-amd64.exe -OutFile $env:TEMP\python-installer.exe"
  if not exist "%TEMP%\python-installer.exe" goto erreur_internet
  start "" /wait "%TEMP%\python-installer.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_launcher=1 Include_test=0
  set "PY=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
)
if not exist "%PY%" if not "%PY%"=="py" goto erreur_python

rem --- 2. Installer le logiciel (la premiere fois, ou apres une mise a jour) --
if not exist ".venv\Scripts\python.exe" (
  echo Installation du logiciel. Environ 3 minutes, une seule fois...
  "%PY%" -m venv .venv
  if errorlevel 1 goto erreur_python
)
fc /b requirements.txt ".venv\installe.txt" >nul 2>nul
if errorlevel 1 (
  echo Installation des composants du logiciel...
  ".venv\Scripts\python.exe" -m pip install --upgrade pip --quiet
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet
  if errorlevel 1 goto erreur_internet
  copy /y requirements.txt ".venv\installe.txt" >nul
)

rem --- 3. Debloquer les fichiers et creer l icone du Bureau ------------------
rem    Windows marque les fichiers sortis d un ZIP telecharge et affiche "Editeur inconnu"
rem    a chaque ouverture : on enleve cette marque. L icone du Bureau lance directement
rem    le logiciel (pythonw, sans fenetre), sans passer par ce fichier.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath '%~dp0' -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue"
rem    L icone est refaite a chaque fois : elle pointe toujours vers ce dossier-ci.
(
  rem    L icone est copiee dans un dossier local de Windows (jamais marque comme telecharge).
  if not exist "%LOCALAPPDATA%\ReviewMakerProspection" mkdir "%LOCALAPPDATA%\ReviewMakerProspection"
  copy /y "assets\logiciel-prospection.ico" "%LOCALAPPDATA%\ReviewMakerProspection\icone.ico" >nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$i=$env:LOCALAPPDATA+'\ReviewMakerProspection\icone.ico'; Unblock-File -LiteralPath $i -ErrorAction SilentlyContinue; $b=[Environment]::GetFolderPath('Desktop'); Remove-Item -LiteralPath ($b+'\Review Maker.lnk'),($b+'\Logiciel de prospection Review Maker.lnk') -ErrorAction SilentlyContinue; $s=(New-Object -ComObject WScript.Shell).CreateShortcut($b+'\Logiciel de prospection Review Maker.lnk'); $s.TargetPath='%~dp0.venv\Scripts\pythonw.exe'; $s.Arguments='serveur.py'; $s.WorkingDirectory='%~dp0'; $s.IconLocation=$i+',0'; $s.Description='Logiciel de prospection Review Maker'; $s.Save()"
  rem    Windows garde parfois l ancienne image en memoire : on lui demande de rafraichir les icones.
  ie4uinit.exe -ClearIconCache >nul 2>nul
  ie4uinit.exe -show >nul 2>nul
  echo L icone "Logiciel de prospection Review Maker" est sur ton Bureau : utilise-la pour ouvrir le logiciel.
)

rem --- 4. Lancer ---------------------------------------------------------------
rem    pythonw = sans fenetre. Le logiciel s arrete tout seul quand la page est fermee.
rem    Les messages et erreurs sont notes dans data\journal.txt.
echo Le logiciel s ouvre dans ton navigateur...
start "" ".venv\Scripts\pythonw.exe" serveur.py
exit /b 0

:erreur_internet
echo.
echo Le telechargement a echoue. Verifie ta connexion Internet, puis double-clique a nouveau sur ce fichier.
pause
exit /b 1

:erreur_python
echo.
echo Python n a pas pu etre installe automatiquement.
echo Installe-le depuis https://www.python.org/downloads/ en cochant "Add python.exe to PATH",
echo puis double-clique a nouveau sur ce fichier.
pause
exit /b 1
