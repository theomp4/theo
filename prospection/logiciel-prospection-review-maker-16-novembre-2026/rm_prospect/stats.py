"""Chiffres du tableau de bord : activité par semaine, entonnoir, taux de réponse par type."""
from datetime import datetime, timedelta

import pandas as pd

from .db import STATUTS_CONTACTES


def _lundi(d):
    d = datetime.fromisoformat(d) if isinstance(d, str) else d
    return (d - timedelta(days=d.weekday())).date()


def par_semaine(conn, espace, semaines=6):
    """Emails envoyés, réponses et ventes par semaine (les `semaines` dernières)."""
    debut = _lundi(datetime.now()) - timedelta(weeks=semaines - 1)
    index = [debut + timedelta(weeks=i) for i in range(semaines)]
    df = pd.DataFrame({"semaine": index, "Emails envoyés": 0, "Réponses": 0, "Ventes": 0}).set_index("semaine")
    envois = conn.execute("SELECT e.date FROM emails_envoyes e JOIN commerces c ON c.cle=e.cle "
                          "WHERE c.espace=? AND e.date>=?", (espace, debut.isoformat())).fetchall()
    for r in envois:
        df.loc[_lundi(r["date"]), "Emails envoyés"] += 1
    hist = conn.execute("SELECT h.date, h.canal, h.detail FROM historique h JOIN commerces c ON c.cle=h.cle "
                        "WHERE c.espace=? AND h.date>=?", (espace, debut.isoformat())).fetchall()
    for r in hist:
        if r["canal"] == "Vente":
            df.loc[_lundi(r["date"]), "Ventes"] += 1
        elif (r["detail"] or "").startswith(("Réponse reçue", "Désinscription")):
            df.loc[_lundi(r["date"]), "Réponses"] += 1
    df.index = [d.strftime("%d/%m") for d in df.index]
    df.index.name = "semaine"
    return df


def entonnoir(conn, espace):
    """[(étape, nombre)] du prospect à la vente."""
    statuts = dict(conn.execute("SELECT statut, COUNT(*) FROM commerces WHERE espace=? GROUP BY statut",
                                (espace,)).fetchall())
    total = sum(statuts.values())
    contactes = sum(statuts.get(s, 0) for s in STATUTS_CONTACTES)
    repondu = sum(statuts.get(s, 0) for s in ("A répondu", "Intéressé", "Vendu", "Refus"))
    interesses = statuts.get("Intéressé", 0) + statuts.get("Vendu", 0)
    return [("Commerces trouvés", total), ("Contactés", contactes), ("Ont répondu", repondu),
            ("Intéressés", interesses), ("Vendus", statuts.get("Vendu", 0))]


def taux_par_type(conn, espace):
    """Taux de réponse par type de commerce, parmi les commerces contactés."""
    lignes = conn.execute("SELECT categorie, statut FROM commerces WHERE espace=?", (espace,)).fetchall()
    df = pd.DataFrame([dict(r) for r in lignes], columns=["categorie", "statut"])
    df = df[df.statut.isin(STATUTS_CONTACTES)]
    if df.empty:
        return pd.DataFrame(columns=["Type", "Contactés", "Taux de réponse (%)"])
    df["repondu"] = df.statut.isin(["A répondu", "Intéressé", "Vendu", "Refus"])
    g = df.groupby("categorie").agg(contactes=("statut", "size"), repondu=("repondu", "sum")).reset_index()
    g["taux"] = (g.repondu / g.contactes * 100).round(0)
    g = g.sort_values("taux", ascending=False)
    return g.rename(columns={"categorie": "Type", "contactes": "Contactés", "taux": "Taux de réponse (%)"})[
        ["Type", "Contactés", "Taux de réponse (%)"]]
