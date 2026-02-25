const SEMITONE_MAP = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
};

// 產生 KEY_MAP
const KEY_MAP = { ...SEMITONE_MAP };
Object.keys(SEMITONE_MAP).forEach(key => {
    KEY_MAP[key.toLowerCase() + "m"] = SEMITONE_MAP[key];
});

function getFrequency(noteName, offset = 0) {
    if (noteName === "rest" || !noteName) return 0;
    
    // 支援原本的音名格式 (例如 "E3")
    const pitchClass = noteName.slice(0, -1);
    const octave = parseInt(noteName.slice(-1));
    
    if (isNaN(octave)) return 0;

    const midi = (octave + 1) * 12 + SEMITONE_MAP[pitchClass];
    const n = midi - 69 + offset;
    
    return 440 * Math.pow(2, n / 12);
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 支援精確排程的版本
function playNoteAt(frequency, duration, startTime) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle'; // 改用 triangle 聽起來比較像吉他/樂器，不那麼刺耳
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // 音量控制 (Envelope)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02); // 快速淡入
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // 淡出

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

function beatsToSeconds(beats, bpm) {
    return (60 / bpm) * beats;
}