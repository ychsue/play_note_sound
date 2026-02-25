/** 由 input 取得 json 檔案內容 */
function getJsonFile(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = function (event) {
    try {
      const json = JSON.parse(event.target.result);
      document.getElementById("jsonSummary").value =
        `曲名：${json.description || "未命名"}\nBPM: ${json.bpm}\n音符總數: ${json.song.length}`;
      document.getElementById("playButton").disabled = false;
      document.getElementById("status").innerText = "檔案載入成功！";
      // 將完整資料存在一個變數中，不要從 textarea 轉回來，避免解析錯誤
      window.currentSongData = json;
    } catch (e) {
      alert("JSON 格式錯誤！");
    }
  };
}

function playMusic(json) {
  // 確保 AudioContext 已啟動 (瀏覽器安全要求)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const bpm = json.bpm || 120;
  const transpose = json.transpose || 0;

  // 計算正確的 offset (基準 A 為 9)
  let offset = 0;
  if (typeof transpose === "string") {
    // 如果是 "bm" (11)，則相對於基準 A(9) 偏移 +2
    offset = KEY_MAP[transpose] !== undefined ? KEY_MAP[transpose] - 9 : 0;
  } else {
    offset = transpose;
  }

  // 使用 AudioContext 的時間軸作為基準
  let startTime = audioCtx.currentTime + 0.1; // 延遲 0.1s 確保穩定

  json.song.forEach((track) => {
    const duration = beatsToSeconds(track.beats, bpm);
    const frequency = getFrequency(track.note, offset);

    if (frequency > 0) {
      // 直接傳入何時播放 (startTime)
      playNoteAt(frequency, duration, startTime);
    }
    startTime += duration;
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
        window.currentSongData = JSON.parse(editorEl.value);
        updateSummary(window.currentSongData);
      }
    } catch (e) {
      alert("JSON 格式有誤，請檢查後再切換！");
      document.getElementById("modeSwitch").checked = true; // 強制留點編輯模式
      toggleEditMode();
    }
  }
}

/** 更新摘要文字 */
function updateSummary(json) {
  document.getElementById("jsonSummary").value =
    `曲名：${json.description || "未命名"}\n` +
    `BPM: ${json.bpm}\n` +
    `調性偏移: ${json.transpose || 0}\n` +
    `音符總數: ${json.song.length}`;
}

/** 播放按鈕呼叫的函式 */
function playNotes() {
  // 如果在編輯模式下按下播放，先同步一次資料
  if (document.getElementById("modeSwitch").checked) {
    try {
      window.currentSongData = JSON.parse(
        document.getElementById("jsonEditor").value,
      );
    } catch (e) {
      alert("播放失敗：JSON 格式錯誤！");
      return;
    }
  }

  if (window.currentSongData) {
    playMusic(window.currentSongData); // 這裡會自動讀取最新的 bpm 與 transpose
    document.getElementById("status").innerText = "正在播放中...";
  }
}
