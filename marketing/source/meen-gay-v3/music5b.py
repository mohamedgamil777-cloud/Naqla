"""Mature groove for the 'price doesn't change' spot (39s, voice-free).

Replaces music2 (marimba/pizzicato, felt childish). Style: modern funk / corporate groove —
Rhodes electric piano, deep sub bass, tight kick/snare/hats, muted plucks. 98 BPM, D minor.
Same story sections: intro 0–3.6 · lo-fi 'zaman' 3.6–13.5 · scratch + tension 13.5–16.6 ·
full groove 16.6–34.0 · riser 33 · sting 34.0 → fade at 38.9.
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 34.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
BPM = 98
beat = 60 / BPM
bar = 4 * beat


def t_arr(sec):
    return np.arange(int(SR * sec)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def band(x, lo=0, hi=SR / 2):
    """Brick-wall-ish band filter via FFT with soft edges."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo > 0:
        g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi < SR / 2:
        g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def add(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf) or i < 0:
        return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig


def rhodes(f, dur=1.2, amp=0.1):
    tt = t_arr(dur)
    mod = 1.1 * np.exp(-tt * 7) * np.sin(2 * np.pi * f * tt)
    s = np.sin(2 * np.pi * f * tt + mod) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 5)
    env = np.minimum(1, tt / 0.004) * np.exp(-tt * 2.2) * np.clip((dur - tt) / 0.08, 0, 1)
    return amp * s * env


def sub(f, dur, amp=0.32):
    tt = t_arr(dur)
    s = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)
    s = np.tanh(1.6 * s)
    env = np.minimum(1, tt / 0.008) * np.exp(-tt * 1.4) * np.clip((dur - tt) / 0.03, 0, 1)
    return amp * s * env


def pluck(f, dur=0.22, amp=0.09):
    tt = t_arr(dur)
    s = sum(np.sin(2 * np.pi * f * h * tt) / h ** 1.6 * np.exp(-tt * (18 + 10 * h)) for h in range(1, 8))
    return amp * s * np.minimum(1, tt / 0.002)


def kick(amp=0.75):
    tt = t_arr(0.35)
    f = 110 * np.exp(-tt * 28) + 46
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)
    click = rng.standard_normal(len(tt)) * np.exp(-tt * 400) * 0.3
    return amp * np.tanh(1.5 * (body + click))


def snare(amp=0.22):
    tt = t_arr(0.22)
    n = band(rng.standard_normal(len(tt)), 1200, 9000) * np.exp(-tt * 20)
    tone = np.sin(2 * np.pi * 185 * tt) * np.exp(-tt * 30) * 0.6
    return amp * (n + tone)


def hat(amp=0.05, open_=False):
    d = 0.18 if open_ else 0.045
    tt = t_arr(d)
    n = band(rng.standard_normal(len(tt)), 7000)
    return amp * n * np.exp(-tt * (14 if open_ else 80))


def pad(notes, dur, amp=0.03, att=0.6):
    tt = t_arr(dur)
    s = np.zeros(len(tt))
    for n_ in notes:
        f = midi(n_)
        for det in (-0.12, 0.0, 0.12):
            ff = f * 2 ** (det / 12)
            s += sum(np.sin(2 * np.pi * ff * h * tt) / h ** 1.3 for h in range(1, 6))
    env = np.minimum(1, tt / att) * np.clip((dur - tt) / 0.8, 0, 1)
    return amp * s / 3 * env


# Dm9 – Bbmaj7 – Gm9 – A7(b9 feel)
CHORDS = [[57, 60, 64, 65], [57, 58, 62, 65], [57, 58, 62, 65 + 0], [55, 57, 61, 64]]
CHORDS[2] = [57, 58, 62, 65]
CHORDS[2] = [53, 57, 58, 62]
ROOTS = [38, 34, 31, 33]
# bass rhythm in beats: (position, semitone offset from root, length in beats)
BASSLINE = [(0, 0, 0.7), (0.75, 12, 0.2), (1.5, 0, 0.45), (2.5, 7, 0.45), (3.0, 0, 0.45), (3.5, 10, 0.4)]
# Rhodes comping: (position, length)
COMP = [(0, 1.4), (1.5, 0.5), (2.5, 0.9), (3.5, 0.45)]
# pluck motif (D minor pentatonic + b6), 16th grid positions
MOTIF = [(0.0, 74), (0.5, 77), (1.0, 79), (1.75, 77), (2.25, 74), (3.0, 72), (3.5, 69)]


def groove(t0, t1, kick_on=True, snare_on=True, hats=True, bass_on=True, motif=False, comp_amp=0.085):
    out = np.zeros(N)
    nb = int(np.ceil((t1 - t0) / bar)) + 1
    for b in range(nb):
        s = t0 + b * bar
        ci = b % 4
        for pos, ln in COMP:
            tt = s + pos * beat
            if t0 <= tt < t1:
                for n_ in CHORDS[ci]:
                    add(out, rhodes(midi(n_), dur=ln * beat, amp=comp_amp), tt)
        if bass_on:
            for pos, off, ln in BASSLINE:
                tt = s + pos * beat
                if t0 <= tt < t1:
                    add(out, sub(midi(ROOTS[ci] + off), ln * beat), tt)
        for i in range(4):
            tt = s + i * beat
            if not (t0 <= tt < t1):
                continue
            if kick_on and i in (0, 2):
                add(out, kick(), tt)
            if kick_on and i == 2 and b % 2 == 1:
                add(out, kick(0.5), tt + beat * 0.75)
            if snare_on and i in (1, 3):
                add(out, snare(), tt)
        if hats:
            for i in range(16):
                sw = 0.035 * beat if i % 2 == 1 else 0
                tt = s + i * beat / 4 + sw
                if t0 <= tt < t1:
                    vel = 0.05 if i % 4 == 0 else (0.035 if i % 2 == 0 else 0.022)
                    add(out, hat(vel, open_=(i == 14)), tt)
        if motif and b % 2 == 1:
            for pos, n_ in MOTIF:
                tt = s + pos * beat
                if t0 <= tt < t1:
                    add(out, pluck(midi(n_)), tt)
    return out


music = np.zeros(N)
tl = np.arange(N) / SR
S2, S3, S4, SE = 13.0, 24.0, 26.5, 29.5

# 1 · waiting (0–13): soft Rhodes + light hats, then a nervous pulse builds as the worries pile up
music += groove(0, 5.0, kick_on=False, snare_on=False, bass_on=False, comp_amp=0.16)
add(music, pad([50, 57, 60, 64], 5.2, amp=0.028), 0)
tense = groove(5.0, 13.0, kick_on=False, snare_on=False, hats=True, bass_on=True, comp_amp=0.12)
tense = band(tense, 120, 4000) * 1.6
music += tense
for i in range(int((13.0 - 5.0) / (beat / 2))):          # muted 8th-note pulse, getting louder
    tt = 5.0 + i * beat / 2
    add(music, sub(midi(38), beat * 0.35, amp=0.10 + 0.12 * (tt - 5) / 8), tt)
tt = t_arr(1.4)
rz = band(rng.standard_normal(len(tt)), 1500) * (tt / 1.4) ** 3 * 0.16
add(music, rz, S2 - 1.4)

# 2 · the app → street → home (13–29.5): full confident groove
add(music, kick(1.0), S2)
add(music, sub(midi(38), 1.2, amp=0.35), S2)
music += groove(S2, SE, motif=True) * 1.05
add(music, pad([50, 57, 60, 65], SE - S2, amp=0.012, att=2.0), S2)
tt = t_arr(1.0)
add(music, band(rng.standard_normal(len(tt)), 2000) * tt ** 2.5 * 0.14, SE - 1.0)

# 3 · logo sting
add(music, kick(0.95), SE)
add(music, sub(midi(38), 2.6, amp=0.4), SE)
for n_ in [62, 66, 69, 73, 76]:
    add(music, rhodes(midi(n_), dur=3.5, amp=0.075), SE)
for i, n_ in enumerate([74, 78, 81, 86]):
    add(music, pluck(midi(n_), dur=0.5, amp=0.07), SE + 0.18 + i * 0.1)
add(music, pad([50, 57, 62, 66, 69], 4.4, amp=0.02, att=0.3), SE + 0.05)
music *= np.minimum(1, tl / 0.3) * np.clip((DUR - tl) / 1.6, 0, 1)
music /= np.max(np.abs(music)) + 1e-9

# ---------- SFX ----------
sfx = np.zeros(N)
def whoosh(dur=0.45, amp=0.5):
    tt = t_arr(dur); return amp * band(rng.standard_normal(len(tt)), 300, 3000) * np.sin(np.pi * tt / dur) ** 2
def popS(amp=0.4):
    tt = t_arr(0.12); f = 900 * np.exp(-tt * 25) + 380
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 30)
def tone(f, dur, amp, dec=6):
    tt = t_arr(dur); return amp * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * dec) * np.minimum(1, tt / 0.005)
def tick(amp=0.35):
    tt = t_arr(0.03); return amp * band(rng.standard_normal(len(tt)), 2500) * np.exp(-tt * 200)

for c in (S2, S3, S4, SE):
    add(sfx, whoosh(), c - 0.25)
for p in [0.4, 0.9, 3.0, 5.3, 6.75, 7.45, 8.15, 9.2, 13.15, 15.0, 15.2, 18.0, 18.2, 21.0, 21.2, 27.6, 28.0, 30.4, 31.1]:
    add(sfx, popS(), p)
k = 0.0                                                    # clock ticking, accelerating
while 2.6 + k < 5.0:
    add(sfx, tick(), 2.6 + k); k += max(0.08, 0.5 - k * 0.2)
for r in range(3):                                         # phone ring
    for j in range(8):
        add(sfx, tone(1350 if j % 2 else 1100, 0.05, 0.12, 20), 5.05 + r * 0.5 + j * 0.05)
add(sfx, tone(660, 0.9, 0.25, 5) + 0, S3 + 0.5)            # notification chime
add(sfx, tone(990, 0.9, 0.22, 5), S3 + 0.62)
tt = t_arr(1.1)                                            # van rolling in + brake
eng = band(rng.standard_normal(len(tt)), 60, 400) * np.sin(np.pi * tt / 1.1) * 0.6
add(sfx, eng, S3)
add(sfx, tone(659, 1.2, 0.35, 3), S4 + 0.1)                # doorbell: ding-dong
add(sfx, tone(523, 1.4, 0.35, 3), S4 + 0.55)
add(sfx, tone(880, 0.4, 0.2, 8), S4 + 1.9)                 # check chime
add(sfx, tone(1318, 0.6, 0.2, 7), S4 + 2.0)

def step(amp=0.16):
    tt = t_arr(0.07); return amp * band(rng.standard_normal(len(tt)), 150, 1800) * np.exp(-tt * 70)
for a, b, iv in ((5.05, 6.65, 0.4), (8.85, 10.35, 0.4), (25.55, 26.2, 0.33), (27.25, 28.45, 0.38)):
    k = a
    while k < b:
        add(sfx, step(), k); k += iv
tt = t_arr(0.5); add(sfx, 0.08 * np.sin(2 * np.pi * 2400 * tt) * np.sin(np.pi * tt / 0.5), 24.85)   # brake
add(sfx, whoosh(0.5, 0.25, ), 26.85)
for name, x in (('music', music), ('sfx', sfx)):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    with wave.open(f'meen3_{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
print('ok')
