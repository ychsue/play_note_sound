import numpy as np
import sounddevice as sd

# 產生頻率：十二平均律
def note(name):
    # 解析音名，例如 "C#4"
    pitch_class = name[:-1]
    octave = int(name[-1])

    semitone_map = {
        "C": 0, "C#": 1, "Db": 1,
        "D": 2, "D#": 3, "Eb": 3,
        "E": 4,
        "F": 5, "F#": 6, "Gb": 6,
        "G": 7, "G#": 8, "Ab": 8,
        "A": 9, "A#": 10, "Bb": 10,
        "B": 11
    }

    # C4 = MIDI 60 → A4 = MIDI 69
    midi = (octave + 1) * 12 + semitone_map[pitch_class]
    n = midi - 69  # 與 A4 的半音距離

    return 440 * (2 ** (n / 12))

# 播放正弦波
def play(freq, duration, sr=44100, volume=0.5):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    wave = volume * np.sin(2 * np.pi * freq * t)
    sd.play(wave, sr)
    sd.wait()

# 拍數轉秒數
def beats_to_seconds(beats, bpm=120):
    return beats * (60 / bpm)
