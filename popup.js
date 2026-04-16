// ==========================================
// DOM要素の取得・初期化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('extensionToggle');
  const darkToggle = document.getElementById('darkModeToggle');
  const skipHomeToggle = document.getElementById('skipHomeToggle');
  const staffModeToggle = document.getElementById('staffModeToggle');
  const highlightCurrentClassToggle = document.getElementById('highlightCurrentClassToggle');
  const syllabusToggle = document.getElementById('syllabusToggle');
  
  const staffModeWrapper = document.getElementById('staffModeWrapper');
  const highlightCurrentClassWrapper = document.getElementById('highlightCurrentClassWrapper');
  const syllabusWrapper = document.getElementById('syllabusWrapper');
  
  const clearSyllabusDataBtn = document.getElementById('clearSyllabusDataBtn');
  const resetExtensionBtn = document.getElementById('resetExtensionBtn');
  const autoFetchSyllabusBtn = document.getElementById('autoFetchSyllabusBtn');

// ==========================================
// 共通ユーティリティ
// ==========================================

  // 依存するUIの有効/無効状態を更新
  const updateDependentUI = (isEnabled) => {
    staffModeToggle.disabled = !isEnabled;
    highlightCurrentClassToggle.disabled = !isEnabled;
    staffModeWrapper.style.opacity = isEnabled ? '1' : '0.4';
    highlightCurrentClassWrapper.style.opacity = isEnabled ? '1' : '0.4';
    
    if (syllabusToggle && syllabusWrapper) {
      syllabusToggle.disabled = !isEnabled;
      syllabusWrapper.style.opacity = isEnabled ? '1' : '0.4';
    }
  };

  // 関連タブを再読み込み
  const reloadTabs = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) chrome.tabs.reload(tabs[0].id);
    });
    chrome.tabs.query({ url: ["*://lms.ritsumei.ac.jp/*", "*://syllabus.ritsumei.ac.jp/*"] }, (tabs) => {
      tabs.forEach(tab => { if (!tab.active) chrome.tabs.reload(tab.id); });
    });
  };

  // シラバス自動取得の実行関数
  const triggerAutoFetch = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url.includes('lms.ritsumei.ac.jp')) {
        return alert("Moodleのダッシュボード（時間割が表示されているページ）を開いた状態で実行してください。");
      }

      chrome.tabs.sendMessage(activeTab.id, { action: "getCourseCodes" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.courseCodes?.length) {
          return alert("時間割から授業コードが見つかりませんでした。\nダッシュボードを開いた状態で実行してください。");
        }
        
        // 未取得のシラバスを確認
        const storageKeys = response.courseCodes.map(code => `syllabus_${code}`);
        chrome.storage.local.get(storageKeys, (result) => {
          const missingCodes = response.courseCodes.filter(code => !result[`syllabus_${code}`]);
          
          if (missingCodes.length === 0) {
            alert("登録されているすべての授業のシラバス情報はすでに取得済みです。\n最新の情報に更新したい場合は、「取得したデータを削除」を実行してから再度実行してください。");
          } else {
            chrome.runtime.sendMessage({ action: "startAutoFetchSyllabus", courseCodes: missingCodes, originalTabId: activeTab.id });
            alert(`未取得の ${missingCodes.length} 件の授業のシラバス自動取得を開始します。\n別タブが順次開いて処理されますので、しばらくお待ちください。`);
          }
        });
      });
    });
  };

// ==========================================
// 初期化・設定読み込み
// ==========================================
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  chrome.storage.local.get({ 
    isEnabled: true, isDarkMode: prefersDark, isSkipHomeEnabled: true, 
    isStaffMode: false, isSyllabusEnabled: true, isHighlightCurrentClassEnabled: true 
  }, (data) => {
    toggle.checked = data.isEnabled;
    darkToggle.checked = data.isDarkMode;
    skipHomeToggle.checked = data.isSkipHomeEnabled;
    highlightCurrentClassToggle.checked = data.isHighlightCurrentClassEnabled;
    staffModeToggle.checked = data.isStaffMode;
    if (syllabusToggle) syllabusToggle.checked = data.isSyllabusEnabled;

    if (data.isDarkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    }
    updateDependentUI(data.isEnabled);
  });

// ==========================================
// イベントリスナー（トグル・ボタン）
// ==========================================

  // メイン機能切替
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    updateDependentUI(isEnabled);

    const updates = { isEnabled };
    if (!isEnabled) {
      if (staffModeToggle.checked) { staffModeToggle.checked = false; updates.isStaffMode = false; }
      if (syllabusToggle?.checked) { syllabusToggle.checked = false; updates.isSyllabusEnabled = false; }
      if (highlightCurrentClassToggle.checked) { highlightCurrentClassToggle.checked = false; updates.isHighlightCurrentClassEnabled = false; }
    }
    chrome.storage.local.set(updates, reloadTabs);
  });

  // ダークモード切替
  darkToggle.addEventListener('change', () => {
    const isDarkMode = darkToggle.checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    chrome.storage.local.set({ isDarkMode: isDarkMode }, reloadTabs);
  });

  // その他設定切替
  skipHomeToggle.addEventListener('change', () => chrome.storage.local.set({ isSkipHomeEnabled: skipHomeToggle.checked }, reloadTabs));
  staffModeToggle.addEventListener('change', () => chrome.storage.local.set({ isStaffMode: staffModeToggle.checked }, reloadTabs));
  highlightCurrentClassToggle.addEventListener('change', () => chrome.storage.local.set({ isHighlightCurrentClassEnabled: highlightCurrentClassToggle.checked }, reloadTabs));

  // シラバス連携切替
  if (syllabusToggle) {
    syllabusToggle.addEventListener('change', () => {
      chrome.storage.local.set({ isSyllabusEnabled: syllabusToggle.checked }, () => {
        if (syllabusToggle.checked && confirm("シラバス情報の自動取得がオンになりました。\n登録されたすべての授業のシラバスを自動取得しますか？\n※Moodleのダッシュボードを開いている必要があります。")) {
          triggerAutoFetch();
        } else {
          reloadTabs();
        }
      }); 
    });
  }

  // ボタンアクション
  if (autoFetchSyllabusBtn) autoFetchSyllabusBtn.addEventListener('click', triggerAutoFetch);

  if (clearSyllabusDataBtn) {
    clearSyllabusDataBtn.addEventListener('click', () => {
      if (!confirm('取得したシラバスのデータをすべて削除しますか？\n表示が消え、再度シラバスを開くまで表示されなくなります。')) return;
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
    });
  }

  if (resetExtensionBtn) {
    resetExtensionBtn.addEventListener('click', () => {
      if (!confirm('拡張機能のすべての設定と取得したデータを削除し、初期状態に戻しますか？\nこの操作は取り消せません。')) return;
      chrome.storage.local.clear(() => {
        alert('すべての設定とデータをリセットしました。\nページを再読み込みします。');
        reloadTabs();
        window.close();
      });
    });
  }
});
