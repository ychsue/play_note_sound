import sys, json
from .core import note, play, beats_to_seconds, key_map
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
    
    transpose = data.get("transpose", 0)

    offset = 0 # 預設不轉調
    if isinstance(transpose, int):
        offset = transpose
    elif isinstance(transpose, str):
        offset = key_map.get(transpose, 0)


    for item in data["song"]:
        stNote = item["note"]
        freq = note(stNote, offset) if stNote != "rest" else 0
        duration = beats_to_seconds(item["beats"], bpm)
        play(freq, duration)

if __name__ == "__main__":
    main()