"""Base de données locale SQLite : un seul fichier, data/prospection.db.

Deux espaces : « nfc » (tags avis Google) et « web » (sites internet). Un même commerce
peut être prospect dans les deux espaces : chaque fiche a donc une clé « espace:place_id ».
"""
import json
import os
import shutil
import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = Path(os.environ.get("RM_DB", DATA_DIR / "prospection.db"))  # RM_DB : base de test

ESPACES = {"nfc": "Tags NFC", "web": "Sites internet"}
STATUTS = ["À contacter", "Contacté", "Relance", "A répondu", "Intéressé", "Vendu", "Refus", "Ne plus contacter"]
STATUTS_CONTACTES = ["Contacté", "Relance", "A répondu", "Intéressé", "Vendu", "Refus"]

# Données Google : selon les CGU de Google Maps Platform, seul place_id peut être
# conservé durablement. Les autres champs Google sont effacés après 30 jours
# (voir purger_donnees_google) et se rafraîchissent par une nouvelle recherche.
GOOGLE_FIELDS = ["nom", "adresse", "telephone", "site_web", "note", "nb_avis",
                 "type_google", "lat", "lng", "lien_maps", "google_maj"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS commerces (
    cle TEXT PRIMARY KEY,
    espace TEXT DEFAULT 'nfc',
    place_id TEXT,
    nom TEXT, adresse TEXT, telephone TEXT, site_web TEXT,
    note REAL, nb_avis INTEGER, type_google TEXT,
    lat REAL, lng REAL, lien_maps TEXT, google_maj TEXT,
    -- Données à toi (conservées) :
    ville_recherche TEXT, pays TEXT DEFAULT 'FR', categorie TEXT,
    score INTEGER, raisons TEXT,
    email TEXT, instagram TEXT, enrichi_le TEXT,
    site_etat TEXT,
    statut TEXT DEFAULT 'À contacter',
    notes TEXT DEFAULT '',
    relance_le TEXT,
    ajoute_le TEXT
);
CREATE TABLE IF NOT EXISTS historique (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cle TEXT, date TEXT, canal TEXT, detail TEXT
);
CREATE TABLE IF NOT EXISTS emails_envoyes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cle TEXT, email TEXT, date TEXT, sujet TEXT, etape TEXT
);
CREATE TABLE IF NOT EXISTS desinscrits (
    email TEXT PRIMARY KEY, date TEXT
);
CREATE TABLE IF NOT EXISTS compteur_api (
    mois TEXT PRIMARY KEY, requetes INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS depenses_ia (
    mois TEXT PRIMARY KEY, dollars REAL DEFAULT 0, appels INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reglages (
    cle TEXT PRIMARY KEY, valeur TEXT
);
"""


# Travail en équipe : qui modifie (prénom choisi dans Réglages) et quand, champ par champ,
# pour fusionner les fiches des coéquipiers (voir equipe.py).
AUTEUR = ""
CHAMPS_SUIVI = ["statut", "notes", "relance_le", "email"]  # modifiés à la main dans la fiche

MIGRATIONS = [
    ("commerces", "horodatage", "TEXT DEFAULT '{}'"),  # {champ: date de la dernière modification}
    ("commerces", "modifie_le", "TEXT"),
    ("commerces", "modifie_par", "TEXT"),
    ("historique", "auteur", "TEXT"),
    ("historique", "uid", "TEXT"),                     # identifiant unique : évite les doublons entre coéquipiers
    ("commerces", "entreprise", "TEXT"),               # vérification dans l'annuaire des entreprises (JSON, voir entreprises.py)
    ("commerces", "entreprise_le", "TEXT"),
    ("commerces", "siren_force", "TEXT"),              # SIREN corrigé à la main dans la fiche
]


def _rendre_modifiable(path):
    """Enlève la protection « lecture seule » du dossier data et de la base (fichier copié depuis
    une autre version, un ZIP, une clé USB, un autre ordinateur…)."""
    for p in (path.parent, path, Path(f"{path}-journal"), Path(f"{path}-wal"), Path(f"{path}-shm")):
        try:
            if p.exists() and not os.access(p, os.W_OK):
                os.chmod(p, p.stat().st_mode | (0o700 if p.is_dir() else 0o600))
        except OSError:
            pass


def _ecriture_possible(conn):
    try:
        conn.execute("CREATE TABLE IF NOT EXISTS test_ecriture (x)")
        conn.execute("INSERT INTO test_ecriture VALUES (1)")
        conn.execute("DELETE FROM test_ecriture")
        conn.commit()
        return True
    except sqlite3.OperationalError:
        conn.rollback()
        return False


def _ouvrir(path):
    conn = sqlite3.connect(path, check_same_thread=False, timeout=20)
    conn.row_factory = sqlite3.Row
    return conn


def connect(path=None):
    path = Path(path) if path else DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    _rendre_modifiable(path)
    conn = _ouvrir(path)
    if path.exists() and not _ecriture_possible(conn):
        # Toujours en lecture seule : on recrée le fichier (une copie neuve nous appartient).
        conn.close()
        copie = path.with_name(path.name + ".copie")
        shutil.copyfile(path, copie)
        os.replace(copie, path)
        conn = _ouvrir(path)
        if not _ecriture_possible(conn):
            raise RuntimeError(
                f"Impossible d'écrire dans {path}. Déplace le dossier du logiciel dans Documents "
                "(pas dans iCloud, une clé USB ou Téléchargements), puis relance-le.")
    conn.executescript(SCHEMA)
    for table, colonne, type_ in MIGRATIONS:
        if colonne not in {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {colonne} {type_}")
    sans_uid = conn.execute("SELECT id FROM historique WHERE uid IS NULL").fetchall()
    for (i,) in sans_uid:
        conn.execute("UPDATE historique SET uid=? WHERE id=?", (uuid.uuid4().hex, i))
    conn.commit()
    return conn


def maintenant():
    return datetime.now().isoformat(timespec="seconds")


def maintenant_precis():
    """Avec les millisecondes : départage deux modifications faites la même seconde."""
    return datetime.now().isoformat(timespec="milliseconds")


def cle_de(espace, place_id):
    return f"{espace}:{place_id}"


# --- Réglages ---------------------------------------------------------------

def get_reglage(conn, cle, defaut=""):
    row = conn.execute("SELECT valeur FROM reglages WHERE cle=?", (cle,)).fetchone()
    return row["valeur"] if row else defaut


def set_reglage(conn, cle, valeur):
    conn.execute("INSERT INTO reglages(cle, valeur) VALUES(?, ?) "
                 "ON CONFLICT(cle) DO UPDATE SET valeur=excluded.valeur", (cle, str(valeur)))
    conn.commit()


# --- Compteurs (Google et IA) ------------------------------------------------

def mois_courant():
    return datetime.now().strftime("%Y-%m")


def requetes_du_mois(conn):
    row = conn.execute("SELECT requetes FROM compteur_api WHERE mois=?", (mois_courant(),)).fetchone()
    return row["requetes"] if row else 0


def compter_requete(conn, n=1):
    conn.execute("INSERT INTO compteur_api(mois, requetes) VALUES(?, ?) "
                 "ON CONFLICT(mois) DO UPDATE SET requetes=requetes+?", (mois_courant(), n, n))
    conn.commit()


def depense_ia_du_mois(conn):
    row = conn.execute("SELECT dollars, appels FROM depenses_ia WHERE mois=?", (mois_courant(),)).fetchone()
    return (row["dollars"], row["appels"]) if row else (0.0, 0)


def compter_depense_ia(conn, dollars):
    conn.execute("INSERT INTO depenses_ia(mois, dollars, appels) VALUES(?, ?, 1) "
                 "ON CONFLICT(mois) DO UPDATE SET dollars=dollars+?, appels=appels+1",
                 (mois_courant(), dollars, dollars))
    conn.commit()


# --- Commerces ---------------------------------------------------------------

def enregistrer_commerce(conn, c):
    """Ajoute un commerce ou met à jour ses données Google sans toucher au suivi.

    `c` contient au moins place_id et espace."""
    cle = cle_de(c.get("espace", "nfc"), c["place_id"])
    existe = conn.execute("SELECT 1 FROM commerces WHERE cle=?", (cle,)).fetchone()
    if existe:
        champs = GOOGLE_FIELDS + ["score", "raisons"]
        conn.execute(f"UPDATE commerces SET {', '.join(f + '=?' for f in champs)} WHERE cle=?",
                     [c.get(f) for f in champs] + [cle])
        return False
    champs = ["cle", "espace", "place_id"] + GOOGLE_FIELDS + ["ville_recherche", "pays", "categorie",
                                                              "score", "raisons", "ajoute_le"]
    c = {"espace": "nfc", "pays": "FR", **c, "cle": cle, "ajoute_le": maintenant()}
    conn.execute(f"INSERT INTO commerces({', '.join(champs)}) VALUES({', '.join('?' * len(champs))})",
                 [c.get(f) for f in champs])
    return True


def maj_commerce(conn, cle, **valeurs):
    if not valeurs:
        return
    suivis = [k for k in valeurs if k in CHAMPS_SUIVI]
    if suivis:
        row = conn.execute("SELECT horodatage FROM commerces WHERE cle=?", (cle,)).fetchone()
        horo = json.loads((row and row["horodatage"]) or "{}")
        quand = maintenant_precis()
        horo.update({k: quand for k in suivis})
        valeurs = {**valeurs, "horodatage": json.dumps(horo, sort_keys=True),
                   "modifie_le": quand, "modifie_par": AUTEUR or None}
    conn.execute(f"UPDATE commerces SET {', '.join(k + '=?' for k in valeurs)} WHERE cle=?",
                 list(valeurs.values()) + [cle])
    conn.commit()


def ajouter_historique(conn, cle, canal, detail):
    conn.execute("INSERT INTO historique(cle, date, canal, detail, auteur, uid) VALUES(?, ?, ?, ?, ?, ?)",
                 (cle, maintenant(), canal, detail, AUTEUR or None, uuid.uuid4().hex))
    conn.commit()


def purger_donnees_google(conn, jours=30):
    """Efface les champs Google plus vieux que `jours` (CGU Google). Garde place_id et ton suivi."""
    limite = (datetime.now() - timedelta(days=jours)).isoformat(timespec="seconds")
    sets = ", ".join(f"{f}=NULL" for f in GOOGLE_FIELDS if f != "nom")
    # Le nom reste affiché pour que tu reconnaisses ta fiche ; il revient de toute façon à la prochaine recherche.
    cur = conn.execute(f"UPDATE commerces SET {sets} WHERE google_maj IS NOT NULL AND google_maj < ?", (limite,))
    conn.commit()
    return cur.rowcount


# --- Désinscriptions ---------------------------------------------------------

def est_desinscrit(conn, email):
    return conn.execute("SELECT 1 FROM desinscrits WHERE email=?", (email.strip().lower(),)).fetchone() is not None


def desinscrire(conn, email):
    email = email.strip().lower()
    conn.execute("INSERT OR IGNORE INTO desinscrits(email, date) VALUES(?, ?)", (email, maintenant()))
    conn.execute("UPDATE commerces SET statut='Ne plus contacter' WHERE lower(email)=?", (email,))
    conn.commit()


def emails_envoyes_aujourdhui(conn):
    jour = datetime.now().strftime("%Y-%m-%d")
    return conn.execute("SELECT COUNT(*) FROM emails_envoyes WHERE date LIKE ?", (jour + "%",)).fetchone()[0]
