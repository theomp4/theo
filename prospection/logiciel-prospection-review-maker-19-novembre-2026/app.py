"""Review Maker · Prospection : l'application, dans sa propre fenêtre (sans Chrome, sans Safari).

La fenêtre utilise le moteur web de l'ordinateur (WebKit sur Mac, WebView2/Edge sur Windows) grâce à
pywebview. Le logiciel tourne derrière, comme avant, sur l'ordinateur seulement. Fermer la fenêtre
ferme le logiciel.

Si la fenêtre ne peut pas s'ouvrir (composant manquant), le logiciel s'ouvre dans le navigateur, comme
avant : on ne reste jamais bloqué.
"""
import os
import sys
import threading
import traceback
import webbrowser
from pathlib import Path

ICI = Path(__file__).resolve().parent
os.chdir(ICI)
sys.path.insert(0, str(ICI))

TITRE = "Review Maker · Prospection"


def preparer_mac():
    """Sur Mac : nom « Review Maker » dans la barre des menus et icône Review Maker dans le Dock."""
    try:
        from Foundation import NSBundle
        infos = NSBundle.mainBundle().localizedInfoDictionary() or NSBundle.mainBundle().infoDictionary()
        if infos is not None:
            infos["CFBundleName"] = "Review Maker"
    except Exception:
        pass


def icone_mac():
    try:
        from AppKit import NSApplication, NSImage
        image = NSImage.alloc().initWithContentsOfFile_(str(ICI / "assets" / "review-maker.png"))
        if image is not None:
            NSApplication.sharedApplication().setApplicationIconImage_(image)
    except Exception:
        pass


def main():
    if sys.platform == "darwin":
        preparer_mac()
    import serveur

    serveur.APPLI = True
    adresse = f"http://127.0.0.1:{serveur.PORT}/"
    try:
        import webview  # pywebview
    except Exception:
        print("Fenêtre d'application indisponible : ouverture dans le navigateur.")
        serveur.main()
        return

    http = serveur.demarrer(navigateur=False, arret_auto=False)
    fil = None
    if http is not None:
        fil = threading.Thread(target=http.serve_forever, daemon=True)
        fil.start()

    webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True
    stockage = ICI / "data" / "fenetre"  # garde les préférences de la page (dernière rubrique, filtres…)
    stockage.mkdir(parents=True, exist_ok=True)
    webview.create_window(TITRE, adresse, width=1440, height=920, min_size=(980, 640),
                          background_color="#121019", text_select=True)
    try:
        webview.start(icone_mac if sys.platform == "darwin" else None, private_mode=False, storage_path=str(stockage))
    except Exception:
        traceback.print_exc()
        print("La fenêtre n'a pas pu s'ouvrir : ouverture dans le navigateur.")
        webbrowser.open(adresse)
        if fil is not None:  # comme avant : le logiciel s'arrête quand la page du navigateur est fermée
            threading.Thread(target=serveur.surveiller_arret, args=(http,), daemon=True).start()
            try:
                fil.join()
            except KeyboardInterrupt:
                pass
            serveur.ranger()
        return
    # Fenêtre fermée : on range et on quitte.
    if http is not None:
        serveur.ranger()
        http.shutdown()


if __name__ == "__main__":
    main()
