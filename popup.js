document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('extensionToggle');
  const darkToggle = document.getElementById('darkModeToggle');
  const skipHomeToggle = document.getElementById('skipHomeToggle');
  const staffModeToggle = document.getElementById('staffModeToggle');
  const syllabusToggle = document.getElementById('syllabusToggle');
  const staffModeWrapper = document.getElementById('staffModeWrapper');
  const syllabusWrapper = document.getElementById('syllabusWrapper');
  const clearSyllabusDataBtn = document.getElementById('clearSyllabusDataBtn');

  // ベターレイアウトに依存するUI状態を更新する関数
  const updateDependentUI = (isEnabled) => {
    staffModeToggle.disabled = !isEnabled;
    staffModeWrapper.style.opacity = isEnabled ? '1' : '0.4';
    
    if (syllabusToggle && syllabusWrapper) {
      syllabusToggle.disabled = !isEnabled;
      syllabusWrapper.style.opacity = isEnabled ? '1' : '0.4';
    }
  };

  // Moodle のタブをリロードして変更を反映する共通関数
  const reloadTabs = () => {
    // Moodleとシラバスの両方のタブを対象にする
    chrome.tabs.query({ url: ["*://lms.ritsumei.ac.jp/*", "*://syllabus.ritsumei.ac.jp/*"] }, (tabs) => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));
    });
  };

  // 保存されている状態を取得
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  chrome.storage.local.get({ isEnabled: true, isDarkMode: prefersDark, isSkipHomeEnabled: true, isStaffMode: false, isSyllabusEnabled: true }, (data) => {
    toggle.checked = data.isEnabled;
    darkToggle.checked = data.isDarkMode;
    skipHomeToggle.checked = data.isSkipHomeEnabled;
    staffModeToggle.checked = data.isStaffMode;
    if (syllabusToggle) {
      syllabusToggle.checked = data.isSyllabusEnabled;
    }

    // 初期状態のダークモード表示を更新
    if (data.isDarkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    }

    // 初期状態の依存する設定の表示を更新
    updateDependentUI(data.isEnabled);
  });

  // トグル切り替え時の処理 (レイアウト変更)
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    updateDependentUI(isEnabled);

    const updates = { isEnabled: isEnabled };
    // ベターレイアウトがオフになったら、依存する機能も連動してオフにする
    if (!isEnabled && staffModeToggle.checked) {
      staffModeToggle.checked = false;
      updates.isStaffMode = false;
    }
    if (!isEnabled && syllabusToggle && syllabusToggle.checked) {
      syllabusToggle.checked = false;
      updates.isSyllabusEnabled = false;
    }
    
    chrome.storage.local.set(updates, reloadTabs);
  });

  // トグル切り替え時の処理 (ダークモード)
  darkToggle.addEventListener('change', () => {
    const isDarkMode = darkToggle.checked;
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }
    chrome.storage.local.set({ isDarkMode: isDarkMode }, reloadTabs);
  });

  // トグル切り替え時の処理 (ホームスキップ)
  skipHomeToggle.addEventListener('change', () => {
    chrome.storage.local.set({ isSkipHomeEnabled: skipHomeToggle.checked }, reloadTabs);
  });

  // トグル切り替え時の処理 (教職員モード)
  staffModeToggle.addEventListener('change', () => {
    chrome.storage.local.set({ isStaffMode: staffModeToggle.checked }, reloadTabs);
  });

  // トグル切り替え時の処理 (シラバス連携)
  if (syllabusToggle) {
    syllabusToggle.addEventListener('change', () => {
      chrome.storage.local.set({ isSyllabusEnabled: syllabusToggle.checked }, reloadTabs);
    });
  }

  // シラバスデータの削除ボタン
  if (clearSyllabusDataBtn) {
    clearSyllabusDataBtn.addEventListener('click', () => {
      if (confirm('取得したシラバスのデータをすべて削除しますか？\n取得したシラバス情報の表示が消え、再度シラバスを開くまで表示されなくなります。')) {
        chrome.storage.local.get(null, (items) => {
          const keysToRemove = Object.keys(items).filter(key => key.startsWith('syllabus_'));
          if (keysToRemove.length > 0) {
            chrome.storage.local.remove(keysToRemove, () => {
              alert('シラバスデータを削除しました。');
              reloadTabs();
            });
          } else {
            alert('削除するデータがありません。');
          }
        });
      }
    });
  }
});