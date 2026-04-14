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
    // 現在開いているアクティブなタブを確実に再読み込みする
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
    // 裏で開いているMoodleやシラバスの他のタブも再読み込みする
    chrome.tabs.query({ url: ["*://lms.ritsumei.ac.jp/*", "*://syllabus.ritsumei.ac.jp/*"] }, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.active) chrome.tabs.reload(tab.id);
      });
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

  // シラバス自動取得の実行関数
  const triggerAutoFetch = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url.includes('lms.ritsumei.ac.jp')) {
        chrome.tabs.sendMessage(activeTab.id, { action: "getCourseCodes" }, (response) => {
          if (chrome.runtime.lastError || !response || !response.courseCodes || response.courseCodes.length === 0) {
            alert("時間割から授業コードが見つかりませんでした。\nMoodleのダッシュボード（時間割が表示されているページ）を開いた状態で実行してください。");
          } else {
            // 取得済みのシラバスデータをストレージから確認する
            const storageKeys = response.courseCodes.map(code => `syllabus_${code}`);
            chrome.storage.local.get(storageKeys, (result) => {
              const missingCodes = response.courseCodes.filter(code => !result[`syllabus_${code}`]);
              
              if (missingCodes.length === 0) {
                alert("登録されているすべての授業のシラバス情報はすでに取得済みです。\n最新の情報に更新したい場合は、下の「取得したデータを削除」を実行してから再度実行してください。");
              } else {
                chrome.runtime.sendMessage({ 
                  action: "startAutoFetchSyllabus", 
                  courseCodes: missingCodes, // 未取得の授業コードだけを渡す
                  originalTabId: activeTab.id
                });
                alert(`未取得の ${missingCodes.length} 件の授業のシラバス自動取得を開始します。\n別タブが順次開いて処理されますので、しばらくお待ちください。`);
              }
            });
          }
        });
      } else {
        alert("Moodleのダッシュボード（時間割が表示されているページ）を開いた状態で実行してください。");
      }
    });
  };

  // トグル切り替え時の処理 (シラバス連携)
  if (syllabusToggle) {
    syllabusToggle.addEventListener('change', () => {
      const isEnabled = syllabusToggle.checked;
      chrome.storage.local.set({ isSyllabusEnabled: isEnabled }, () => {
        if (isEnabled && confirm("シラバス情報の自動取得がオンになりました。\n登録されたすべての授業のシラバスを自動取得しますか？（1分程度）\n※Moodleのダッシュボードを開いている必要があります。")) {
          triggerAutoFetch();
        } else {
          reloadTabs();
        }
      }); 
    });
  }

  // シラバスデータの自動取得ボタン
  const autoFetchSyllabusBtn = document.getElementById('autoFetchSyllabusBtn');
  if (autoFetchSyllabusBtn) {
    autoFetchSyllabusBtn.addEventListener('click', triggerAutoFetch);
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