import { sendGAEvent } from './analytics.js';

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
  const autoFetchSyllabusBtn = document.getElementById('autoFetchSyllabusBtn');
  const resetExtensionBtn = document.getElementById('resetExtensionBtn');

  // ベターレイアウトに依存するUI状態を更新する関数
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

  // シラバス機能に依存するボタン状態を更新する関数
  const updateSyllabusButtons = (isSyllabusEnabled) => {
    if (autoFetchSyllabusBtn && clearSyllabusDataBtn) {
      const opacity = isSyllabusEnabled ? '1' : '0.4';
      const pointerEvents = isSyllabusEnabled ? 'auto' : 'none';
      autoFetchSyllabusBtn.style.opacity = opacity;
      autoFetchSyllabusBtn.style.pointerEvents = pointerEvents;
      clearSyllabusDataBtn.style.opacity = opacity;
      clearSyllabusDataBtn.style.pointerEvents = pointerEvents;
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

  // シラバスデータを削除する共通関数
  const clearSyllabusData = (showAlert, callback) => {
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(key => key.startsWith('syllabus_'));
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          if (showAlert) alert('シラバスデータを削除しました。');
          if (callback) callback();
        });
      } else {
        if (showAlert) alert('削除するデータがありません。');
        if (callback) callback();
      }
    });
  };

  // 保存されている状態を取得
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  chrome.storage.local.get({ isEnabled: true, isDarkMode: prefersDark, isSkipHomeEnabled: true, isStaffMode: false, isSyllabusEnabled: true, isHighlightCurrentClassEnabled: true }, (data) => {
    toggle.checked = data.isEnabled;
    darkToggle.checked = data.isDarkMode;
    skipHomeToggle.checked = data.isSkipHomeEnabled;
    highlightCurrentClassToggle.checked = data.isHighlightCurrentClassEnabled;
    staffModeToggle.checked = data.isStaffMode;
    if (syllabusToggle) {
      syllabusToggle.checked = data.isSyllabusEnabled;
      updateSyllabusButtons(data.isEnabled && data.isSyllabusEnabled);
    }

    // 初期状態のダークモード表示を更新
    if (data.isDarkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    }

    // 初期状態の依存する設定の表示を更新
    updateDependentUI(data.isEnabled);

    // 値の適用が完了してからアニメーションを有効にする
    requestAnimationFrame(() => {
      setTimeout(() => document.body.classList.remove('preload'), 50);
    });

    if (typeof sendGAEvent === 'function') {
      sendGAEvent('popup_opened', {
        better_layout: data.isEnabled,
        dark_mode: data.isDarkMode,
        skip_home: data.isSkipHomeEnabled,
        staff_mode: data.isStaffMode,
        highlight_current_class: data.isHighlightCurrentClassEnabled,
        syllabus_auto_fetch: data.isSyllabusEnabled
      });
    }
  });

  // トグル切り替え時の処理 (レイアウト変更)
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    
    // イベント送信
    if (typeof sendGAEvent === 'function') {
      sendGAEvent('feature_toggled', { feature_name: 'better_layout', enabled: isEnabled });
    }

    // シラバスがオンの状態でベターレイアウトをオフにしようとした場合の警告
    if (!isEnabled && syllabusToggle && syllabusToggle.checked) {
      if (!confirm('ベターレイアウトをオフにするとシラバス機能も無効になり、取得済みのシラバスデータがすべて削除されます。\n本当によろしいですか？')) {
        toggle.checked = true; // キャンセル時はトグルを元に戻す
        return;
      }
    }

    updateDependentUI(isEnabled);
    
    if (syllabusToggle) {
      updateSyllabusButtons(isEnabled && syllabusToggle.checked);
    }

    const updates = { isEnabled: isEnabled };
    let shouldClearSyllabus = false;

    // ベターレイアウトがオフになったら、依存する機能も連動してオフにする
    if (!isEnabled && staffModeToggle.checked) {
      staffModeToggle.checked = false;
      updates.isStaffMode = false;
    }
    if (!isEnabled && syllabusToggle && syllabusToggle.checked) {
      syllabusToggle.checked = false;
      updates.isSyllabusEnabled = false;
      shouldClearSyllabus = true;
    }
    if (!isEnabled && highlightCurrentClassToggle.checked) {
      highlightCurrentClassToggle.checked = false;
      updates.isHighlightCurrentClassEnabled = false;
    }
    
    chrome.storage.local.set(updates, () => {
      if (shouldClearSyllabus) {
        clearSyllabusData(false, reloadTabs);
      } else {
        reloadTabs();
      }
    });
  });

  // トグル切り替え時の処理 (ダークモード)
  darkToggle.addEventListener('change', () => {
    const isDarkMode = darkToggle.checked;
    if (typeof sendGAEvent === 'function') {
      sendGAEvent('feature_toggled', { feature_name: 'dark_mode', enabled: isDarkMode });
    }
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
    if (typeof sendGAEvent === 'function') {
      sendGAEvent('feature_toggled', { feature_name: 'skip_home', enabled: skipHomeToggle.checked });
    }
    chrome.storage.local.set({ isSkipHomeEnabled: skipHomeToggle.checked }, reloadTabs);
  });

  // トグル切り替え時の処理 (教職員モード)
  staffModeToggle.addEventListener('change', () => {
    if (typeof sendGAEvent === 'function') {
      sendGAEvent('feature_toggled', { feature_name: 'staff_mode', enabled: staffModeToggle.checked });
    }
    chrome.storage.local.set({ isStaffMode: staffModeToggle.checked }, reloadTabs);
  });

  // トグル切り替え時の処理 (現在の授業をハイライト)
  highlightCurrentClassToggle.addEventListener('change', () => {
    if (typeof sendGAEvent === 'function') {
      sendGAEvent('feature_toggled', { feature_name: 'highlight_current_class', enabled: highlightCurrentClassToggle.checked });
    }
    chrome.storage.local.set({ isHighlightCurrentClassEnabled: highlightCurrentClassToggle.checked }, reloadTabs);
  });

  // シラバス自動取得の実行関数
  const triggerAutoFetch = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url.includes('lms.ritsumei.ac.jp')) {
        chrome.tabs.sendMessage(activeTab.id, { action: "getCourseCodes" }, (response) => {
          if (chrome.runtime.lastError || !response || !response.courseCodes || response.courseCodes.length === 0) {
            alert("時間割から授業コードが見つかりませんでした。\nMoodleのダッシュボード（時間割が表示されているページ）を開いた状態で実行してください。\nまた、すでに登録されている可能性があります。");
          } else {
            // 取得済みのシラバスデータをストレージから確認する
            const storageKeys = response.courseCodes.map(code => `syllabus_${code}`);
            chrome.storage.local.get(storageKeys, (result) => {
              const missingCodes = response.courseCodes.filter(code => !result[`syllabus_${code}`]);
              
              if (missingCodes.length === 0) {
                alert("登録されているすべての授業のシラバス情報はすでに取得済みです。\n最新の情報に更新したい場合は、下の「取得したデータを削除」を実行してから再度実行してください。");
              } else {
                chrome.storage.local.set({ hasPromptedAutoFetch: true });
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
      if (typeof sendGAEvent === 'function') {
        sendGAEvent('feature_toggled', { feature_name: 'syllabus_auto_fetch', enabled: isEnabled });
      }

      // オフにした際の警告
      if (!isEnabled) {
        if (!confirm('シラバス情報の自動取得をオフにすると、取得済みのシラバスデータがすべて削除されます。\n本当によろしいですか？')) {
          syllabusToggle.checked = true; // キャンセル時はトグルを元に戻す
          return;
        }
      }

      updateSyllabusButtons(isEnabled);

      chrome.storage.local.set({ isSyllabusEnabled: isEnabled, hasPromptedAutoFetch: true }, () => {
        if (isEnabled) {
          if (confirm("シラバス情報の自動取得がオンになりました。\n登録されたすべての授業のシラバスを自動取得しますか？（1分程度）\n※Moodleのダッシュボードを開いている必要があります。")) {
            if (typeof sendGAEvent === 'function') {
              sendGAEvent('action_taken', { action_name: 'start_auto_fetch_from_toggle' });
            }
            triggerAutoFetch();
          } else {
            reloadTabs();
          }
        } else {
          clearSyllabusData(false, reloadTabs);
        }
      }); 
    });
  }

  // シラバスデータの自動取得ボタン
  if (autoFetchSyllabusBtn) {
    autoFetchSyllabusBtn.addEventListener('click', () => {
      if (typeof sendGAEvent === 'function') {
        sendGAEvent('action_taken', { action_name: 'click_auto_fetch_btn' });
      }
      triggerAutoFetch();
    });
  }

  // シラバスデータの削除ボタン
  if (clearSyllabusDataBtn) {
    clearSyllabusDataBtn.addEventListener('click', () => {
      if (confirm('取得したシラバスのデータをすべて削除しますか？\n取得したシラバス情報の表示が消え、再度シラバスを開くまで表示されなくなります。')) {
        if (typeof sendGAEvent === 'function') {
          sendGAEvent('action_taken', { action_name: 'click_clear_syllabus_data' });
        }
        clearSyllabusData(true, reloadTabs);
      }
    });
  }

  // 拡張機能のリセットボタン
  if (resetExtensionBtn) {
    resetExtensionBtn.addEventListener('click', () => {
      if (confirm('拡張機能のすべての設定と取得したデータを削除し、拡張機能を初期状態に戻しますか？\nこの操作は取り消せません。')) {
        if (typeof sendGAEvent === 'function') {
          sendGAEvent('action_taken', { action_name: 'click_reset_extension' });
        }
        chrome.storage.local.clear(() => {
          // デフォルト設定を適用する
          const resetSettings = {
            isEnabled: true,
            isDarkMode: false,
            isSkipHomeEnabled: true,
            isStaffMode: false,
            isSyllabusEnabled: true,
            isHighlightCurrentClassEnabled: true,
            hasPromptedAutoFetch: false
          };
          chrome.storage.local.set(resetSettings, () => {
            alert('すべてのデータを削除し、設定を初期状態にしました。\nページを再読み込みします。');
            reloadTabs();
            window.close(); // 完了後にポップアップを閉じる
          });
        });
      }
    });
  }
});