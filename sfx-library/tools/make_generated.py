"""Génère les sons synthétisés de sfx-library/generated (risers, booms, whooshs…), 48 kHz stéréo.
Reprend la synthèse de video/scripts/glass_sfx.py."""
import os, sys, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "video", "scripts"))
import glass_sfx as S

OUT = os.path.join(HERE, "..", "generated")
def save(name, x):
    x = np.asarray(x, dtype=float)
    if x.ndim == 1: x = np.stack([x, x], 1)
    x = x / (np.abs(x).max() + 1e-9) * 0.89
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(S.SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())

save("whoosh-court", S.whoosh(0.35, 800, 5000, -0.3, 0.3, 0.6))
save("whoosh-moyen", S.whoosh(0.6, 250, 4200, -0.5, 0.5, 0.62))
save("whoosh-long", S.whoosh(1.1, 200, 3200, -0.7, 0.7, 0.6))
save("whoosh-montant", S.whoosh(0.95, 350, 5500, 0.0, 0.0, 0.55))
save("whoosh-descendant", S.whoosh(0.6, 3500, 400, 0.0, 0.0, 0.7))
save("riser-court", S.riser(0.7, 400, 7000))
save("riser-long", S.riser(2.0, 300, 8000))
save("swell-inverse", S.rev_swell(0.9))
save("boom-impact", S.impact(2.2))
save("boom-sub", S.thump(120, 38, 0.9))
save("pop-doux", S.pop(1100, 260, 0.14))
save("pop-grave", S.pop(700, 150, 0.2))
save("scintillement", S.shimmer(1.6, 2600, 10, 0))
save("scintillement-long", S.shimmer(2.6, 3000, 18, 0))
save("tick", S.tick(2400, 0.05, 0))
save("scan-hologramme", S.scan(2.4))
t = S.t_(1.6); x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 4) * g for f, g in ((1318.5, 1), (1975.5, .5), (2637, .25)))
save("ding", S.reverb(S.pan(x, 0), 0.35, 2.0))
print("ok")
