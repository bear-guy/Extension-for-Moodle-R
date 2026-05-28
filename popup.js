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
  const luckyBtn = document.getElementById('luckyBtn');
  const popupTitleIcon = document.getElementById('popupTitleIcon');
  const popupTitleText = document.getElementById('popupTitleText');
  const languageSelect = document.getElementById('languageSelect');

  // 言語設定の初期化と適用
  let currentLang = 'ja';
  window.MoodleExtI18n.getLanguage((lang) => {
    currentLang = lang;
    if (languageSelect) languageSelect.value = currentLang;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = window.MoodleExtI18n.getMessage(key, currentLang);
      if (text) {
        if (el.tagName === 'INPUT' && el.type === 'button') {
          el.value = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // 動的にフッターリンクのURL言語パラメータを更新
    const supportLink = document.querySelector('a[data-i18n="support_contact"]');
    if (supportLink) supportLink.href = `https://bear-guy.github.io/Extension-for-Moodle-R/welcome.html?lang=${currentLang}#contact`;

    const featureLink = document.querySelector('a[data-i18n="feature_intro"]');
    if (featureLink) featureLink.href = `https://bear-guy.github.io/Extension-for-Moodle-R/welcome.html?lang=${currentLang}#features`;

    const privacyLink = document.querySelector('a[data-i18n="privacy_policy"]');
    if (privacyLink) privacyLink.href = `https://bear-guy.github.io/Extension-for-Moodle-R/privacy.html?lang=${currentLang}`;
  });

  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      chrome.storage.local.set({ displayLanguage: selected }, () => { reloadTabs(); window.location.reload(); });
    });
  }

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
          if (showAlert) alert(window.MoodleExtI18n.getMessage('alert_syllabus_cleared', currentLang));
          if (callback) callback();
        });
      } else {
        if (showAlert) alert(window.MoodleExtI18n.getMessage('alert_no_data_to_clear', currentLang));
        if (callback) callback();
      }
    });
  };

  // 保存されている状態を取得
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  chrome.storage.local.get({ isEnabled: true, isDarkMode: prefersDark, isSkipHomeEnabled: true, isStaffMode: false, isSyllabusEnabled: true, isHighlightCurrentClassEnabled: true, isLuckyEnabled: false, luckyUniversity: 'kyodai' }, (data) => {
    toggle.checked = data.isEnabled;
    darkToggle.checked = data.isDarkMode;
    skipHomeToggle.checked = data.isSkipHomeEnabled;
    highlightCurrentClassToggle.checked = data.isHighlightCurrentClassEnabled;
    staffModeToggle.checked = data.isStaffMode;
    if (luckyBtn) {
      luckyBtn.dataset.enabled = data.isLuckyEnabled;
      luckyBtn.classList.add('rainbow-animate');
      setTimeout(() => luckyBtn.classList.remove('rainbow-animate'), 1500);
    }
    if (data.isLuckyEnabled) {
      if (popupTitleIcon) popupTitleIcon.src = `lucky/${data.luckyUniversity}.icon128.png`;
      if (popupTitleText) popupTitleText.textContent = 'Extension for Moodle+R';
    }
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
      if (!confirm(window.MoodleExtI18n.getMessage('confirm_disable_better_layout', currentLang))) {
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

  // I'm feeling lucky ボタンクリック時の処理
  if (luckyBtn) {
    const universities = ['doshisha', 'handai', 'kansai', 'kansaigakuin', 'keio', 'kyodai', 'todai', 'waseda'];
    luckyBtn.addEventListener('click', () => {
      const isEnabled = luckyBtn.dataset.enabled === 'true';
      const newState = !isEnabled;
      if (typeof sendGAEvent === 'function') {
        sendGAEvent('feature_toggled', { feature_name: 'im_feeling_lucky', enabled: newState });
      }

      const selectedUni = newState ? universities[Math.floor(Math.random() * universities.length)] : 'kyodai';

      chrome.storage.local.set({ isLuckyEnabled: newState, luckyUniversity: selectedUni }, () => {
        luckyBtn.dataset.enabled = newState;
        if (newState) {
          if (popupTitleIcon) popupTitleIcon.src = `lucky/${selectedUni}.icon128.png`;
          if (popupTitleText) popupTitleText.textContent = 'Extension for Moodle+R';
        } else {
          if (popupTitleIcon) popupTitleIcon.src = 'icons/icon128.png';
          if (popupTitleText) popupTitleText.textContent = 'Extension for Moodle+R';
        }
      });
    });
  }

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
            alert(window.MoodleExtI18n.getMessage('syllabus_fetch_no_course_codes', currentLang));
          } else {
            // 取得済みのシラバスデータをストレージから確認する
            const storageKeys = response.courseCodes.map(code => `syllabus_${code}`);
            chrome.storage.local.get(storageKeys, (result) => {
              const missingCodes = response.courseCodes.filter(code => !result[`syllabus_${code}`]);
              
              if (missingCodes.length === 0) {
                alert(window.MoodleExtI18n.getMessage('syllabus_fetch_all_done', currentLang));
              } else {
                chrome.storage.local.set({ hasPromptedAutoFetch: true });
                chrome.runtime.sendMessage({ 
                  action: "startAutoFetchSyllabus", 
                  courseCodes: missingCodes, // 未取得の授業コードだけを渡す
                  originalTabId: activeTab.id
                });
                alert(window.MoodleExtI18n.getMessage('syllabus_fetch_start', currentLang, { count: missingCodes.length }));
              }
            });
          }
        });
      } else {
        alert(window.MoodleExtI18n.getMessage('syllabus_fetch_no_course_codes', currentLang));
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
        if (!confirm(window.MoodleExtI18n.getMessage('confirm_disable_syllabus', currentLang))) {
          syllabusToggle.checked = true; // キャンセル時はトグルを元に戻す
          return;
        }
      }

      updateSyllabusButtons(isEnabled);

      chrome.storage.local.set({ isSyllabusEnabled: isEnabled, hasPromptedAutoFetch: true }, () => {
        if (isEnabled) {
          if (confirm(window.MoodleExtI18n.getMessage('confirm_enable_syllabus', currentLang))) {
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
      if (confirm(window.MoodleExtI18n.getMessage('confirm_clear_syllabus', currentLang))) {
        if (typeof sendGAEvent === 'function') {
          sendGAEvent('action_taken', { action_name: 'click_clear_syllabus_data' });
        }
        clearSyllabusData(true, reloadTabs);
      }
    });
  }

});