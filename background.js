import { sendGAEvent } from './analytics.js';

chrome.runtime.onInstalled.addListener((details) => {
  let lang = 'en';
  if (navigator.language.startsWith('ja')) lang = 'ja';
  else if (navigator.language.startsWith('zh')) lang = 'zh';
  else if (navigator.language.startsWith('ko')) lang = 'ko';
  else if (navigator.language.startsWith('es')) lang = 'es';
  const welcomeUrl = `https://bear-guy.github.io/Extension-for-Moodle-R/welcome.html?lang=${lang}`;

  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.set({
      isEnabled: true,
      isSkipHomeEnabled: true,
      isSyllabusEnabled: true,
      isHighlightCurrentClassEnabled: true,
      isStaffMode: false,
      hasPromptedAutoFetch: false
    });
    
    // 拡張機能のインストールを計測
    sendGAEvent('extension_installed', { version: chrome.runtime.getManifest().version });

    chrome.tabs.create({ url: welcomeUrl });
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // 開発中のリロード時を避け、実際のバージョンアップ時のみ開く
    const currentVersion = chrome.runtime.getManifest().version;
    if (details.previousVersion !== currentVersion) {
      chrome.tabs.create({ url: welcomeUrl });
    }
  }
});

// Chrome標準の自動確認でアップデートが見つかった場合
chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
});

let fetchQueue = [];
let isFetching = false;
let currentFetchTabId = null;
let fetchTimeoutId = null;
let originalTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendDailySettings") {
    // sendGAEvent は analytics.js 側で設定情報を自動的に付与してくれます
    sendGAEvent('daily_settings_report', request.deviceInfo || {});
  } else if (request.action === "startAutoFetchSyllabus") {
    fetchQueue = request.courseCodes;
    originalTabId = request.originalTabId || (sender.tab ? sender.tab.id : null);
    if (!isFetching) {
      processNextFetch();
    }
  } else if (request.action === "syllabusFetchComplete") {
    // 1つのシラバス取得が完了したらタブを閉じて次へ
    if (currentFetchTabId && sender.tab && sender.tab.id === currentFetchTabId) {
      clearTimeout(fetchTimeoutId);
      chrome.tabs.remove(currentFetchTabId, () => {
        currentFetchTabId = null;
        processNextFetch();
      });
    }
  } else if (request.action === "reloadMoodleTabs") {
    // ドロワー（iframe）からのタブリロード要求
    chrome.tabs.query({ url: ["*://lms.ritsumei.ac.jp/*", "*://syllabus.ritsumei.ac.jp/*"] }, (tabs) => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));
    });
  } else if (request.action === "triggerAutoFetchFromDrawer") {
    // ドロワー（iframe）からのシラバス自動取得要求
    chrome.tabs.query({ url: "*://lms.ritsumei.ac.jp/*" }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ status: 'no_codes' });
        return;
      }
      const targetTab = tabs.find(t => t.active) || tabs[0];
      chrome.tabs.sendMessage(targetTab.id, { action: "getCourseCodes" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.courseCodes || response.courseCodes.length === 0) {
          sendResponse({ status: 'no_codes' });
          return;
        }
        const storageKeys = response.courseCodes.map(code => `syllabus_${code}`);
        chrome.storage.local.get(storageKeys, (result) => {
          const missingCodes = response.courseCodes.filter(code => !result[`syllabus_${code}`]);
          if (missingCodes.length === 0) {
            sendResponse({ status: 'all_done' });
          } else {
            chrome.storage.local.set({ hasPromptedAutoFetch: true });
            fetchQueue = missingCodes;
            originalTabId = targetTab.id;
            if (!isFetching) processNextFetch();
            sendResponse({ status: 'started', count: missingCodes.length });
          }
        });
      });
    });
    return true; // 非同期レスポンスのために必要
  } else if (request.action === "fetchAcademicStatus") {
    // コンテンツスクリプトのCORS回避のため、バックグラウンドでフェッチを実行
    fetch('https://www.ritsumei.ac.jp/academic-affairs/status/')
      .then(res => res.text())
      .then(html => sendResponse({ success: true, html: html }))
      .catch(err => sendResponse({ success: false, error: err.toString() }));
    return true; // 非同期レスポンスのために必要
  }
});

function processNextFetch() {
  if (fetchQueue.length === 0) {
    isFetching = false;
    if (originalTabId) {
      chrome.tabs.sendMessage(originalTabId, { action: "autoFetchCompleted" }).catch(() => {});
    }
    return;
  }

  isFetching = true;
  const nextCode = fetchQueue.shift();
  // 自動取得モードを示すパラメータを付与して開く
  const url = `https://syllabus.ritsumei.ac.jp/syllabus/s/?coursecode=${nextCode}&autofetch=true`;
  
  chrome.tabs.create({ url: url, active: false }, (tab) => {
    currentFetchTabId = tab.id;
    fetchTimeoutId = setTimeout(() => {
      if (currentFetchTabId === tab.id) {
        chrome.tabs.remove(currentFetchTabId, () => {
          currentFetchTabId = null;
          processNextFetch();
        });
      }
    }, 15000); // 15秒でタイムアウトして強制的に次へ
  });
}