import { sendGAEvent } from './analytics.js';

chrome.runtime.onInstalled.addListener((details) => {
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

    chrome.tabs.create({ url: "https://bear-guy.github.io/Extension-for-Moodle-R/welcome.html" });
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // 開発中のリロード時を避け、実際のバージョンアップ時のみ開く
    const currentVersion = chrome.runtime.getManifest().version;
    if (details.previousVersion !== currentVersion) {
      chrome.tabs.create({ url: "https://bear-guy.github.io/Extension-for-Moodle-R/welcome.html" });
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
    sendGAEvent('daily_settings_report');
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