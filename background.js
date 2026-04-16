chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: "welcome.html" });
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // 開発中のリロード時を避け、実際のバージョンアップ時のみ開く
    const currentVersion = chrome.runtime.getManifest().version;
    if (details.previousVersion !== currentVersion) {
      chrome.tabs.create({ url: "welcome.html" });
    }
  }
});

// Chrome標準の自動確認でアップデートが見つかった場合も即時適用
chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
});

let fetchQueue = [];
let isFetching = false;
let currentFetchTabId = null;
let fetchTimeoutId = null;
let originalTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startAutoFetchSyllabus") {
    fetchQueue = request.courseCodes;
    originalTabId = request.originalTabId;
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