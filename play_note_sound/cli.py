import sys, json
from .core import note, play, beats_to_seconds

def main():
    data = json.loads(sys.stdin.read())
    bpm = data.get("bpm", 120)

    for item in data["song"]:
        freq = note(item["note"])
        duration = beats_to_seconds(item["beats"], bpm)
        play(freq, duration)
