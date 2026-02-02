import sys, json
from .core import note, play, beats_to_seconds
from typing import Optional
from pathlib import Path

def main(file:Optional[str]=None):
    if file:
        path = Path.resolve(Path(__file__).parent) / file
        stFile = str(path)
        with open(stFile, "r") as f:
            data = json.load(f)
    else:
        data = json.loads(sys.stdin.read())
    bpm = data.get("bpm", 120)

    for item in data["song"]:
        stNote = item["note"]
        freq = note(stNote) if stNote != "rest" else 0
        duration = beats_to_seconds(item["beats"], bpm)
        play(freq, duration)

if __name__ == "__main__":
    main()