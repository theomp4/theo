"""Génère les effets sonores de la vidéo (aucune ressource externe)."""
import numpy as np, wave, os
SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
rng = np.random.default_rng(7)

def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    st = np.stack([x, x], 1)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())

def t_(d): return np.arange(int(SR * d)) / SR

def bandsweep(noise, f0, f1, q=6):
    # filtre passe-bande à fréquence glissante (biquad mis à jour par bloc)
    out = np.zeros_like(noise); n = len(noise); blk = 256
    z1 = z2 = 0.0
    for i in range(0, n, blk):
        f = f0 * (f1 / f0) ** (i / n)
        w0 = 2 * np.pi * f / SR; al = np.sin(w0) / (2 * q)
        b0, b2 = al, -al; a0 = 1 + al; a1 = -2 * np.cos(w0); a2 = 1 - al
        b0, b2, a1, a2 = b0 / a0, b2 / a0, a1 / a0, a2 / a0
        for j in range(i, min(i + blk, n)):
            x = noise[j]; y = b0 * x + z1
            z1 = -a1 * y + z2; z2 = b2 * x - a2 * y
            out[j] = y
    return out

def whoosh(d, f0, f1):
    t = t_(d); env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return bandsweep(rng.standard_normal(len(t)), f0, f1, 2.5) * env

save("whoosh", whoosh(0.55, 300, 3200))
save("whoosh-soft", whoosh(0.7, 200, 1400))

t = t_(0.18); f = 900 * np.exp(-t * 18) + 380
save("pop", np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26))

t = t_(0.05)
save("tick", rng.standard_normal(len(t)) * np.exp(-t * 160) * 0.6 + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120))

t = t_(0.12)
save("click", np.sin(2 * np.pi * 1600 * t) * np.exp(-t * 60) + rng.standard_normal(len(t)) * np.exp(-t * 200) * 0.4)

t = t_(1.4)
ding = sum(a * np.sin(2 * np.pi * fr * t) * np.exp(-t * dk) for fr, a, dk in [(1318.5, 1, 3), (1975.5, .5, 4), (2637, .25, 6)])
save("ding", ding)

t = t_(1.8)
riser = bandsweep(rng.standard_normal(len(t)), 200, 6000, 3) * (t / t[-1]) ** 2
save("riser", riser)

t = t_(1.2)
boom = np.sin(2 * np.pi * (55 * t + 40 * (1 - np.exp(-t * 8)) / 8)) * np.exp(-t * 4)
save("boom", boom + whoosh(1.2, 120, 500) * 0.25)

t = t_(0.9)
shim = sum(np.sin(2 * np.pi * fr * t) * np.exp(-t * 5) * np.clip(t * 40, 0, 1) for fr in [2093, 2637, 3136, 4186])
save("shimmer", shim * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)))
