"""Bande-son complète de la vidéo (musique + effets), synthétisée de zéro.

128 BPM, la mineur. Les temps (« beats ») correspondent à la timeline de src/timeline.ts :
  b0–4    intro « vieux site » (musique cheap étouffée, glitchs)
  b4      DROP
  b8–16   vitrine des sites (une coupe tous les 2 temps)
  b16–20  mur de sites
  b20–24  responsive, tape stop à b23.5
  b24–32  Google (montée, roulement, silence à b31.75)
  b32–44  logo + appel à l'action
Sortie : public/audio/soundtrack.wav (48 kHz, stéréo).
"""
import os
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
BPM = 128
BEAT = 60 / BPM
TOTAL_BEATS = 44
DUR = TOTAL_BEATS * BEAT + 0.3
N = int(DUR * SR)
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "soundtrack.wav")
rng = np.random.default_rng(42)


def b2s(b):
    return int(round(b * BEAT * SR))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def sweep_lp(x, f0, f1, blocks=64):
    """Passe-bas dont la coupure glisse de f0 à f1 (exponentiel)."""
    out = np.zeros_like(x)
    n = len(x)
    edges = np.linspace(0, n, blocks + 1).astype(int)
    zi = None
    for i in range(blocks):
        f = f0 * (f1 / f0) ** (i / max(1, blocks - 1))
        sos = butter(2, min(f, SR / 2 - 100), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        seg, zi = sosfilt(sos, x[edges[i]:edges[i + 1]], zi=zi)
        out[edges[i]:edges[i + 1]] = seg
    return out


def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * freq + phase) % 1.0) - 1


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, x, at, gain=1.0, pan=0.0):
        """at en secondes ; pan -1 (gauche) .. 1 (droite) ; x mono ou (L, R)."""
        s = int(at * SR)
        if s >= N:
            return
        if isinstance(x, tuple):
            l, r = x
        else:
            l = r = x
        e = min(N, s + len(l))
        gl = gain * np.sqrt((1 - pan) / 2) * np.sqrt(2)
        gr = gain * np.sqrt((1 + pan) / 2) * np.sqrt(2)
        if s < 0:
            l, r, s = l[-s:], r[-s:], 0
            e = min(N, len(l))
        self.L[s:e] += l[: e - s] * gl
        self.R[s:e] += r[: e - s] * gr


drums, music, fx, verb_send = Bus(), Bus(), Bus(), Bus()

# ---------------------------------------------------------------- instruments


def kick(dur=0.42, f0=170, f1=46, punch=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 400) * 0.35 * punch
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 900, 4200)
    env = np.zeros(n)
    for d in (0.0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * 90), 0)
    env += np.where(t >= 0.03, np.exp(-(t - 0.03) * 14) * 0.5, 0)
    return noise * env


def snare():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    noise = bp(rng.standard_normal(n), 1500, 8000) * np.exp(-t * 22)
    return tone * 0.5 + noise


def hat(open_=False):
    d = 0.22 if open_ else 0.045
    n = int(d * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 7500, 4)
    return x * np.exp(-t * (14 if open_ else 90))


def crash(dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 4500, 2) * np.exp(-t * 2.2)


def supersaw(midis, dur, voices=7, detune=0.16, cutoff=3200):
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in midis:
        f = mtof(m)
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
            fv = f * 2 ** (d / 12)
            s = saw(fv, n, rng.random())
            if v % 2:
                L += s
            else:
                R += s
            if v == voices // 2:
                L += s * 0.5
                R += s * 0.5
    sc = 1.0 / (len(midis) * voices)
    return lp(L * sc, cutoff), lp(R * sc, cutoff)


def pluck(m, dur=0.22, cutoff=5000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    x = saw(f, n) * 0.6 + np.sign(np.sin(2 * np.pi * f * 2 ** (0.08 / 12) * t)) * 0.4
    x = lp(x, cutoff) * np.exp(-t * 16)
    return x


def bass_note(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    x = saw(f, n) * 0.7 + np.sin(2 * np.pi * f * t) * 0.8
    env = np.minimum(1, t * 400) * np.exp(-t * 5)
    return lp(x, 520) * env


def sub(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * mtof(m) * t) * np.minimum(1, t * 200) * np.minimum(1, (dur - t) * 60)


def square_lead(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * mtof(m) * t))
    return x * np.minimum(1, t * 300) * np.exp(-t * 3)


def noise_riser(dur, f0=300, f1=9000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sweep_lp(rng.standard_normal(n), f0, f1)
    return x * (t / dur) ** 2.2


def whoosh(dur=0.32, f0=400, f1=5000, rev=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sweep_lp(hp(rng.standard_normal(n), 150), f0, f1, 24)
    env = np.sin(np.pi * t / dur) ** 1.5
    if rev:
        env = (t / dur) ** 3
    return x * env


def boom(dur=2.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 32 + 90 * np.exp(-t * 9)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    noise = lp(rng.standard_normal(n), 900) * np.exp(-t * 5) * 0.6
    return np.tanh((body + noise) * 1.8)


def blip(f0, f1, dur=0.09):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38)


def key_click():
    n = int(0.04 * SR)
    t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 1800, 9000) * np.exp(-t * 180) + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 250) * 0.4


def glitch(dur=0.25):
    n = int(dur * SR)
    x = np.zeros(n)
    i = 0
    while i < n:
        seg = int(rng.uniform(0.008, 0.03) * SR)
        kind = rng.integers(3)
        t = np.arange(seg) / SR
        if kind == 0:
            s = np.sign(np.sin(2 * np.pi * rng.uniform(200, 2400) * t))
        elif kind == 1:
            s = rng.standard_normal(seg)
        else:
            s = np.zeros(seg)
        x[i:i + seg] = s[: n - i] * rng.uniform(0.3, 1)
        i += seg
    return np.round(x * 6) / 6  # bitcrush


def zap(dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 50 + 2400 * np.exp(-t * 12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)


def shimmer(dur=1.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * mtof(m) * t + rng.random() * 6) for m in (93, 96, 100, 105, 108))
    return x * np.minimum(1, t * 30) * np.exp(-t * 3) * (0.7 + 0.3 * np.sin(2 * np.pi * 11 * t)) / 5


def bell(m, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4)) * np.exp(-t * 3.2)


# ---------------------------------------------------------------- arrangement

CHORDS = {
    "Am": ([57, 60, 64, 69], 33),
    "F": ([57, 60, 65, 69], 29),
    "C": ([55, 60, 64, 67], 36),
    "G": ([55, 59, 62, 67], 31),
}
# accord par mesure (4 temps), à partir de b4
PROG = [(4, "Am"), (8, "F"), (12, "C"), (16, "G"), (20, "Am"), (24, "F"), (28, "C"), (30, "G")]
PROG_END = 32


def chord_at(b):
    cur = PROG[0][1]
    for start, name in PROG:
        if b >= start:
            cur = name
    return cur


# -- intro : sonnerie « années 2000 » étouffée
melody = [69, 72, 76, 72, 74, 71, 67, 71]
for i, m in enumerate(melody):
    music.add(lp(square_lead(m, BEAT * 0.45), 1400) * 0.18, b2s(i * 0.5) / SR)
for b in range(4):
    drums.add(lp(kick(), 600) * 0.5, b * BEAT)
    if b % 2:
        drums.add(lp(clap(), 1200) * 0.25, b * BEAT)
fx.add(blip(1200, 900, 0.12) * 0.25, 0.02)  # « bip » d'erreur
fx.add(glitch(0.18) * 0.22, 2.0 * BEAT)
fx.add(glitch(0.12) * 0.25, 2.75 * BEAT)
fx.add(glitch(0.3) * 0.3, 3.0 * BEAT)
fx.add(zap() * 0.35, 3.45 * BEAT)
fx.add(noise_riser(BEAT * 1.6, 400, 12000) * 0.4, 2.15 * BEAT)
# trou de silence avant le drop : on coupe tout entre b3.75 et b4 plus bas (gate)

# -- drums principaux
for b in np.arange(4, 32, 0.25):
    in_break = 23.5 <= b < 24
    google_space = 24 <= b < 26
    pre_drop = 31.75 <= b < 32
    if in_break or pre_drop:
        continue
    beat_pos = b % 1
    if beat_pos == 0 and not google_space:
        drums.add(kick() * 0.95, b * BEAT)
        verb_send.add(kick() * 0.05, b * BEAT)
    if beat_pos == 0 and int(b) % 2 == 1 and not google_space:
        c = clap()
        drums.add(c * 0.5, b * BEAT)
        verb_send.add(c * 0.35, b * BEAT)
    if beat_pos == 0.5:
        drums.add(hat(True) * 0.11, b * BEAT, pan=0.15)
    elif not google_space or beat_pos != 0:
        acc = 0.075 if beat_pos in (0.25, 0.75) else 0.05
        drums.add(hat() * acc, b * BEAT, pan=-0.2)
# roulement de caisse claire b30 → b31.75
for b in list(np.arange(30, 31, 0.5)) + list(np.arange(31, 31.5, 0.25)) + list(np.arange(31.5, 31.75, 0.125)):
    v = 0.18 + (b - 30) * 0.15
    drums.add(snare() * v, b * BEAT)
    verb_send.add(snare() * v * 0.4, b * BEAT)
# crashes
for b in (4, 16, 28):
    drums.add(crash() * 0.12, b * BEAT)
    verb_send.add(crash() * 0.05, b * BEAT)

# -- basse : croches à contretemps + sub sur le temps
for b in np.arange(4, 32, 0.5):
    if 23.5 <= b < 24 or b >= 31.75:
        continue
    name = chord_at(b)
    root = CHORDS[name][1]
    if b % 1 == 0.5:
        music.add(bass_note(root + 12, BEAT * 0.45) * 0.5, b * BEAT)
    elif not (24 <= b < 26):
        music.add(sub(root + 12, BEAT * 0.4) * 0.3, b * BEAT)

# -- nappes supersaw (pompées par le kick)
pad = Bus()
for i, (start, name) in enumerate(PROG):
    end = PROG[i + 1][0] if i + 1 < len(PROG) else PROG_END
    cutoff = 2600
    L, R = supersaw(CHORDS[name][0], (end - start) * BEAT + 0.05, cutoff=cutoff)
    if start == 24:  # Google : filtre fermé puis réouverture
        L, R = sweep_lp(L, 500, 3000), sweep_lp(R, 500, 3000)
    if start in (28, 30):
        L, R = sweep_lp(L, 1800, 7000), sweep_lp(R, 1800, 7000)
    pad.add((L, R), start * BEAT, gain=0.32)

# -- arpège pluck (doubles-croches) avec delay
arp = Bus()
pattern = [0, 2, 1, 3, 2, 1, 3, 2]
for k, b in enumerate(np.arange(8, 31.75, 0.25)):
    if 23.5 <= b < 24:
        continue
    notes = CHORDS[chord_at(b)][0]
    m = notes[pattern[k % len(pattern)]] + 12
    cut = 2500 + 3500 * ((k % 16) / 16)
    if 24 <= b < 26:
        cut = 1200
    arp.add(pluck(m, 0.2, cut) * 0.12, b * BEAT, pan=0.35 if k % 2 else -0.35)
# delay croche pointée
d = int(0.75 * BEAT * SR)
arp_L = arp.L.copy()
arp_R = arp.R.copy()
arp_L[d:] += arp.R[:-d] * 0.35
arp_R[d:] += arp.L[:-d] * 0.35
arp_L[2 * d:] += arp.L[:-2 * d] * 0.15
arp_R[2 * d:] += arp.R[:-2 * d] * 0.15

# sidechain sur nappes + arpège + basse
env = np.ones(N)
for b in range(4, 32):
    if 24 <= b < 26 or b == 23:
        continue
    s = b2s(b)
    seg = np.arange(min(N - s, int(BEAT * SR)))
    env[s:s + len(seg)] = np.minimum(env[s:s + len(seg)], 1 - 0.75 * np.exp(-seg / SR / 0.09))
music.L += (pad.L + arp_L * 0.9) * env
music.R += (pad.R + arp_R * 0.9) * env
verb_send.L += (pad.L * 0.25 + arp_L * 0.4) * env
verb_send.R += (pad.R * 0.25 + arp_R * 0.4) * env

# -- final : impact + accord large tenu
fx.add(boom() * 0.9, 32 * BEAT)
drums.add(kick(0.6) * 1.0, 32 * BEAT)
drums.add(crash(3) * 0.18, 32 * BEAT)
verb_send.add(crash(3) * 0.1, 32 * BEAT)
for start, end, name, g in [(32, 36, "Am", 0.34), (36, 40, "F", 0.3), (40, 44.5, "Am", 0.26)]:
    L, R = supersaw([m + 12 if j == 3 else m for j, m in enumerate(CHORDS[name][0])] + [CHORDS[name][0][0] - 12], (end - start) * BEAT, cutoff=4200)
    n = len(L)
    tt = np.arange(n) / SR
    e = np.minimum(1, tt * 8) * (np.exp(-tt * 0.5) if end != 44.5 else np.exp(-tt * 0.9))
    music.add((L * e, R * e), start * BEAT, gain=g)
    verb_send.add((L * e, R * e), start * BEAT, gain=g * 0.5)
    music.add(sub(CHORDS[name][1] + 12, (end - start) * BEAT) * 0.25 * np.exp(-np.arange(int((end - start) * BEAT * SR)) / SR * 0.8), start * BEAT)
# groove léger en demi-temps sur l'outro
for b in (34, 36, 38, 40):
    drums.add(kick() * 0.7, b * BEAT)
for b in (35, 37, 39):
    drums.add(clap() * 0.4, b * BEAT)
    verb_send.add(clap() * 0.35, b * BEAT)
for b in np.arange(32.5, 40, 0.5):
    drums.add(hat(b % 1 == 0.5) * 0.08, b * BEAT)
for i, m in enumerate([81, 84, 88, 93]):
    music.add(bell(m) * 0.12, (33 + i * 0.25) * BEAT, pan=-0.4 + i * 0.25)
    verb_send.add(bell(m) * 0.1, (33 + i * 0.25) * BEAT)
drums.add(kick(0.8) * 0.9, 40 * BEAT)
fx.add(boom(2) * 0.4, 40 * BEAT)

# ---------------------------------------------------------------- effets calés sur l'image
fx.add(boom(1.8) * 0.8, 4 * BEAT)
fx.add(whoosh(0.45, 6000, 300) * 0.3, 4 * BEAT)
fx.add(blip(300, 120, 0.15) * 0.4, 5 * BEAT)
fx.add(blip(500, 180, 0.15) * 0.4, 6 * BEAT)
for b, pan in [(7.7, -0.6), (9.7, 0.6), (11.7, -0.6), (13.7, 0.6), (15.7, -0.6)]:
    fx.add(whoosh(0.3, 500, 7000) * 0.42, b * BEAT, pan=pan)
fx.add(whoosh(0.9, 6000, 250) * 0.4, 16 * BEAT)
fx.add(shimmer() * 0.35, 16.3 * BEAT)
for b in (17, 18, 19):
    fx.add(blip(2400, 1600, 0.06) * 0.12, b * BEAT, pan=(b - 18) * 0.5)
for b in (21, 22):
    fx.add(whoosh(0.25, 800, 6000) * 0.32, (b - 0.15) * BEAT)
    fx.add(blip(900, 500, 0.08) * 0.3, b * BEAT)
fx.add(whoosh(0.45, 400, 8000) * 0.35, 22.9 * BEAT)
# tape stop sonore
fx.add(blip(600, 80, 0.4) * 0.25, 23.5 * BEAT)
# Google
fx.add(boom(0.9) * 0.45, 24 * BEAT)
fx.add(blip(700, 1400, 0.08) * 0.3, 24 * BEAT)
typed = "fleuriste près de moi"
for i in range(len(typed)):
    fx.add(key_click() * 0.22, 24.4 * BEAT + i * 0.055, pan=rng.uniform(-0.3, 0.3))
fx.add(key_click() * 0.4, 24.4 * BEAT + len(typed) * 0.055 + 0.08)
for i in range(5):
    fx.add(blip(1400 + i * 180, 900 + i * 120, 0.07) * 0.18, (26 + i * 0.25) * BEAT)
fx.add(whoosh(0.5, 300, 9000, rev=True) * 0.4, 28 * BEAT - 0.5)
fx.add(bell(88) * 0.22, 28 * BEAT)
fx.add(bell(93) * 0.16, 28.25 * BEAT)
fx.add(shimmer() * 0.3, 28 * BEAT)
fx.add(whoosh(0.6, 300, 6000) * 0.35, 30 * BEAT)
fx.add(noise_riser(BEAT * 3.75, 300, 14000) * 0.55, 28 * BEAT)
fx.add(whoosh(0.5, 6000, 200) * 0.35, 33 * BEAT - 0.1)
fx.add(shimmer(1.8) * 0.35, 34 * BEAT)
fx.add(blip(500, 900, 0.1) * 0.3, 35 * BEAT)
fx.add(blip(700, 1200, 0.1) * 0.25, 35.5 * BEAT)

# ---------------------------------------------------------------- mix


def reverb(L, R, dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    irL = rng.standard_normal(n) * np.exp(-t * 3.2)
    irR = rng.standard_normal(n) * np.exp(-t * 3.2)
    irL = lp(irL, 6000)
    irR = lp(irR, 6000)
    irL /= np.sqrt(np.sum(irL ** 2))
    irR /= np.sqrt(np.sum(irR ** 2))
    return fftconvolve(L, irL)[:N] * 0.9, fftconvolve(R, irR)[:N] * 0.9


rvL, rvR = reverb(hp(verb_send.L, 250), hp(verb_send.R, 250))
L = drums.L * 1.0 + music.L * 1.0 + fx.L * 1.0 + rvL * 0.55
R = drums.R * 1.0 + music.R * 1.0 + fx.R * 1.0 + rvR * 0.55

# silence pré-drop (b3.8 → b4) et avant le logo (b31.8 → b32), en gardant les effets d'impact
for a, z in [(3.8, 4.0), (31.8, 32.0)]:
    s, e = b2s(a), b2s(z)
    fade = np.linspace(1, 0, min(600, e - s))
    for ch in (L, R):
        ch[s:s + len(fade)] *= fade
        ch[s + len(fade):e] = 0


# tape stop b23.5 → b24 : la musique ralentit jusqu'à l'arrêt
def tape_stop(x, a, z):
    s, e = b2s(a), b2s(z)
    n = e - s
    speed = np.linspace(1, 0, n) ** 1.3
    pos = s + np.cumsum(speed)
    out = np.interp(pos, np.arange(len(x)), x)
    x[s:e] = out * np.linspace(1, 0.2, n)


tape_stop(L, 23.4, 24.0)
tape_stop(R, 23.4, 24.0)

# intro étouffée (« vieux site ») : radio cheap 0 → b4
s = b2s(4)
L[:s] = bp(L[:s], 250, 3500) * 1.4
R[:s] = bp(R[:s], 250, 3500) * 1.4

# master : bus compressé doux + limiteur
mix = np.stack([L, R])
mix = hp(mix, 28)
peak = np.max(np.abs(mix))
mix = mix / peak * 1.6
mix = np.tanh(mix) / np.tanh(1.6)
mix *= 0.89
# fondu final
f = int(0.25 * SR)
mix[:, -f:] *= np.linspace(1, 0, f)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype("<i2").tobytes())
print("ok", OUT, round(DUR, 2), "s")
