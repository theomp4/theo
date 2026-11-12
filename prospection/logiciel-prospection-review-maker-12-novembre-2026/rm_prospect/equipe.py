"""Travail en équipe : partager ses prospects avec un coéquipier par un dossier cloud partagé.

Chaque ordinateur garde sa propre base (data/prospection.db, jamais dans le cloud : SQLite
s'abîme quand Google Drive ou OneDrive le synchronise pendant qu'il est ouvert). En plus,
il écrit régulièrement une copie de ses fiches dans le dossier partagé, un fichier par personne :
  equipe-<prénom>-<poste>.json
et lit les fichiers des autres pour fusionner, fiche par fiche :
- une fiche que je n'ai pas encore est ajoutée ;
- statut, notes, date de relance, email : la modification la plus récente gagne, champ par champ ;
- données Google : on garde les plus récentes ;
- historique : chaque action (« Contacté par Instagram »…) est ajoutée une seule fois, avec son auteur.
"""
import json
import os
import re
from pathlib import Path

from rm_prospect import db

PREFIXE = "equipe-"
NON_EXPORTES = {"score", "raisons"}  # recalculés sur chaque ordinateur


def nom_fichier(prenom, poste):
    propre = re.sub(r"[^\w-]+", "_", prenom.strip(), flags=re.UNICODE).strip("_") or "moi"
    return f"{PREFIXE}{propre}-{poste}.json"


def instantane(conn, prenom):
    commerces = []
    for r in conn.execute("SELECT * FROM commerces ORDER BY cle"):
        commerces.append({k: r[k] for k in r.keys() if k not in NON_EXPORTES})
    historique = [dict(r) for r in conn.execute(
        "SELECT cle, date, canal, detail, auteur, uid FROM historique ORDER BY uid")]
    return {"format": 1, "prenom": prenom, "commerces": commerces, "historique": historique}


def exporter(conn, dossier, prenom, poste, dernier_contenu=None):
    """Écrit ma copie dans le dossier partagé si elle a changé. Renvoie le contenu écrit."""
    contenu = json.dumps(instantane(conn, prenom), ensure_ascii=False, sort_keys=True, default=str)
    if contenu == dernier_contenu:
        return contenu
    dossier = Path(dossier)
    cible = dossier / nom_fichier(prenom, poste)
    temporaire = dossier / f".{cible.name}.tmp"
    temporaire.write_text(contenu, encoding="utf-8")
    os.replace(temporaire, cible)  # d'un coup : le coéquipier ne lit jamais un fichier à moitié écrit
    # Ancien fichier de ce poste sous un autre prénom : on le retire.
    for f in dossier.glob(f"{PREFIXE}*-{poste}.json"):
        if f.name != cible.name:
            try:
                f.unlink()
            except OSError:
                pass
    return contenu


def fichiers_coequipiers(dossier, poste):
    return [f for f in Path(dossier).glob(f"{PREFIXE}*.json") if not f.name.endswith(f"-{poste}.json")]


def _plus_recent(a, b):
    return (a or "") > (b or "")


def fusionner(conn, donnees):
    """Fusionne les fiches d'un coéquipier dans ma base. Renvoie les clés modifiées."""
    modifiees = set()
    colonnes = {r[1] for r in conn.execute("PRAGMA table_info(commerces)")}
    for c in donnees.get("commerces", []):
        c = {k: v for k, v in c.items() if k in colonnes and k not in NON_EXPORTES}
        cle = c.get("cle")
        if not cle:
            continue
        moi = conn.execute("SELECT * FROM commerces WHERE cle=?", (cle,)).fetchone()
        if moi is None:
            conn.execute(f"INSERT INTO commerces({', '.join(c)}) VALUES({', '.join('?' * len(c))})", list(c.values()))
            modifiees.add(cle)
            continue
        moi = dict(moi)
        maj = {}
        # Données Google : les plus récentes.
        if _plus_recent(c.get("google_maj"), moi.get("google_maj")):
            maj.update({f: c.get(f) for f in db.GOOGLE_FIELDS if f in c})
        for f in ("ville_recherche", "categorie", "pays", "ajoute_le"):
            if not moi.get(f) and c.get(f):
                maj[f] = c[f]
        # Suivi : la modification la plus récente gagne, champ par champ.
        horo_moi = json.loads(moi.get("horodatage") or "{}")
        horo_lui = json.loads(c.get("horodatage") or "{}")
        for f in db.CHAMPS_SUIVI:
            if _plus_recent(horo_lui.get(f), horo_moi.get(f)):
                if c.get(f) != moi.get(f):
                    maj[f] = c.get(f)
                horo_moi[f] = horo_lui[f]
            elif not horo_lui.get(f) and not horo_moi.get(f) and not moi.get(f) and c.get(f) and f != "statut":
                maj[f] = c[f]  # jamais modifié à la main : on complète ce qui manque
        if horo_moi != json.loads(moi.get("horodatage") or "{}"):
            maj["horodatage"] = json.dumps(horo_moi, sort_keys=True)
        if _plus_recent(c.get("modifie_le"), moi.get("modifie_le")):
            maj["modifie_le"], maj["modifie_par"] = c.get("modifie_le"), c.get("modifie_par")
        # Recherche d'emails et analyse du site : la plus récente.
        if _plus_recent(c.get("enrichi_le"), moi.get("enrichi_le")):
            maj["enrichi_le"], maj["site_etat"] = c.get("enrichi_le"), c.get("site_etat")
            if c.get("instagram"):
                maj["instagram"] = c["instagram"]
        # Vérification de l'entreprise : la plus récente.
        if _plus_recent(c.get("entreprise_le"), moi.get("entreprise_le")):
            maj["entreprise_le"], maj["entreprise"] = c.get("entreprise_le"), c.get("entreprise")
            maj["siren_force"] = c.get("siren_force")
        maj = {k: v for k, v in maj.items() if moi.get(k) != v}
        if maj:
            conn.execute(f"UPDATE commerces SET {', '.join(k + '=?' for k in maj)} WHERE cle=?",
                         list(maj.values()) + [cle])
            modifiees.add(cle)
    connus = {r[0] for r in conn.execute("SELECT uid FROM historique")}
    for h in donnees.get("historique", []):
        if h.get("uid") and h["uid"] not in connus:
            conn.execute("INSERT INTO historique(cle, date, canal, detail, auteur, uid) VALUES(?, ?, ?, ?, ?, ?)",
                         (h.get("cle"), h.get("date"), h.get("canal"), h.get("detail"), h.get("auteur"), h["uid"]))
            connus.add(h["uid"])
            modifiees.add(h.get("cle"))
    conn.commit()
    modifiees.discard(None)
    return modifiees


def importer(conn, dossier, poste, deja_lus):
    """Lit les fichiers des coéquipiers qui ont changé depuis la dernière fois.

    `deja_lus` : {nom de fichier: date de modification}, tenu à jour ici.
    Renvoie (clés modifiées, [{prenom, vu}] des coéquipiers)."""
    modifiees, coequipiers = set(), []
    for f in fichiers_coequipiers(dossier, poste):
        try:
            mtime = f.stat().st_mtime
        except OSError:
            continue
        try:
            donnees = None
            if deja_lus.get(f.name, {}).get("mtime") != mtime:
                donnees = json.loads(f.read_text(encoding="utf-8"))
                modifiees |= fusionner(conn, donnees)
                deja_lus[f.name] = {"mtime": mtime, "prenom": donnees.get("prenom") or "?"}
        except (OSError, ValueError):
            continue  # fichier en cours de synchronisation par le cloud : on réessaiera
        coequipiers.append({"prenom": deja_lus.get(f.name, {}).get("prenom", "?"), "vu": mtime})
    return modifiees, coequipiers


def adapter_chemin(chemin):
    """Retrouve sur cet ordinateur un dossier partagé noté avec le chemin d'un autre ordinateur.
    Ex. « G:\\Mon Drive\\Review Maker équipe » (Windows) devient, sur Mac,
    « ~/Library/CloudStorage/GoogleDrive-…/Mon Drive/Review Maker équipe ». None si introuvable."""
    morceaux = [m for m in re.split(r"[\\/]+", chemin or "") if m]
    for i, morceau in enumerate(morceaux):
        if morceau.lower() in ("mon drive", "my drive", "google drive", "onedrive", "dropbox"):
            reste = morceaux[i + 1:]
            for racine in dossiers_detectes():
                if Path(racine).name.lower() in ("mon drive", "my drive", "google drive") or \
                        Path(racine).name.lower().startswith(morceau.lower().split()[0]):
                    cible = Path(racine).joinpath(*reste)
                    try:
                        if cible.is_dir():
                            return str(cible)
                    except OSError:
                        continue
    return None


def dossiers_detectes():
    """Dossiers Google Drive, OneDrive et Dropbox présents sur cet ordinateur (Windows ou Mac)."""
    profil = Path(os.environ.get("USERPROFILE") or Path.home())
    candidats = []
    for lettre in "GHIJKLMNOPQRSTUVWXYZDEF":
        for nom in ("Mon Drive", "My Drive"):
            candidats.append(Path(f"{lettre}:/{nom}"))
    candidats += [profil / "Google Drive", profil / "Mon Drive", profil / "My Drive"]
    for variable in ("OneDrive", "OneDriveConsumer", "OneDriveCommercial"):
        if os.environ.get(variable):
            candidats.append(Path(os.environ[variable]))
    candidats += [profil / "OneDrive", profil / "Dropbox"]
    # Mac : Google Drive pour ordinateur range le Drive dans ~/Library/CloudStorage/GoogleDrive-<adresse>/Mon Drive
    # (ou /Volumes/GoogleDrive/Mon Drive avec les anciennes versions).
    stockage = Path.home() / "Library" / "CloudStorage"
    for racine in sorted(stockage.glob("GoogleDrive-*")) + sorted(Path("/Volumes").glob("GoogleDrive*")):
        candidats += [racine / "Mon Drive", racine / "My Drive"]
    candidats += sorted(stockage.glob("OneDrive*")) + sorted(stockage.glob("Dropbox*"))
    vus, trouves = set(), []
    for p in candidats:
        try:
            if p.is_dir() and str(p).lower() not in vus:
                vus.add(str(p).lower())
                trouves.append(str(p))
        except OSError:
            continue
    return trouves
