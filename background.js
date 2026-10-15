import { sendGAEvent } from './analytics.js';
import './i18n.js';

const i18n = globalThis.MoodleExtI18n;

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
      isDeadlineEnabled: true,
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

// ユーザーがタブをドラッグしている間はタブの作成・削除が失敗するので、少し待って再試行する
const TAB_RETRY_DELAY_MS = 500;
const TAB_RETRY_MAX = 20;

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
      finishCurrentFetch();
    }
  } else if (request.action === "reloadMoodleTabs") {
    // ドロワー（iframe）からのタブリロード要求
    chrome.tabs.query({ url: ["*://lms.ritsumei.ac.jp/*", "*://syllabus.ritsumei.ac.jp/*"] }, (tabs) => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));
    });
  } else if (request.action === "triggerAutoFetchFromDrawer") {
    // ドロワー（iframe）からのシラバス自動取得要求。ドロワーを開いているタブの時間割から授業コードを集める
    const targetTabId = sender.tab?.id;
    if (!targetTabId) {
      sendResponse({ status: 'no_codes' });
      return;
    }
    chrome.tabs.sendMessage(targetTabId, { action: "getCourseCodes" }, (response) => {
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
          // processNextFetch がキューから shift するので、件数を返す missingCodes とは別の配列にする
          fetchQueue = [...missingCodes];
          originalTabId = targetTabId;
          if (!isFetching) processNextFetch();
          sendResponse({ status: 'started', count: missingCodes.length });
        }
      });
    });
    return true; // 非同期レスポンスのために必要
  } else if (request.action === "trackAction") {
    // content script は GA に直接送れないので、操作の名前だけ受け取って送る
    sendGAEvent('action_taken', { action_name: request.actionName });
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
  openFetchTab(url);
}

function openFetchTab(url, attempt = 0) {
  chrome.tabs.create({ url: url, active: false }, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      // 作成できなければ再試行し、それでも駄目ならこの授業は飛ばして次へ（キューを止めない）
      if (attempt < TAB_RETRY_MAX) {
        setTimeout(() => openFetchTab(url, attempt + 1), TAB_RETRY_DELAY_MS);
      } else {
        processNextFetch();
      }
      return;
    }
    currentFetchTabId = tab.id;
    fetchTimeoutId = setTimeout(() => {
      if (currentFetchTabId === tab.id) {
        finishCurrentFetch();
      }
    }, 15000); // 15秒でタイムアウトして強制的に次へ
  });
}

// 取得用タブを閉じて次の授業へ進む
function finishCurrentFetch() {
  clearTimeout(fetchTimeoutId);
  const tabId = currentFetchTabId;
  // 閉じ終わるまでに完了通知とタイムアウトが重なっても二重に進まないよう、先に外しておく
  currentFetchTabId = null;
  removeTabWithRetry(tabId, processNextFetch);
}

function removeTabWithRetry(tabId, callback, attempt = 0) {
  chrome.tabs.remove(tabId, () => {
    const error = chrome.runtime.lastError;
    // ユーザーが既に閉じていた場合などは再試行しない
    if (error && error.message.includes('cannot be edited') && attempt < TAB_RETRY_MAX) {
      setTimeout(() => removeTabWithRetry(tabId, callback, attempt + 1), TAB_RETRY_DELAY_MS);
      return;
    }
    callback();
  });
}
// ==========================================
// 課題の締め切り（拡張アイコンのバッジ・通知）
// ==========================================
// 締め切りの一覧（deadlineEvents）は、Moodle のページを開いたときに content.js が取得・保存する。
// 通知に使う notifications / alarms は任意の権限（optional_permissions）で、「締め切りを通知」をオンにしたときに
// popup.js が chrome.permissions.request で求める。権限が無いあいだは chrome.notifications / chrome.alarms が undefined になる

const DEADLINE_PERMISSIONS = { permissions: ['notifications', 'alarms'] };
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// 締め切りの何ミリ秒前に通知するか
const NOTIFY_BEFORE = [{ kind: '24h', ms: DAY_MS }, { kind: '1h', ms: HOUR_MS }];
const BADGE_ALARM = 'deadline-badge';
// 通知用のアラームと通知の ID は deadline:<イベント ID>:<締め切り時刻>:<24h|1h>（締め切りが延びたら別の通知として扱う）
const NOTIFY_PREFIX = 'deadline:';

const getDeadlineState = () => chrome.storage.local.get({
  isEnabled: true, isDeadlineEnabled: true, deadlineEvents: [], deadlineNotified: {}, dismissedDeadlines: {}, displayLanguage: ''
});

// 「非表示」にした締め切り（dismissedDeadlines）は、件数・通知の予約・通知のすべてから除く
const deadlineKey = (e) => `${e.id}:${e.timesort}`;
const activeDeadlines = (state) => state.deadlineEvents.filter(e => !state.dismissedDeadlines[deadlineKey(e)]);

// 締め切りを非表示にする。締め切りから 14 日（content.js が取得する範囲）を過ぎた記録は消す（content.js にも同じ処理がある）
async function dismissDeadline(key) {
  const { dismissedDeadlines } = await chrome.storage.local.get({ dismissedDeadlines: {} });
  const now = Date.now();
  const next = Object.fromEntries(Object.entries(dismissedDeadlines).filter(([k]) => Number(k.split(':')[1]) * 1000 > now - 14 * DAY_MS));
  next[key] = now;
  await chrome.storage.local.set({ dismissedDeadlines: next });
}

// 24 時間以内の締め切りの件数を拡張アイコンに表示する
async function updateDeadlineBadge() {
  const state = await getDeadlineState();
  const now = Date.now();
  const upcoming = (state.isEnabled && state.isDeadlineEnabled) ? activeDeadlines(state).filter(e => e.timesort * 1000 > now) : [];
  const count = upcoming.filter(e => e.timesort * 1000 - now <= DAY_MS).length;
  const name = chrome.i18n.getMessage('extensionName');
  const lang = i18n.resolveLanguage(state.displayLanguage);

  await chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
  await chrome.action.setBadgeText({ text: count ? String(count) : '' });
  await chrome.action.setTitle({ title: count ? `${name}\n${i18n.getMessage('deadline_action_title', lang, { count })}` : name });

  // アラームを使えるときは、件数が次に変わる時刻（24 時間以内に入る・締め切りを過ぎる）に更新する
  // （使えないときは、Service Worker が起きたときと Moodle のページを開いたときに更新される）
  if (!chrome.alarms) return;
  const next = Math.min(...upcoming.flatMap(e => [e.timesort * 1000 - DAY_MS, e.timesort * 1000]).filter(t => t > now));
  if (Number.isFinite(next)) await chrome.alarms.create(BADGE_ALARM, { when: next + 1000 });
  else await chrome.alarms.clear(BADGE_ALARM);
}

// 締め切りの 24 時間前・1 時間前の通知を予約し直す
async function scheduleDeadlineNotifications() {
  if (!chrome.alarms) return;
  const state = await getDeadlineState();
  const alarms = await chrome.alarms.getAll();
  await Promise.all(alarms.filter(a => a.name.startsWith(NOTIFY_PREFIX)).map(a => chrome.alarms.clear(a.name)));
  if (!chrome.notifications) return;

  // 非表示にした締め切りの通知が通知センターに残っていたら消す
  const shown = Object.keys(await chrome.notifications.getAll()).filter(id => id.startsWith(NOTIFY_PREFIX));
  const hiddenNow = !state.isEnabled || !state.isDeadlineEnabled;
  await Promise.all(shown
    .filter(id => hiddenNow || state.dismissedDeadlines[id.slice(NOTIFY_PREFIX.length).split(':').slice(0, 2).join(':')])
    .map(id => chrome.notifications.clear(id)));
  if (hiddenNow) return;

  const now = Date.now();
  await Promise.all(activeDeadlines(state).flatMap(e => NOTIFY_BEFORE.map(({ kind, ms }) => {
    const key = `${e.id}:${e.timesort}:${kind}`;
    const when = e.timesort * 1000 - ms;
    return (when > now && !state.deadlineNotified[key]) ? chrome.alarms.create(NOTIFY_PREFIX + key, { when }) : null;
  })));
}

// 起動・設定変更・権限変更などのきっかけが重なっても、予約の削除と作成が入り混じらないよう順番に処理する
let deadlineQueue = Promise.resolve();
const queueDeadlineTask = (task) => (deadlineQueue = deadlineQueue.then(task).catch(e => console.debug('Failed to update deadlines', e)));
const syncDeadlines = () => queueDeadlineTask(() => Promise.all([updateDeadlineBadge(), scheduleDeadlineNotifications()]));

// 通知済みの記録（deadlineNotified）の読み書きが、ほぼ同時に鳴ったアラーム同士で競合しないよう、これもキューで順番に処理する
function handleDeadlineAlarm(alarm) {
  if (alarm.name === BADGE_ALARM) queueDeadlineTask(updateDeadlineBadge);
  else if (alarm.name.startsWith(NOTIFY_PREFIX)) queueDeadlineTask(() => notifyDeadline(alarm.name));
}

async function notifyDeadline(alarmName) {
  const key = alarmName.slice(NOTIFY_PREFIX.length);
  const [id, timesort, kind] = key.split(':');
  const state = await getDeadlineState();
  if (!state.isEnabled || !state.isDeadlineEnabled || !chrome.notifications || state.deadlineNotified[key] || state.dismissedDeadlines[`${id}:${timesort}`]) return;

  // 提出済みなどで一覧から消えた締め切りは通知しない
  const event = state.deadlineEvents.find(e => String(e.id) === id && String(e.timesort) === timesort);
  if (!event) return;

  // スリープ明けなどで遅れて届いたとき、締め切りを過ぎていたり 1 時間前の通知と重なったりするなら出さない
  const now = Date.now();
  const remaining = event.timesort * 1000 - now;
  if (remaining <= 0 || (kind === '24h' && remaining <= HOUR_MS)) return;

  // 通知済みの記録は、締め切りを過ぎたものを消しながら残す
  const notified = Object.fromEntries(Object.entries(state.deadlineNotified).filter(([k]) => Number(k.split(':')[1]) * 1000 > now));
  notified[key] = now;
  await chrome.storage.local.set({ deadlineNotified: notified });

  const lang = i18n.resolveLanguage(state.displayLanguage);
  // アラームは締め切りのちょうど 1 時間前などに鳴り、残りがわずかに足りないので、分に丸めてから時間に直す
  const relative = new Intl.RelativeTimeFormat(lang, { numeric: 'always' });
  const minutes = Math.max(1, Math.round(remaining / 60000));
  const time = minutes >= 60 ? relative.format(Math.round(minutes / 60), 'hour') : relative.format(minutes, 'minute');
  const date = new Intl.DateTimeFormat(lang, { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(event.timesort * 1000));

  chrome.notifications.create(alarmName, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: i18n.getMessage('deadline_notification_title', lang, { time }),
    message: `${event.name}\n${event.courseName} · ${date}`,
    // 先生の設定ミスなどで不要な締め切りを、通知から直接非表示にできるようにする（macOS ではマウスを乗せたときの「オプション」の中に出る）
    buttons: [{ title: i18n.getMessage('deadline_notification_dismiss', lang) }],
    priority: 2
  });
}

// 通知の「この締め切りを非表示」ボタン
function handleDeadlineNotificationButton(notificationId, buttonIndex) {
  if (!notificationId.startsWith(NOTIFY_PREFIX) || buttonIndex !== 0) return;
  const [id, timesort] = notificationId.slice(NOTIFY_PREFIX.length).split(':');
  chrome.notifications.clear(notificationId);
  // 保存すると storage.onChanged でバッジと通知の予約が組み直される
  queueDeadlineTask(() => dismissDeadline(`${id}:${timesort}`));
  sendGAEvent('action_taken', { action_name: 'dismiss_deadline_notification' });
}

// 通知をクリックしたら、その締め切りの活動ページを開く
async function handleDeadlineNotificationClick(notificationId) {
  if (!notificationId.startsWith(NOTIFY_PREFIX)) return;
  const [id] = notificationId.slice(NOTIFY_PREFIX.length).split(':');
  const { deadlineEvents } = await chrome.storage.local.get({ deadlineEvents: [] });
  const event = deadlineEvents.find(e => String(e.id) === id);
  chrome.tabs.create({ url: event?.url || 'https://lms.ritsumei.ac.jp/my/' });
  chrome.notifications.clear(notificationId);
}

function registerDeadlineListeners() {
  if (chrome.alarms && !chrome.alarms.onAlarm.hasListener(handleDeadlineAlarm)) chrome.alarms.onAlarm.addListener(handleDeadlineAlarm);
  if (chrome.notifications && !chrome.notifications.onClicked.hasListener(handleDeadlineNotificationClick)) chrome.notifications.onClicked.addListener(handleDeadlineNotificationClick);
  if (chrome.notifications && !chrome.notifications.onButtonClicked.hasListener(handleDeadlineNotificationButton)) chrome.notifications.onButtonClicked.addListener(handleDeadlineNotificationButton);
}

// 「締め切りを通知」の設定（isDeadlineNotifyEnabled）は、権限の有無に合わせてここで保存する
// （ツールバーのポップアップは許可ダイアログが出ると閉じることがあり、ポップアップ側では結果を受け取れないため）
async function syncDeadlineNotifySetting() {
  const granted = await chrome.permissions.contains(DEADLINE_PERMISSIONS);
  const { isDeadlineNotifyEnabled } = await chrome.storage.local.get({ isDeadlineNotifyEnabled: false });
  if (granted === isDeadlineNotifyEnabled) return;
  await chrome.storage.local.set({ isDeadlineNotifyEnabled: granted });
  sendGAEvent('feature_toggled', { feature_name: 'deadline_notification', enabled: granted });
}

// 権限があるときは、アラームと通知のクリックで Service Worker を起こせるようトップレベルで登録する
registerDeadlineListeners();

chrome.permissions.onAdded.addListener(async () => {
  registerDeadlineListeners();
  await syncDeadlineNotifySetting();
  syncDeadlines();
});

chrome.permissions.onRemoved.addListener(async () => {
  await syncDeadlineNotifySetting();
  syncDeadlines();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (['deadlineEvents', 'dismissedDeadlines', 'isDeadlineEnabled', 'isEnabled', 'displayLanguage'].some(key => key in changes)) syncDeadlines();
  else if ('deadlineFetchedAt' in changes) queueDeadlineTask(updateDeadlineBadge); // 取得のたびに件数を数え直す
});

// バッジと予約はブラウザの再起動で消えることがあるので、起動時と Service Worker が起きるたびに出し直す
chrome.runtime.onStartup.addListener(syncDeadlines);
syncDeadlineNotifySetting().then(syncDeadlines);
