document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('extensionToggle');
  const darkToggle = document.getElementById('darkModeToggle');

  // 保存されている状態を取得
  chrome.storage.local.get({ isEnabled: true, isDarkMode: false }, (data) => {
    toggle.checked = data.isEnabled;
    darkToggle.checked = data.isDarkMode;
  });

  // Moodle のタブをリロードして変更を反映する共通関数
  const reloadTabs = () => {
    chrome.tabs.query({ url: "*://lms.ritsumei.ac.jp/*" }, (tabs) => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));
    });
  };

  // トグル切り替え時の処理 (レイアウト変更)
  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ isEnabled: toggle.checked }, reloadTabs);
  });

  // トグル切り替え時の処理 (ダークモード)
  darkToggle.addEventListener('change', () => {
    chrome.storage.local.set({ isDarkMode: darkToggle.checked }, reloadTabs);
  });
});