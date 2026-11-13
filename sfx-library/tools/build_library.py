"""Range les packs CC0 téléchargés (un dossier par pack) dans sfx-library/packs/<catégorie>/<pack>/,
vérifie chaque fichier avec ffprobe, puis écrit catalog.json et CATALOG.md.
Usage : python3 build_library.py <dossier_des_packs_extraits>"""
import json, os, shutil, subprocess, sys

LIB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = (".wav", ".ogg", ".mp3", ".flac")
KEEP = ("license", "readme")

# slug OpenGameArt → (catégorie, titre, auteur)
PACKS = {
    "interface-sounds": ("ui-clics", "Interface Sounds", "Kenney"),
    "51-ui-sound-effects-buttons-switches-and-clicks": ("ui-clics", "51 UI sound effects", "Kenney"),
    "10-clicks-and-switches": ("ui-clics", "10 Clicks and Switches", "StarNinjas"),
    "ui-sound-effects-button-clicks-user-feedback-notifications": ("ui-clics", "UI Sound Effects (clics, retours, notifications)", "Robin Lamb"),
    "ui-sounds": ("ui-clics", "UI Sounds", "StumpyStrust"),
    "ui-sounds-0": ("ui-clics", "UI Sounds", "HaelDB"),
    "7-assorted-sound-effects-menu-level-up": ("ui-clics", "7 Assorted Sound Effects (menu, level up)", "Joth"),
    "swishes-sound-pack": ("whoosh-transitions", "Swishes Sound Pack", "artisticdude"),
    "air-whoosh": ("whoosh-transitions", "Air whoosh", "pyranostudios"),
    "3-pop-sounds": ("pops", "3 Pop Sounds", "wubitog"),
    "pop-sounds": ("pops", "Pop sounds", "cogitollc"),
    "a-slide-pop-sound": ("pops", "A Slide Pop Sound", "EZduzziteh"),
    "pop-effect-sounds": ("pops", "Pop effect sounds", "trezegames"),
    "75-cc0-breaking-falling-hit-sfx": ("impacts-booms", "75 breaking / falling / hit sfx", "rubberduck"),
    "synthesized-explosion": ("impacts-booms", "Synthesized explosion", "qubodup"),
    "muffled-distant-explosion": ("impacts-booms", "Muffled Distant Explosion", "NenadSimic"),
    "magic-spell-sfx": ("magie-scintillements", "Magic Spell SFX", "JaggedStone"),
    "cure-magic": ("magie-scintillements", "Cure Magic", "Someoneman"),
    "teleport-spell": ("magie-scintillements", "Teleport Spell", "Ogrebane"),
    "4-metal-dingsrings": ("notifications-dings", "4 Metal Dings/Rings", "StarNinjas"),
    "kalimba-two-notes": ("notifications-dings", "Kalimba Two-Notes", "railkill"),
    "mystery-sting": ("notifications-dings", "Mystery Sting", "railkill"),
    "63-digital-sound-effects-lasers-phasers-space-etc": ("digital-scifi", "63 Digital sound effects", "Kenney"),
    "sci-fi-sounds": ("digital-scifi", "Sci-Fi Sounds", "Kenney"),
}
CAT_USE = {
    "ui-clics": "boutons, curseurs, apparitions de cartes ou d'interface, retours « validé »",
    "whoosh-transitions": "changements de scène, éléments qui traversent l'écran",
    "pops": "apparition de pastilles, d'icônes, d'étoiles, de bulles",
    "impacts-booms": "coup sur un logo, un prix, une révélation (à baisser fort)",
    "magie-scintillements": "brillances, reflets, apparition d'un logo",
    "notifications-dings": "prix, validation, notification, fin de séquence",
    "digital-scifi": "glitchs, HUD, transitions tech, compteurs",
}

def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=sample_rate,channels",
                        "-of", "json", path], capture_output=True, text=True)
    if r.returncode: return None
    j = json.loads(r.stdout)
    try:
        st = j["streams"][0]
        return dict(duration=round(float(j["format"]["duration"]), 3), sample_rate=int(st["sample_rate"]), channels=st["channels"])
    except (KeyError, IndexError, ValueError):
        return None

def main(src):
    catalog = {"license": "CC0 1.0 (domaine public) pour tous les packs", "packs": [], "files": []}
    for slug, (cat, title, author) in PACKS.items():
        s = os.path.join(src, slug)
        if not os.path.isdir(s): print("manquant :", slug); continue
        dst = os.path.join(LIB, "packs", cat, slug)
        n = 0
        for root, _, files in os.walk(s):
            for f in sorted(files):
                low = f.lower(); p = os.path.join(root, f)
                if low.endswith(AUDIO):
                    info = probe(p)
                    if not info: print("illisible, ignoré :", p); continue
                elif not any(low.startswith(k) for k in KEEP):
                    continue
                rel = os.path.relpath(p, s); out = os.path.join(dst, rel)
                os.makedirs(os.path.dirname(out), exist_ok=True); shutil.copy2(p, out)
                if low.endswith(AUDIO):
                    n += 1
                    catalog["files"].append(dict(path=os.path.relpath(out, LIB), pack=slug, category=cat, **info))
        catalog["packs"].append(dict(slug=slug, title=title, author=author, category=cat, files=n, license="CC0",
                                     source=f"https://opengameart.org/content/{slug}"))
    json.dump(catalog, open(os.path.join(LIB, "catalog.json"), "w"), ensure_ascii=False, indent=1)
    # CATALOG.md
    L = ["# Catalogue des packs", "", "Tous les packs viennent d'OpenGameArt et sont sous licence **CC0** (domaine public) : usage commercial libre, sans crédit obligatoire.", ""]
    for cat, use in CAT_USE.items():
        ps = [p for p in catalog["packs"] if p["category"] == cat]
        if not ps: continue
        L += [f"## {cat}", "", f"Usage : {use}.", "", "| Pack | Auteur | Sons | Source |", "|---|---|---|---|"]
        for p in ps: L.append(f"| {p['title']} | {p['author']} | {p['files']} | [OpenGameArt]({p['source']}) |")
        L.append("")
    open(os.path.join(LIB, "CATALOG.md"), "w").write("\n".join(L))
    print(len(catalog["files"]), "sons,", len(catalog["packs"]), "packs")

if __name__ == "__main__":
    main(sys.argv[1])
