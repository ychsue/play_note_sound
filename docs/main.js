// main.js (修改版)
let isPlaying = false;
let startTime = 0;       // AudioContext 的絕對起點
let pausedAtSeconds = 0; // 紀錄目前播放到曲目的第幾秒
let animationId = null;
const PIXELS_PER_BEAT = 100; // 每拍佔用的像素寬度

// 綁定原本的 UI 函式
function getJsonFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => onDataLoaded(JSON.parse(e.target.result));
    reader.readAsText(file);
}

/** 檔案讀取成功後的處理 */
function onDataLoaded(json) {
    window.currentSongData = json;
    updateSummary(json);
    renderLyricsTrack(json); // 初始渲染歌詞軌道
    pausedAtSeconds = 0;
    updateScroll(0);
    document.getElementById("status").innerText = "檔案載入成功！";
}


function loadSampleJson() {
    fetch("sample.json")
        .then(res => res.json())
        .then(json => onDataLoaded(json));
}

function getSongDurationSeconds(json) {
    const bpm = Number(json?.bpm) || 120;
    const song = Array.isArray(json?.song) ? json.song : [];
    return song.reduce((sum, item) => sum + beatsToSeconds(Number(item.beats) || 0, bpm), 0);
}

function applySongData(json, options = {}) {
    const { preservePosition = true } = options;

    if (!json || !Array.isArray(json.song)) {
        throw new Error("JSON 缺少 song 陣列");
    }

    if (!json.bpm || Number(json.bpm) <= 0) {
        json.bpm = 120;
    }

    const wasPlaying = isPlaying;
    const currentPosition = preservePosition
        ? (wasPlaying ? (audioCtx.currentTime - startTime) : pausedAtSeconds)
        : 0;

    if (wasPlaying) {
        handlePause();
    }

    window.currentSongData = json;
    updateSummary(json);
    renderLyricsTrack(json);

    const duration = getSongDurationSeconds(json);
    pausedAtSeconds = Math.min(Math.max(currentPosition, 0), duration);
    updateScroll(pausedAtSeconds);

    if (wasPlaying) {
        handlePlay();
    }
}

/** 渲染歌詞軌道 */
function renderLyricsTrack(json) {
    const trackEl = document.getElementById('lyrics-track');
    trackEl.innerHTML = '';
    const bpm = json.bpm || 120;
    let cumulativeSeconds = 0;

    json.song.forEach((item, index) => {
        const span = document.createElement('span');
        span.className = 'note-item';
        span.innerText = item.word || (item.note === 'rest' ? ' ' : '♪');
        
        // 寬度正比於拍數
        const width = item.beats * PIXELS_PER_BEAT;
        span.style.width = `${width}px`;
        
        // 紀錄這個音符在曲目中的開始秒數
        const currentNoteStart = cumulativeSeconds;
        span.dataset.startTime = currentNoteStart;
        
        // 點擊音符跳轉 (Assign 功能)
        span.onclick = () => {
            seekTo(currentNoteStart);
        };

        trackEl.appendChild(span);
        cumulativeSeconds += beatsToSeconds(item.beats, bpm);
    });
}

/** 核心播放控制 */
async function handlePlay() {
    if (isPlaying || !window.currentSongData) return;
    
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    
    isPlaying = true;
    const json = window.currentSongData;
    const bpm = json.bpm || 120;
    const transpose = json.transpose || 0;

    // 計算調性 offset
    let offset = (typeof transpose === "string") ? (KEY_MAP[transpose] - 9) : transpose;

    // 設定播放起點
    const now = audioCtx.currentTime;
    startTime = now - pausedAtSeconds;

    // 根據目前的 pausedAtSeconds，排程之後的所有音符
    let currentPos = 0;
    json.song.forEach(item => {
        const noteDuration = beatsToSeconds(item.beats, bpm);
        const noteStartInSong = currentPos;
        
        // 只排程還沒播到的音符 (或者是正在播的音符餘下部分)
        if (noteStartInSong + noteDuration > pausedAtSeconds) {
            const playAt = startTime + noteStartInSong;
            const freq = getFrequency(item.note, offset);
            if (freq > 0) {
                // 如果是從音符中間開始播，這裡可進階處理，目前簡單處理從該音起點播
                playNoteAt(freq, noteDuration, Math.max(playAt, now));
            }
        }
        currentPos += noteDuration;
    });

    // 啟動動畫
    function animate() {
        if (!isPlaying) return;
        const elapsed = audioCtx.currentTime - startTime;
        updateScroll(elapsed);
        animationId = requestAnimationFrame(animate);
    }
    animate();
    document.getElementById("status").innerText = "播放中...";
}

function handlePause() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    stopAllNotes(); // 停止硬體發聲
    pausedAtSeconds = audioCtx.currentTime - startTime;
    document.getElementById("status").innerText = "已暫停";
}

function handleStop() {
    handlePause();
    pausedAtSeconds = 0;
    updateScroll(0);
    document.getElementById("status").innerText = "已停止";
}

function seekTo(seconds) {
    const wasPlaying = isPlaying;
    handleStop();
    pausedAtSeconds = seconds;
    updateScroll(seconds);
    if (wasPlaying) handlePlay(); // 如果原本在播，跳轉後繼續播
}

/** 更新滾動位置與高亮 */
function updateScroll(elapsedSeconds) {
    const json = window.currentSongData;
    if (!json) return;
    
    const bpm = Number(json.bpm) || 120;
    const beatsElapsed = elapsedSeconds * (bpm / 60);
    const pixelOffset = beatsElapsed * PIXELS_PER_BEAT;
    
    const trackEl = document.getElementById('lyrics-track');
    // 使用 Math.round 或 Math.floor 取整，並改用 translate3d 開啟硬體加速
    trackEl.style.transform = `translate3d(${-Math.round(pixelOffset)}px, 0, 0)`;

    // 高亮目前的字
    const spans = trackEl.querySelectorAll('.note-item');
    spans.forEach(span => {
        const start = parseFloat(span.dataset.startTime);
        const widthSeconds = beatsToSeconds(parseFloat(span.style.width) / PIXELS_PER_BEAT, bpm);
        if (elapsedSeconds >= start && elapsedSeconds < start + widthSeconds) {
            span.classList.add('active');
        } else {
            span.classList.remove('active');
        }
    });
}

/** 切換模式 */
function toggleEditMode() {
  const isEditMode = document.getElementById("modeSwitch").checked;
  const summaryEl = document.getElementById("jsonSummary");
  const editorEl = document.getElementById("jsonEditor");

  if (isEditMode) {
    summaryEl.style.display = "none";
    editorEl.style.display = "block";
    // 將當前資料轉成漂亮格式的 JSON 填入編輯區
    if (window.currentSongData) {
      editorEl.value = JSON.stringify(window.currentSongData, null, 2);
    }
  } else {
    summaryEl.style.display = "block";
    editorEl.style.display = "none";
    // 切換回摘要時，嘗試解析編輯區的內容並同步回記憶體
    try {
      if (editorEl.value) {
                const parsed = JSON.parse(editorEl.value);
                applySongData(parsed, { preservePosition: true });
                document.getElementById("status").innerText = "已套用編輯內容";
      }
    } catch (e) {
      alert("JSON 格式有誤，請檢查後再切換！");
      document.getElementById("modeSwitch").checked = true; // 強制留點編輯模式
      toggleEditMode();
    }
  }
}

function updateSummary(json) {
    document.getElementById("jsonSummary").value =
        `曲名：${json.description || "未命名"}\nBPM: ${json.bpm}\n音符總數: ${json.song.length}`;
}