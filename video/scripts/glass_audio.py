"""Bande son de GlassPromo : musique 120 BPM + effets calés sur src/glass/cues.json.
Sortie : public/glass/soundtrack_raw.wav (normalisée ensuite à -14 LUFS avec ffmpeg)."""
import json, os, sys, wave
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
import glass_sfx as S
from glass_sfx import SR

ROOT = os.path.join(os.path.dirname(__file__), "..")
cues = json.load(open(os.path.join(ROOT, "src/glass/cues.json")))
DUR = cues["duration"]; BPM = cues["bpm"]; BEAT = 60 / BPM; BAR = 4 * BEAT
N = int((DUR + 1.5) * SR)
rng = np.random.default_rng(21)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
t_ = S.t_

def place(bus, x, t, gain=1.0):
    i = int(t * SR); j = min(len(bus), i + len(x))
    if j > i: bus[i:j] += x[: j - i] * gain

def lp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2)); return signal.lfilter(b, a, x, axis=0)
def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high"); return signal.lfilter(b, a, x, axis=0)

# ---------------- musique
# E – C#m – A – B (I vi IV V), une mesure (2 s) par accord
PROG = [[52, 56, 59, 63], [49, 56, 59, 64], [45, 52, 57, 61], [47, 54, 59, 63]]
sec = lambda a, b: (a, b)
DRUMS = [sec(4, 28), sec(30, 32)]          # pause partielle pendant le tag
HATS = [sec(8, 28)]
CLAP = [sec(8, 28)]
ARP = [sec(0, 36)]
inside = lambda t, R: any(a <= t < b for a, b in R)

pad = np.zeros((N, 2)); arp = np.zeros((N, 2)); bass = np.zeros((N, 2)); drums = np.zeros((N, 2))
nbars = int(np.ceil(DUR / BAR)) + 1
for bi in range(nbars):
    t0 = bi * BAR; ch = PROG[bi % 4]
    # nappe : scies désaccordées, attaque lente
    d = BAR + 0.8; tt = t_(d); e = np.minimum(1, tt / 0.7) * np.clip((d - tt) / 0.8, 0, 1)
    for m in ch:
        for det, pp in ((-0.09, -0.6), (0.09, 0.6), (0.0, 0)):
            w = signal.sawtooth(2 * np.pi * mtof(m + 12) * 2 ** (det / 12) * tt + rng.uniform(0, 6))
            place(pad, S.pan(w * e * 0.035, pp), t0)
    # basse : racine, croches légèrement pompées
    root = ch[0] - 12
    for k in range(8):
        tb = t0 + k * BEAT / 2; dd = BEAT / 2 * 0.92; tt = t_(dd)
        x = (np.sin(2 * np.pi * mtof(root) * tt) + 0.25 * np.sin(4 * np.pi * mtof(root) * tt)) * np.minimum(1, tt / 0.01) * np.exp(-tt * 3)
        if tb >= 4: place(bass, S.pan(x * 0.22, 0), tb)
    # arpège en doubles croches
    notes = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[1] + 24, ch[3] + 12, ch[2] + 12, ch[1] + 24, ch[2] + 24]
    for k in range(16):
        ta = t0 + k * BEAT / 4
        if not inside(ta, ARP) or ta >= DUR: continue
        f = mtof(notes[k % 8]); dd = 0.32; tt = t_(dd)
        x = (signal.square(2 * np.pi * f * tt, 0.3) * 0.5 + np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 14)
        lvl = 0.05 if ta < 4 else 0.065
        place(arp, S.pan(x * lvl, 0.35 * np.sin(k * 0.8)), ta)
arp = lp(arp, 3800)
# écho ping-pong sur l'arpège
dl = int(BEAT * 0.75 * SR); echo = np.zeros_like(arp); echo[dl:, 0] = arp[:-dl, 1] * 0.35; echo[dl:, 1] = arp[:-dl, 0] * 0.35
arp += echo
pad = lp(pad, 1700)
# batterie
kick = S.thump(150, 45, 0.42)[:, 0]
for b in range(int(DUR / BEAT) + 1):
    tb = b * BEAT
    if inside(tb, DRUMS):
        place(drums, np.stack([kick, kick], 1) * 0.42, tb)
    if inside(tb, CLAP) and b % 2 == 1:
        L = int(0.25 * SR); nz = hp(rng.standard_normal(L), 900) * np.exp(-np.arange(L) / SR * 22)
        place(drums, S.pan(nz * 0.12, 0), tb)
    for h in (0.5,):
        th = tb + h * BEAT
        if inside(th, HATS):
            L = int(0.05 * SR); hh = hp(rng.standard_normal(L), 7500) * np.exp(-np.arange(L) / SR * 90)
            place(drums, S.pan(hh * 0.09, 0.3), th)
# pompe (sidechain) sur nappe et arpège, calée sur le kick
pump = np.ones(N)
for b in range(int(DUR / BEAT) + 1):
    tb = b * BEAT
    if inside(tb, DRUMS):
        i = int(tb * SR); L = int(BEAT * SR); env = 1 - 0.55 * np.exp(-np.arange(L) / SR * 9)
        pump[i:i + L] = np.minimum(pump[i:i + L], env[: max(0, min(L, N - i))])
music = S.reverb(pad * pump[:, None] + arp * (0.6 + 0.4 * pump[:, None]), 0.3, 2.6)[:N] + bass + drums
# fin : la musique s'éteint après le dernier accord
t = np.arange(N) / SR
music *= np.clip((DUR + 0.2 - t) / 1.8, 0, 1)[:, None] * np.minimum(1, t / 0.3)[:, None]

# ---------------- effets
sfx = np.zeros((N, 2))
def ticks(d=0.9):
    out = np.zeros((int(d * SR) + 4000, 2))
    for k in range(14):
        place(out, S.tick(2200 + 60 * k, 0.04, 0), d * (k / 14) ** 1.5)
    return out
def nfc():
    a = S.tick(1760, 0.18, 0); b = S.tick(2640, 0.22, 0)
    out = np.zeros((int(0.5 * SR), 2)); place(out, a, 0); place(out, b, 0.09)
    return S.reverb(out, 0.3, 1.2)
def ding():
    d = 1.6; tt = t_(d); x = np.zeros(len(tt))
    for f, g in ((1318.5, 1), (1975.5, 0.5), (2637, 0.25)):
        x += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 4) * g
    return S.reverb(S.norm(S.pan(x, 0)), 0.35, 2.0)
def click():
    return S.norm(np.concatenate([S.tick(3200, 0.03, 0), S.tick(900, 0.06, 0)]))
LIB = {
    "shimmer": lambda: S.shimmer(1.6, 2600, 10, 0),
    "riser": lambda: S.riser(1.0, 400, 7000),
    "boom": lambda: S.impact(2.2),
    "whoosh": lambda: S.whoosh(0.6, 250, 4200, -0.5, 0.5, 0.62),
    "swish": lambda: S.whoosh(0.3, 900, 5500, -0.3, 0.3, 0.6),
    "pop": lambda: S.pop(1100, 260, 0.14),
    "ding": ding, "tick": lambda: S.tick(2400, 0.05, 0), "ticks": ticks, "nfc": nfc, "click": click,
}
cache = {}
for name, at, db in cues["sfx"]:
    if name not in cache: cache[name] = LIB[name]()
    x = cache[name]
    # le riser se termine sur sa marque : il démarre plus tôt
    start = at - (len(x) / SR * 0.92 if name == "riser" else 0) if name == "riser" else at
    if name == "whoosh": start = at - 0.3
    place(sfx, x, max(0, start), 10 ** (db / 20))

mix = music * 0.72 + sfx * 1.7
mix = mix[: int(DUR * SR)]
mix /= np.abs(mix).max() / 0.89
out = os.path.join(ROOT, "public/glass/soundtrack_raw.wav")
w = wave.open(out, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes()); w.close()
print("ok", out, len(mix) / SR)
