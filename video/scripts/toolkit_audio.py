"""Bande son du film Toolkit : musique 120 BPM synthétisée + effets de sfx-library calés sur src/toolkit/cues.json.
Sorties : public/toolkit/soundtrack.wav (musique + effets, -14 LUFS)
et public/toolkit/soundtrack_sfx.wav (effets seuls, -16 LUFS)."""
import json, os, subprocess, sys, wave
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
import glass_sfx as S
from glass_sfx import SR

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LIB = os.path.join(ROOT, "..", "sfx-library")
cues = json.load(open(os.path.join(ROOT, "src/toolkit/cues.json")))
DUR = cues["duration"]; BEAT = 60 / cues["bpm"]; BAR = 4 * BEAT
N = int((DUR + 2) * SR)
rng = np.random.default_rng(5)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
t_ = S.t_

def place(bus, x, t, g=1.0):
    i = int(round(t * SR)); j = min(len(bus), i + len(x))
    if j > i and i >= 0: bus[i:j] += x[: j - i] * g
def lp(x, fc): b, a = signal.butter(2, fc / (SR / 2)); return signal.lfilter(b, a, x, axis=0)
def hp(x, fc): b, a = signal.butter(2, fc / (SR / 2), "high"); return signal.lfilter(b, a, x, axis=0)
def load(rel):
    """Décode un son de la bibliothèque en stéréo 48 kHz, crête normalisée à 0 dBFS."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(LIB, rel), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(float)
    return x / (np.abs(x).max() + 1e-9)

# ---------- musique (ré majeur : Dmaj7 – Bm7 – Gmaj7 – A6)
PROG = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 66]]
FULL = [(14.5, 41.0), (43.0, 45.0)]
HATS = [(12.0, 41.0), (43.0, 46.0)]
inside = lambda t, R: any(a <= t < b for a, b in R)
pad = np.zeros((N, 2)); arp = np.zeros((N, 2)); bass = np.zeros((N, 2)); drums = np.zeros((N, 2))
for bi in range(int(DUR / BAR) + 2):
    t0 = bi * BAR; ch = PROG[bi % 4]
    d = BAR + 1.0; tt = t_(d); e = np.minimum(1, tt / 0.8) * np.clip((d - tt) / 1.0, 0, 1)
    for m in ch:
        for det, pp in ((-0.08, -0.7), (0.08, 0.7)):
            w = signal.sawtooth(2 * np.pi * mtof(m) * 2 ** (det / 12) * tt + rng.uniform(0, 6))
            place(pad, S.pan(w * e * 0.03, pp), t0)
    for k in range(8):  # basse en croches
        tb = t0 + k * BEAT / 2
        if not inside(tb, FULL): continue
        tt = t_(BEAT / 2 * 0.9); x = np.sin(2 * np.pi * mtof(ch[0] - 24) * tt) * np.minimum(1, tt / 0.008) * np.exp(-tt * 4)
        place(bass, S.pan(x * 0.24, 0), tb)
    notes = [ch[0] + 12, ch[2] + 12, ch[1] + 12, ch[3] + 12, ch[2] + 24, ch[1] + 12, ch[3] + 12, ch[0] + 24]
    for k in range(16):  # arpège cristallin en doubles croches
        ta = t0 + k * BEAT / 4
        if ta >= DUR - 0.5: continue
        f = mtof(notes[k % 8]); tt = t_(0.35)
        x = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 12)
        lvl = 0.035 if ta < 10 else (0.05 if ta < 14.5 else 0.06)
        place(arp, S.pan(x * lvl, 0.45 * np.sin(k * 0.9)), ta)
dl = int(BEAT * 0.75 * SR); echo = np.zeros_like(arp); echo[dl:, 0] = arp[:-dl, 1] * 0.4; echo[dl:, 1] = arp[:-dl, 0] * 0.4
arp = lp(arp + echo, 6000); pad = lp(pad, 2200)
kick = S.thump(140, 45, 0.4)[:, 0]
for b in range(int(DUR / BEAT) + 1):
    tb = b * BEAT
    if inside(tb, FULL):
        place(drums, np.stack([kick, kick], 1) * 0.4, tb)
        if b % 2 == 1:
            L = int(0.22 * SR); nz = hp(rng.standard_normal(L), 1200) * np.exp(-np.arange(L) / SR * 24)
            place(drums, S.pan(nz * 0.1, 0), tb)
    th = tb + BEAT / 2
    if inside(th, HATS):
        L = int(0.045 * SR); hh = hp(rng.standard_normal(L), 8000) * np.exp(-np.arange(L) / SR * 95)
        place(drums, S.pan(hh * 0.08, 0.3), th)
pump = np.ones(N)
for b in range(int(DUR / BEAT) + 1):
    tb = b * BEAT
    if inside(tb, FULL):
        i = int(tb * SR); L = min(int(BEAT * SR), N - i); pump[i:i + L] = np.minimum(pump[i:i + L], 1 - 0.5 * np.exp(-np.arange(L) / SR * 9))
music = S.reverb(pad * pump[:, None] + arp, 0.32, 2.8)[:N] + bass + drums
tt = np.arange(N) / SR
music *= (np.minimum(1, tt / 1.2) * np.clip((DUR + 0.3 - tt) / 2.0, 0, 1))[:, None]

# ---------- effets de la bibliothèque
sfx = np.zeros((N, 2)); cache = {}
def lib(rel):
    if rel not in cache: cache[rel] = load(rel)
    return cache[rel]
for rel, at, db in cues["sfx"]:
    x = lib(rel)
    # un riser ou un « swell » se termine sur sa marque
    start = at
    if "riser" in rel or "swell" in rel:
        start = at - len(x) / SR * 0.0
    place(sfx, x, start, 10 ** (db / 20))
clicks = ["packs/ui-clics/51-ui-sound-effects-buttons-switches-and-clicks/click1.wav", "packs/ui-clics/51-ui-sound-effects-buttons-switches-and-clicks/click3.wav",
          "packs/ui-clics/51-ui-sound-effects-buttons-switches-and-clicks/click5.wav", "packs/ui-clics/10-clicks-and-switches/10 Clicks and Switches/click.9.ogg"]
keys = np.zeros((N, 2))
for at, n, rate, db in cues["typing"]:
    for k in range(n):
        place(keys, lib(clicks[rng.integers(len(clicks))]), at + k * rate + rng.uniform(-0.008, 0.008), 10 ** ((db + rng.uniform(-3, 1)) / 20))
# cartes : mêmes instants que DECK_T (0,2 + i × 0,75 s)
# crans de la roue (mêmes instants que WHEEL_STOPS dans Toolkit.tsx)
w0 = cues["scenes"]["wheel"][0]
for i in range(1, 11):
    place(sfx, lib(cues["ticks"]["path"]), w0 + 0.55 + i * 0.27 - 0.02, 10 ** (cues["ticks"]["db"] / 20))
# cartes de la pile (mêmes instants que DECK_T)
d0 = cues["scenes"]["deck"][0]
sw = ["packs/whoosh-transitions/swishes-sound-pack/swishes/swish-%d.wav" % k for k in (3, 5, 7, 9)]
for i in range(4):
    place(sfx, lib(sw[i]), d0 + 0.2 + i * 0.75 + 0.05, 10 ** (cues["swishes"]["db"] / 20))

def render(mix, out, target, pre=""):
    mix = mix[: int(DUR * SR)]
    mix = mix / (np.abs(mix).max() / 0.89)
    raw = out.replace(".wav", "_raw.wav")
    w = wave.open(raw, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes()); w.close()
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", pre + f"loudnorm=I={target}:TP=-1:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    af = (f"loudnorm=I={target}:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,alimiter=limit=0.84:level=false")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", pre + af, "-ar", str(SR), out], check=True)
    os.remove(raw)

# l'intro (avant la batterie) est remontée pour ne pas paraître creuse
intro = np.interp(tt, [0, 13.8, 14.5, DUR + 2], [1.9, 1.9, 1.0, 1.0])[:, None]
render(music * 0.75 * intro + (sfx + keys) * 1.45, os.path.join(ROOT, "public/toolkit/soundtrack.wav"), -14)
# version sans musique : les effets seuls, un peu moins fort (ils sont espacés)
# sans musique, les petits sons (clics, pings) seraient couverts par les whooshs : on resserre la dynamique
render(sfx + keys * 1.7, os.path.join(ROOT, "public/toolkit/soundtrack_sfx.wav"), -16, "acompressor=threshold=-30dB:ratio=4:attack=1:release=90:makeup=4,")
print("ok")
