import { sendGAEvent } from './analytics.js';

// iframe内（ドロワー）で動作しているかを検出
let isInIframe = false;
try {
  isInIframe = window.self !== window.top;
} catch (e) {
  isInIframe = true;
}

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
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const baseColorSelect = document.getElementById('baseColorSelect');
  const baseColorWrapper = document.getElementById('baseColorWrapper');
  const todayColorSelect = document.getElementById('todayColorSelect');
  const currentClassColorSelect = document.getElementById('currentClassColorSelect');
  const todayColorWrapper = document.getElementById('todayColorWrapper');
  const currentClassColorWrapper = document.getElementById('currentClassColorWrapper');

  // カスタムセレクトボックスの生成
  const colorOptions = [
    { value: 'default', color: '#bfecf4', i18n: 'color_default' },
    { value: 'lightblue', color: '#81d4fa', i18n: 'color_lightblue' },
    { value: 'red', color: '#ef9a9a', i18n: 'color_red' },
    { value: 'pink', color: '#f48fb1', i18n: 'color_pink' },
    { value: 'purple', color: '#ce93d8', i18n: 'color_purple' },
    { value: 'indigo', color: '#9fa8da', i18n: 'color_indigo' },
    { value: 'blue', color: '#90caf9', i18n: 'color_blue' },
    { value: 'cyan', color: '#80deea', i18n: 'color_cyan' },
    { value: 'teal', color: '#80cbc4', i18n: 'color_teal' },
    { value: 'green', color: '#a5d6a7', i18n: 'color_green' },
    { value: 'lightgreen', color: '#c5e1a5', i18n: 'color_lightgreen' },
    { value: 'lime', color: '#e6ee9c', i18n: 'color_lime' },
    { value: 'yellow', color: '#fff59d', i18n: 'color_yellow' },
    { value: 'amber', color: '#ffe082', i18n: 'color_amber' },
    { value: 'orange', color: '#ffcc80', i18n: 'color_orange' },
    { value: 'brown', color: '#bcaaa4', i18n: 'color_brown' },
    { value: 'grey', color: '#eeeeee', i18n: 'color_grey' }
  ];

  document.querySelectorAll('.custom-select[data-type="color-select"]').forEach(el => {
    const allowDefault = el.getAttribute('data-allow-default') === 'true';
    const availableColors = allowDefault ? colorOptions : colorOptions.filter(c => c.value !== 'default');
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = `<span class="color-preview"></span><span class="custom-select-label"></span>`;
    el.appendChild(trigger);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-options';
    availableColors.forEach(c => {
      const opt = document.createElement('div');
      opt.className = 'custom-option';
      opt.dataset.value = c.value;
      opt.innerHTML = `<span class="color-preview" style="background-color: ${c.color}"></span><span class="option-label" data-i18n="${c.i18n}"></span>`;
      optionsContainer.appendChild(opt);
    });
    el.appendChild(optionsContainer);
    
    el._value = availableColors[0].value;
    
    Object.defineProperty(el, 'value', {
      get: () => el._value,
      set: (val) => {
        el._value = val;
        const selectedColorObj = availableColors.find(c => c.value === val) || availableColors[0];
        trigger.querySelector('.color-preview').style.backgroundColor = selectedColorObj.color;
        const labelEl = trigger.querySelector('.custom-select-label');
        labelEl.setAttribute('data-i18n', selectedColorObj.i18n);
        
        if (window.MoodleExtI18n && window.MoodleExtI18n.getMessage) {
           const currentLang = document.documentElement.lang || 'ja';
           labelEl.innerText = window.MoodleExtI18n.getMessage(selectedColorObj.i18n, currentLang);
        } else {
           const optLabel = optionsContainer.querySelector(`[data-value="${val}"] .option-label`);
           if (optLabel) labelEl.innerText = optLabel.innerText;
        }

        optionsContainer.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
        const opt = optionsContainer.querySelector(`[data-value="${val}"]`);
        if (opt) opt.classList.add('selected');
      }
    });

    Object.defineProperty(el, 'disabled', {
      get: () => el.classList.contains('disabled'),
      set: (val) => {
        if (val) el.classList.add('disabled');
        else el.classList.remove('disabled');
      }
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.classList.contains('disabled')) return;
      document.querySelectorAll('.custom-select.open').forEach(other => {
        if (other !== el) other.classList.remove('open');
      });
      el.classList.toggle('open');
    });

    optionsContainer.addEventListener('click', (e) => {
      const opt = e.target.closest('.custom-option');
      if (opt) {
        el.value = opt.dataset.value;
        el.classList.remove('open');
        el.dispatchEvent(new Event('change'));
      }
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
  });

  // iframe内でない場合（直接ポップアップを開いた場合）は閉じるボタンを非表示にする
  if (closeDrawerBtn) {
    if (!isInIframe) {
      closeDrawerBtn.style.display = 'none';
    } else {
      closeDrawerBtn.addEventListener('click', () => {
        window.parent.postMessage({ action: 'closeSettingsDrawer' }, '*');
      });
    }
  }

  // ドロワーが開かれたときに虹色アニメーションを再実行する
  window.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'drawerOpened') {
      if (luckyBtn) {
        luckyBtn.classList.remove('rainbow-animate');
        void luckyBtn.offsetWidth; // リフローを強制してアニメーションをリセット
        luckyBtn.classList.add('rainbow-animate');
        setTimeout(() => luckyBtn.classList.remove('rainbow-animate'), 1500);
      }
    }
  });

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

    if (baseColorSelect) baseColorSelect.disabled = !isEnabled;
    if (baseColorWrapper) baseColorWrapper.style.opacity = isEnabled ? '1' : '0.4';

    const isHighlightEnabled = isEnabled && highlightCurrentClassToggle.checked;
    if (todayColorSelect) todayColorSelect.disabled = !isHighlightEnabled;
    if (currentClassColorSelect) currentClassColorSelect.disabled = !isHighlightEnabled;
    if (todayColorWrapper) todayColorWrapper.style.opacity = isHighlightEnabled ? '1' : '0.4';
    if (currentClassColorWrapper) currentClassColorWrapper.style.opacity = isHighlightEnabled ? '1' : '0.4';
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
    if (isInIframe) {
      // iframe内ではchrome.tabs APIが使えないため、バックグラウンドに委譲する
      chrome.runtime.sendMessage({ action: 'reloadMoodleTabs' });
      return;
    }
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

  // iframe内でも動作するalert代替関数（トースト通知を表示）
  const safeAlert = (message) => {
    if (!isInIframe) {
      alert(message);
      return;
    }
    // iframe内ではカスタムトースト通知を表示
    const existing = document.querySelector('.popup-toast-notification');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'popup-toast-notification';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: document.body.classList.contains('dark-mode') ? '#444' : '#323232',
      color: '#fff', padding: '10px 16px', borderRadius: '8px', fontSize: '13px',
      zIndex: '10000', maxWidth: '90%', textAlign: 'center', wordBreak: 'break-word',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)', opacity: '0', transition: 'opacity 0.3s'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // iframe内でも動作するconfirm代替関数（カスタムダイアログを表示）
  const safeConfirm = (message) => {
    if (!isInIframe) {
      return Promise.resolve(confirm(message));
    }
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '10001',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      });
      const isDark = document.body.classList.contains('dark-mode');
      const dialog = document.createElement('div');
      Object.assign(dialog.style, {
        backgroundColor: isDark ? '#2c2c2c' : '#fff', color: isDark ? '#e0e0e0' : '#333',
        borderRadius: '12px', padding: '20px', maxWidth: '85%', width: '280px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)', textAlign: 'center'
      });
      const msg = document.createElement('p');
      msg.textContent = message;
      Object.assign(msg.style, { fontSize: '13px', lineHeight: '1.5', margin: '0 0 16px 0' });

      const btnContainer = document.createElement('div');
      Object.assign(btnContainer.style, { display: 'flex', gap: '8px', justifyContent: 'center' });

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = currentLang === 'ja' ? 'キャンセル' : 'Cancel';
      Object.assign(cancelBtn.style, {
        padding: '8px 16px', borderRadius: '6px', border: `1px solid ${isDark ? '#555' : '#ccc'}`,
        backgroundColor: isDark ? '#3a3a3a' : '#f5f5f5', color: isDark ? '#e0e0e0' : '#333',
        cursor: 'pointer', fontSize: '13px', flex: '1'
      });

      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      Object.assign(okBtn.style, {
        padding: '8px 16px', borderRadius: '6px', border: 'none',
        backgroundColor: '#2196F3', color: '#fff',
        cursor: 'pointer', fontSize: '13px', flex: '1'
      });

      cancelBtn.onclick = () => { overlay.remove(); resolve(false); };
      okBtn.onclick = () => { overlay.remove(); resolve(true); };

      btnContainer.append(cancelBtn, okBtn);
      dialog.append(msg, btnContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  };

  // シラバスデータを削除する共通関数
  const clearSyllabusData = (showAlert, callback) => {
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(key => key.startsWith('syllabus_'));
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          if (showAlert) safeAlert(window.MoodleExtI18n.getMessage('alert_syllabus_cleared', currentLang));
          if (callback) callback();
        });
      } else {
        if (showAlert) safeAlert(window.MoodleExtI18n.getMessage('alert_no_data_to_clear', currentLang));
        if (callback) callback();
      }
    });
  };

  // 保存されている状態を取得
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  chrome.storage.local.get({ isEnabled: true, isDarkMode: prefersDark, isSkipHomeEnabled: true, isStaffMode: false, isSyllabusEnabled: true, isHighlightCurrentClassEnabled: true, isLuckyEnabled: false, luckyUniversity: 'kyodai', baseColor: 'default', todayColor: 'lightblue', currentClassColor: 'yellow' }, (data) => {
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
    if (baseColorSelect) baseColorSelect.value = data.baseColor;
    if (todayColorSelect) todayColorSelect.value = data.todayColor;
    if (currentClassColorSelect) currentClassColorSelect.value = data.currentClassColor;

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
  toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;

    // イベント送信
    if (typeof sendGAEvent === 'function') {
      sendGAEvent('feature_toggled', { feature_name: 'better_layout', enabled: isEnabled });
    }

    // シラバスがオンの状態でベターレイアウトをオフにしようとした場合の警告
    if (!isEnabled && syllabusToggle && syllabusToggle.checked) {
      const confirmed = await safeConfirm(window.MoodleExtI18n.getMessage('confirm_disable_better_layout', currentLang));
      if (!confirmed) {
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
    updateDependentUI(toggle.checked);
    chrome.storage.local.set({ isHighlightCurrentClassEnabled: highlightCurrentClassToggle.checked }, reloadTabs);
  });

  if (baseColorSelect) {
    baseColorSelect.addEventListener('change', (e) => {
      chrome.storage.local.set({ baseColor: e.target.value });
    });
  }

  if (todayColorSelect) {
    todayColorSelect.addEventListener('change', (e) => {
      chrome.storage.local.set({ todayColor: e.target.value });
    });
  }

  if (currentClassColorSelect) {
    currentClassColorSelect.addEventListener('change', (e) => {
      chrome.storage.local.set({ currentClassColor: e.target.value });
    });
  }

  // シラバス自動取得の実行関数
  const triggerAutoFetch = () => {
    if (isInIframe) {
      // iframe内ではchrome.tabs APIが使えないため、バックグラウンドに委譲する
      chrome.runtime.sendMessage({ action: 'triggerAutoFetchFromDrawer' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          safeAlert(window.MoodleExtI18n.getMessage('syllabus_fetch_no_course_codes', currentLang));
          return;
        }
        if (response.status === 'no_codes') {
          safeAlert(window.MoodleExtI18n.getMessage('syllabus_fetch_no_course_codes', currentLang));
        } else if (response.status === 'all_done') {
          safeAlert(window.MoodleExtI18n.getMessage('syllabus_fetch_all_done', currentLang));
        } else if (response.status === 'started') {
          safeAlert(window.MoodleExtI18n.getMessage('syllabus_fetch_start', currentLang, { count: response.count }));
        }
      });
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url.includes('lms.ritsumei.ac.jp')) {
        chrome.tabs.sendMessage(activeTab.id, { action: "getCourseCodes" }, (response) => {
          if (chrome.runtime.lastError || !response || !response.courseCodes || response.courseCodes.length === 0) {
            safeAlert(window.MoodleExtI18n.getMessage('syllabus_fetch_no_course_codes', currentLang));
          } else {
            // 取得済みのシラバスデータをストレージから確認する
            const storageKeys = response.courseCodes.map(code => `syllabus_${code}`);
            chrome.storage.local.get(storageKeys, (result) => {
              const missingCodes = response.courseCodes.filter(code => !result[`syllabus_${code}`]);

              if (missingCodes.length === 0) {
                safeAlert(window.MoodleExtI18n.getMessage('syllabus_fetch_all_done', currentLang));
              } else {
                chrome.storage.local.set({ hasPromptedAutoFetch: true });
                chrome.runtime.sendMessage({
                  action: "startAutoFetchSyllabus",
                  courseCodes: missingCodes, // 未取得の授業コードだけを渡す
                  originalTabId: activeTab.id
                });
                safeAlert(window.MoodleExtI18n.getMessage('syllabus_fetch_start', currentLang, { count: missingCodes.length }));
              }
            });
          }
        });
      } else {
        safeAlert(window.MoodleExtI18n.getMessage('syllabus_fetch_no_course_codes', currentLang));
      }
    });
  };

  // トグル切り替え時の処理 (シラバス連携)
  if (syllabusToggle) {
    syllabusToggle.addEventListener('change', async () => {
      const isEnabled = syllabusToggle.checked;
      if (typeof sendGAEvent === 'function') {
        sendGAEvent('feature_toggled', { feature_name: 'syllabus_auto_fetch', enabled: isEnabled });
      }

      // オフにした際の警告
      if (!isEnabled) {
        const confirmed = await safeConfirm(window.MoodleExtI18n.getMessage('confirm_disable_syllabus', currentLang));
        if (!confirmed) {
          syllabusToggle.checked = true; // キャンセル時はトグルを元に戻す
          return;
        }
      }

      updateSyllabusButtons(isEnabled);

      chrome.storage.local.set({ isSyllabusEnabled: isEnabled, hasPromptedAutoFetch: true }, async () => {
        if (isEnabled) {
          const shouldFetch = await safeConfirm(window.MoodleExtI18n.getMessage('confirm_enable_syllabus', currentLang));
          if (shouldFetch) {
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
    clearSyllabusDataBtn.addEventListener('click', async () => {
      const confirmed = await safeConfirm(window.MoodleExtI18n.getMessage('confirm_clear_syllabus', currentLang));
      if (confirmed) {
        if (typeof sendGAEvent === 'function') {
          sendGAEvent('action_taken', { action_name: 'click_clear_syllabus_data' });
        }
        clearSyllabusData(true, reloadTabs);
      }
    });
  }

});