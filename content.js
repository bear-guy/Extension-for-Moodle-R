// ==========================================
// メッセージ受信（シラバス自動取得用）
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCourseCodes") {
    const subjects = Array.from(document.querySelectorAll('.timetable-table table .subject a'));
    const courseCodes = [...new Set(subjects.map(link => (link.title || link.innerText).match(/\d{5,}/)?.[0]).filter(Boolean))];
    sendResponse({ courseCodes });
  } else if (request.action === "autoFetchCompleted") {
    if (confirm(window.MoodleExtI18n.getMessage('content_syllabus_auto_fetch_done', window.currentMoodleLang || 'ja'))) window.location.reload();
  }
});

// OSのダークモード設定を取得
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// ==========================================
// 初期化・設定読み込み
// ==========================================
chrome.storage.local.get({
  isEnabled: true, isDarkMode: prefersDark, isSkipHomeEnabled: true,
  isStaffMode: false, isSyllabusEnabled: true, isHighlightCurrentClassEnabled: true,
  isLuckyEnabled: false,
  luckyUniversity: 'kyodai',
  lastSettingsSentDate: "",
  displayLanguage: ""
}, (data) => {
  let currentLang = data.displayLanguage;
  if (!currentLang || currentLang === 'auto') {
    currentLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
  }
  window.currentMoodleLang = currentLang;

  // 1日1回の設定状況送信
  const today = new Date().toDateString();
  if (data.lastSettingsSentDate !== today && window.location.hostname.includes('lms.ritsumei.ac.jp')) {
    chrome.runtime.sendMessage({
      action: "sendDailySettings",
      deviceInfo: {
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        user_agent: navigator.userAgent,
        language: navigator.language
      }
    });
    chrome.storage.local.set({ lastSettingsSentDate: today });
  }

  // ホームスキップ（リダイレクト）
  if (data.isSkipHomeEnabled && window.location.pathname.match(/^\/(index\.php)?$/)) {
    window.location.replace('https://lms.ritsumei.ac.jp/my/');
    return;
  }
  if (data.isSkipHomeEnabled) document.body.classList.add('moodle-ext-skip-home');

  // 拡張機能のメイン処理開始
  if (data.isEnabled) {
    document.body.classList.add('moodle-ext-enabled');
    initExtension(data.isStaffMode, data.isSyllabusEnabled, data.isHighlightCurrentClassEnabled, data.isLuckyEnabled, data.luckyUniversity, currentLang);
  }

  // ダークモードの適用・強制解除（シラバス）
  if (window.location.hostname.includes('syllabus.ritsumei.ac.jp')) {
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
    const lightStyle = document.createElement('style');
    lightStyle.textContent = `:root, html, body { color-scheme: light !important; background-color: #ffffff !important; color: #333333 !important; }`;
    document.head.appendChild(lightStyle);
  } else if (data.isDarkMode) {
    document.body.classList.add('dark-mode');
  }
});

// ==========================================
// 拡張機能のメイン処理
// ==========================================
const initExtension = (isStaffMode, isSyllabusEnabled, isHighlightCurrentClassEnabled, initialIsLuckyEnabled, initialLuckyUniversity, currentLang) => {
  let isLuckyEnabled = initialIsLuckyEnabled;
  let luckyUniversity = initialLuckyUniversity;
  let originalLogoSrc = null;

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      let changed = false;
      if (changes.isLuckyEnabled !== undefined) {
        isLuckyEnabled = changes.isLuckyEnabled.newValue;
        changed = true;
      }
      if (changes.luckyUniversity !== undefined) {
        luckyUniversity = changes.luckyUniversity.newValue;
        changed = true;
      }
      if (changed) applyLuckyLogo();
    }
  });

  // --- 共通ユーティリティ ---

  // 動的スタイルの注入
  if (!document.getElementById('moodle-ext-dynamic-style')) {
    const style = document.createElement('style');
    style.id = 'moodle-ext-dynamic-style';
    style.textContent = `
      body.dark-mode img[src*="/monologo"] { filter: invert(1) brightness(1.5) !important; }
      body.dark-mode .btn-secondary, body.dark-mode .custom-syllabus-link, body.dark-mode .custom-message-teacher-link { background-color: #2c2c2c !important; color: #e0e0e0 !important; border-color: #555 !important; }
      body.dark-mode .btn-secondary:hover, body.dark-mode .custom-syllabus-link:hover, body.dark-mode .custom-message-teacher-link:hover { background-color: #3a3a3a !important; color: #ffffff !important; }
      body.dark-mode .activity-header, body.dark-mode .activity-information, body.dark-mode .completion-info { background: transparent !important; box-shadow: none !important; border: none !important; position: relative; z-index: 0; }
      body.dark-mode .completion-info *, body.dark-mode .activity-information * { color: #e0e0e0 !important; position: relative; z-index: 1; }
      body.dark-mode .completion-info .badge { background-color: #444 !important; }
      body.dark-mode .completion-info .badge.alert-success { background-color: #1e4620 !important; }
    `;
    document.head.appendChild(style);
  }

  // トースト通知を表示
  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      whiteSpace: 'pre-wrap', position: 'fixed', bottom: '20px', right: '20px', zIndex: '9999', padding: '12px 20px',
      backgroundColor: document.body.classList.contains('dark-mode') ? '#444' : '#323232', color: '#fff',
      borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '14px',
      transition: 'opacity 0.3s, transform 0.3s', opacity: '0', transform: 'translateY(10px)'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // 初回アクセス時のシラバス自動取得プロンプト
  let isPrompting = false;
  const checkFirstTimePrompt = () => {
    if (isPrompting) return;
    // 時間割ブロックが存在するページ（ダッシュボード等）でのみ実行する
    if (!document.querySelector('.block_rutime_table')) return;

    isPrompting = true; // 重複実行を即座にロック
    chrome.storage.local.get({ hasPromptedAutoFetch: false }, (res) => {
      if (res.hasPromptedAutoFetch) return;

      let retryCount = 0;
      const waitForTimetable = setInterval(() => {
        const subjects = document.querySelectorAll('.timetable-table table .subject a');
        if (subjects.length > 0) {
          clearInterval(waitForTimetable);
          chrome.storage.local.set({ hasPromptedAutoFetch: true });

          // 授業コードを一意に抽出
          const courseCodes = [...new Set(Array.from(subjects).map(link => (link.title || link.innerText).match(/\d{5,}/)?.[0]).filter(Boolean))];
          if (courseCodes.length > 0) {
            setTimeout(() => {
              if (confirm(window.MoodleExtI18n.getMessage('content_prompt_install_thanks', currentLang, { count: courseCodes.length }))) {
                chrome.storage.local.set({ isSyllabusEnabled: true }, () => {
                  chrome.runtime.sendMessage({ action: "startAutoFetchSyllabus", courseCodes: courseCodes });
                  alert(window.MoodleExtI18n.getMessage('content_prompt_fetch_started', currentLang, { count: courseCodes.length }));
                });
              } else {
                chrome.storage.local.set({ isSyllabusEnabled: false });
              }
            }, 800); // 描画完了を少し待つ
          }
        } else if (retryCount >= 10) {
          clearInterval(waitForTimetable);
          isPrompting = false; // 時間割が読み込めなかった場合は再度チェック可能にする
        }
        retryCount++;
      }, 1000); // 1秒ごとにチェック（最大10秒）
    });
  };

  // カスタムリンクの定義
  const currentLinks = isStaffMode ? [
    { name: '教職員ポータル', url: 'https://ritsumei365.sharepoint.com/sites/portal/' },
    { name: '教務支援', url: 'https://www.ritsumei.ac.jp/staff-all/academic-affairs/' },
    { name: '教員ポータル', url: 'https://www.ritsumei.ac.jp/faculty-portal/' },
    { name: 'Respon', url: 'https://ritsumei.respon.jp/t/' },
    { name: '休補講・教室変更', url: 'https://www.ritsumei.ac.jp/pathways-future/course/cancel.html/' },
    { name: '打刻', url: 'https://ritsumei-cws.company.works-hi.com/self-workflow/cws/srwtimerec' },
    { name: 'manaba+R', url: 'https://ct.ritsumei.ac.jp/ct/' }
  ] : [
    { name: 'Student Portal', url: 'https://sp.ritsumei.ac.jp/studentportal' },
    { name: 'Respon', url: 'https://ritsumei.respon.jp/' },
    { name: 'Campus Web', url: 'https://cw.ritsumei.ac.jp/campusweb/login.html' }
  ];


  // I'm feeling lucky ロゴ変更
  const applyLuckyLogo = () => {
    // クラスが 'logo' の画像、または元のロゴの画像URLが含まれるものをすべて取得
    const logos = document.querySelectorAll('img.logo, img[src*="Rnormal.png"], img[src*="logocompact"]');

    logos.forEach(logo => {
      if (!logo.dataset.originalSrc && !logo.src.includes('chrome-extension://')) {
        logo.dataset.originalSrc = logo.src;
      }
      try {
        if (isLuckyEnabled) {
          const uni = luckyUniversity || 'kyodai';
          const newLogoUrl = chrome.runtime.getURL(`lucky/${uni}.icon960.png`);
          if (logo.src !== newLogoUrl) {
            logo.src = newLogoUrl;
          }
        } else if (logo.dataset.originalSrc && logo.src !== logo.dataset.originalSrc) {
          logo.src = logo.dataset.originalSrc;
        }
      } catch (e) {
        // 拡張機能が更新されコンテキストが無効になった場合はエラーを無視
      }
    });
  };

  // --- Moodle UI 調整機能 ---

  // レイアウトの最適化（時間割の加工など）
  const fixMoodleLayout = () => {
    document.body.classList.remove('limitedwidth');
    const timetable = document.querySelector('.block_rutime_table');
    const timeline = document.querySelector('.block_timeline');
    const mainRegion = document.querySelector('#block-region-content');

    // 横並びコンテナ
    if (timetable && timeline && mainRegion && !document.querySelector('.custom-layout-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'custom-layout-wrapper';
      mainRegion.insertBefore(wrapper, mainRegion.firstChild);
      wrapper.append(timeline, timetable);
    }

    // 時間割の表示調整
    const table = document.querySelector('.timetable-table table');
    if (table) {
      const periodTimes = {
        1: "9:00<br>|<br>10:35",
        2: "10:45<br>|<br>12:20",
        3: "13:10<br>|<br>14:45",
        4: "14:55<br>|<br>16:30",
        5: "16:40<br>|<br>18:15",
        6: "18:25<br>|<br>20:00",
        7: "20:10<br>|<br>21:45"
      };

      // 曜日ヘッダーにその週の日付を追加
      const headerRow = table.querySelector('tr:not(.date-row)');
      if (headerRow && !headerRow.dataset.dateAdded && !table.querySelector('.date-row')) {
        headerRow.dataset.dateAdded = "true";
        const now = new Date();
        const dayOfWeek = now.getDay();
        // 日曜日(0)なら6日前が月曜、それ以外は(曜日-1)日前が月曜日
        const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

        // 日付用の新しい行を作成
        const dateRow = document.createElement('tr');
        dateRow.className = 'date-row';
        dateRow.appendChild(document.createElement('th')); // 左上の空白セル

        for (let i = 1; i <= 5; i++) { // 月(1)〜金(5)列に対して処理
          const dateTh = document.createElement('th');
          dateTh.style.textAlign = 'center';

          if (headerRow.cells[i]) {
            const cellDate = new Date(monday);
            cellDate.setDate(monday.getDate() + (i - 1));
            dateTh.innerHTML = `<span style="opacity: 0.8;">${cellDate.getMonth() + 1}/${cellDate.getDate()}</span>`;
          }
          dateRow.appendChild(dateTh);
        }

        // 土日の列（非表示列）も数を合わせる
        for (let i = 6; i < headerRow.cells.length; i++) {
          const hiddenTh = document.createElement('th');
          hiddenTh.style.display = 'none';
          dateRow.appendChild(hiddenTh);
        }
        if (headerRow.parentNode) headerRow.parentNode.insertBefore(dateRow, headerRow);
      }

      table.querySelectorAll('tr').forEach((row) => {
        if (row.classList.contains('date-row')) return; // 追加した日付の行は処理をスキップ
        for (let i = 6; i < row.cells.length; i++) row.cells[i].style.display = 'none'; // 土日を隠す

        // 時限セルに時間を追加
        if (row.cells.length > 0) {
          const timeCell = row.cells[0];
          if (!timeCell.dataset.timeAdded) {
            const p = timeCell.innerText.trim().match(/^\d/)?.[0];
            if (p && periodTimes[p]) {
              timeCell.dataset.timeAdded = "true";
              timeCell.innerHTML = `<div style="font-weight:bold; font-size:1.1em;">${p}</div><div style="font-size:0.75em; line-height:1.2; margin-top:4px; opacity:0.8; letter-spacing:-0.5px;">${periodTimes[p]}</div>`;
            }
          }
        }
      });

      table.querySelectorAll('.subject a:not([data-processed="true"])').forEach(link => {
        link.dataset.processed = "true";
        link.title = link.innerText.trim();

        // 授業コードを含めた最初の6文字を削除し、§以降の文字も削除
        let subjectText = link.innerText.trim();
        if (subjectText.length > 6) {
          subjectText = subjectText.substring(6).trim();
        }
        // 「月4:」や「火2・3:」などの曜日・時限表記を削除
        subjectText = subjectText.replace(/^[月火水木金土日][\d・]+[：:]\s*/, '');
        link.innerText = subjectText.replace(/\s*§.*/, '');

        const roomDiv = link.parentElement.querySelector('.room');
        if (roomDiv) {
          // 教室名からも同様に曜日・時限表記を削除
          const roomText = roomDiv.innerText.trim().replace(/^[月火水木金土日][\d・]+[：:]\s*/, '');
          roomDiv.innerText = roomText;
          const match = link.title.match(/\d{5,}/);
          if (match) chrome.storage.local.get(`syllabus_${match[0]}`, (res) => {
            if (res[`syllabus_${match[0]}`]?.teacher && res[`syllabus_${match[0]}`].teacher !== "不明") {
              const firstTeacher = res[`syllabus_${match[0]}`].teacher.split(/[、,・\n]+/)[0].trim();
              roomDiv.innerText = `${roomText} ${firstTeacher}`;
            }
          });
        }
      });
    }

    // 「その他」を凡例の上に移動
    const legend = document.querySelector('.timetable-legend');
    const others = document.querySelector('.timetable-others');
    if (legend && others && others.nextElementSibling !== legend) {
      others.insertAdjacentElement('afterend', legend);
      legend.style.marginTop = '20px';
    }
  };

  // カスタムリンクの追加
  const addCustomLinks = () => {
    const navbar = document.querySelector('ul.navbar-nav.more-nav');
    if (navbar && !document.querySelector('.custom-nav-link')) {
      const navItems = Array.from(navbar.querySelectorAll('li.nav-item'));
      const targetItem = navItems.find(li => li.textContent.includes('Intelliboard')) || navItems[navItems.length - 1];
      if (targetItem) {
        currentLinks.slice().reverse().forEach(link => {
          targetItem.insertAdjacentHTML('afterend', `<li class="nav-item custom-nav-link" role="none"><a role="menuitem" class="nav-link" href="${link.url}" target="_blank" tabindex="-1">${link.name}</a></li>`);
        });
      }
    }

    const drawerList = document.querySelector('.drawercontent .list-group');
    if (drawerList && !document.querySelector('.custom-drawer-link')) {
      const listItems = Array.from(drawerList.children);
      let targetLink = listItems.find(el => el.textContent.includes('Intelliboard') && el.tagName === 'A');
      if (targetLink?.nextElementSibling?.tagName === 'DIV') targetLink = targetLink.nextElementSibling;
      else if (!targetLink) targetLink = listItems[listItems.length - 1];

      if (targetLink) {
        currentLinks.slice().reverse().forEach(link => {
          targetLink.insertAdjacentHTML('afterend', `<a class="list-group-item list-group-item-action custom-drawer-link" href="${link.url}" target="_blank">${link.name}</a>`);
        });
      }
    }

    // 「学び支援サイト」の下に「本日の授業・定期試験について」を追加する
    const targetHref = 'https://www.ritsumei.ac.jp/pathways-future/';
    const statusUrl = 'https://www.ritsumei.ac.jp/academic-affairs/status/';
    const statusName = '本日の授業・定期試験について';

    // 1. ヘッダーの「リンク集」ドロップダウン内
    const dropdownItems = document.querySelectorAll(`a.dropdown-item[href="${targetHref}"]`);
    dropdownItems.forEach(item => {
      const nextEl = item.nextElementSibling;
      if (!nextEl || !nextEl.classList.contains('custom-status-link')) {
        item.insertAdjacentHTML('afterend', `<a class="dropdown-item custom-status-link" role="menuitem" href="${statusUrl}" target="_blank" data-disableactive="true" tabindex="-1" data-hidden-checked="true">${statusName}</a>`);
      }
    });

    // 2. 左側ドロワーのアコーディオン内
    const drawerItems = document.querySelectorAll(`a.list-group-item[href="${targetHref}"]`);
    drawerItems.forEach(item => {
      const nextEl = item.nextElementSibling;
      if (!nextEl || !nextEl.classList.contains('custom-status-link')) {
        item.insertAdjacentHTML('afterend', `<a class="ps-5 bg-light list-group-item list-group-item-action custom-status-link" href="${statusUrl}" target="_blank" data-hidden-checked="true" data-aria-hidden-tab-index="" tabindex="-1">${statusName}</a>`);
      }
    });
  };

  // 重複するデフォルトリンクを非表示
  const hideDuplicateLinks = () => {
    const duplicateKeywords = isStaffMode ? ['休補講・教室変更', '教職員ポータル', '教務支援', '教員ポータル', 'Respon', '打刻', 'manaba+R'] : ['Student Portal', 'STUDENT PORTAL', 'Campus Web'];
    const duplicateUrls = isStaffMode ? ['course/cancel.html', 'kyu-hoko', 'sharepoint.com/sites/portal', 'academic-affairs', 'faculty-portal', 'ritsumei.respon.jp', 'ritsumei-cws', 'ct.ritsumei.ac.jp/ct/'] : ['sp.ritsumei.ac.jp/studentportal', 'www.ritsumei.ac.jp/rsp', 'cw.ritsumei.ac.jp/campusweb'];

    document.querySelectorAll('a:not(.custom-drawer-link):not([data-hidden-checked="true"])').forEach(a => {
      if (a.closest('.custom-nav-link') || a.classList.contains('custom-drawer-link')) return;
      a.dataset.hiddenChecked = "true"; // 二度とチェックしないようにマーク
      const isMatch = duplicateUrls.some(url => (a.href || '').includes(url)) || duplicateKeywords.some(kw => a.textContent.trim().includes(kw));
      if (isMatch) {
        const li = a.closest('li');
        if (li && !li.classList.contains('dropdown') && !li.classList.contains('nav-item')) li.style.display = 'none';
        else {
          a.style.display = 'none';
          if (a.nextSibling?.nodeName === 'BR') a.nextSibling.style.display = 'none';
        }
      }
    });
  };

  // ホームリンクのスキップ処理
  const applySkipHomeLinks = () => {
    if (!document.body.classList.contains('moodle-ext-skip-home')) return;
    document.querySelectorAll('a[href="https://lms.ritsumei.ac.jp/"]').forEach(link => {
      if (link.classList.contains('navbar-brand') || link.dataset.region === 'site-home-link') link.href = 'https://lms.ritsumei.ac.jp/my/';
      else if (link.textContent.trim() === 'Home') (link.closest('li[data-key="home"]') || link).style.display = 'none';
    });
  };

  // 現在の授業をハイライト
  const highlightCurrentClass = () => {
    document.querySelectorAll('.current-class-highlight').forEach(el => el.classList.remove('current-class-highlight'));
    document.querySelectorAll('.today-column-highlight').forEach(el => el.classList.remove('today-column-highlight'));

    const now = new Date(), day = now.getDay(), currentMinutes = now.getHours() * 60 + now.getMinutes();

    const table = document.querySelector('.timetable-table table');
    if (!table) return;

    // 今日の曜日の列全体をハイライト
    if (day >= 1 && day <= 5) {
      Array.from(table.rows).forEach(row => {
        if (row.cells[day]) row.cells[day].classList.add('today-column-highlight');
      });
    }

    if (day < 1 || day > 6) return;

    const currentPeriod = [
      { p: 1, s: 540, e: 635 }, { p: 2, s: 645, e: 740 }, { p: 3, s: 790, e: 885 },
      { p: 4, s: 895, e: 990 }, { p: 5, s: 1000, e: 1095 }, { p: 6, s: 1105, e: 1200 },
      { p: 7, s: 1210, e: 1305 }
    ].find(t => currentMinutes >= t.s && currentMinutes <= t.e)?.p || 0;

    if (currentPeriod === 0) return;

    // 行の追加でズレないように、最初のセル（時限の数字）を見て対象の行を特定する
    const targetRow = Array.from(table.rows).find(row => row.cells.length > 0 && row.cells[0].innerText.trim().startsWith(currentPeriod.toString()));
    const cell = targetRow ? targetRow.cells[day] : null;

    if (cell && !cell.classList.contains('empty')) cell.classList.add('current-class-highlight');
  };

  // フォーラムの一括既読ボタンを追加
  const addMarkAllReadButton = () => {
    if (!window.location.pathname.includes('/mod/forum/view.php')) return;
    if (document.querySelector('.custom-mark-all-read-btn')) return; // 重複防止

    // テーブルヘッダーの「このフォーラムの投稿すべてを既読にします。」のリンクを取得
    const markAllReadLink = document.querySelector('a[href*="markposts.php"][href*="mark=read"]');
    if (!markAllReadLink) return; // 未読がない場合は追加しない

    const actionContainer = document.querySelector('.tertiary-navigation .ms-sm-auto.navitem');
    if (actionContainer) {
      const btn = document.createElement('a');
      btn.href = markAllReadLink.href;
      btn.className = 'btn btn-secondary custom-mark-all-read-btn';
      btn.style.marginRight = '8px';
      btn.innerHTML = `<i class="icon fa fa-check fa-fw" aria-hidden="true"></i>${window.MoodleExtI18n.getMessage('content_mark_all_read', currentLang)}`;
      actionContainer.insertBefore(btn, actionContainer.firstChild);
    }
  };

  // コースページに「先生へDMする」ボタンを追加
  const addMessageTeacherButton = () => {
    if (!window.location.pathname.includes('/course/view.php')) return;

    const headerContainer = document.querySelector('.header-actions-container');
    const teacherLinks = document.querySelectorAll('a.messageteacher_link');

    if (headerContainer && !document.querySelector('.custom-message-teacher-wrapper') && teacherLinks.length > 0) {
      if (teacherLinks.length === 1) {
        const link = teacherLinks[0];
        const dmButton = document.createElement('a');
        dmButton.href = link.href;
        dmButton.target = '_blank';
        dmButton.rel = 'noopener noreferrer';
        dmButton.className = 'btn btn-secondary custom-message-teacher-link custom-message-teacher-wrapper';
        dmButton.style.flexShrink = '0';
        dmButton.style.whiteSpace = 'nowrap';
        dmButton.textContent = 'DM';
        dmButton.title = window.MoodleExtI18n.getMessage('content_message_teacher', currentLang, { teacher: link.textContent.trim() || (currentLang === 'ja' ? '先生' : 'Teacher') });
        headerContainer.appendChild(dmButton);
      } else {
        const isDark = document.body.classList.contains('dark-mode');
        const bgColor = isDark ? '#3a3a3a' : '#ffffff';
        const borderColor = isDark ? '#555' : '#ccc';
        const textColor = isDark ? '#e0e0e0' : '#212529';
        const hoverColor = isDark ? '#444' : '#f0f0f0';

        const wrapper = document.createElement('details');
        wrapper.className = 'custom-message-teacher-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.flexShrink = '0';

        const summary = document.createElement('summary');
        summary.className = 'btn btn-secondary custom-message-teacher-link';
        summary.style.whiteSpace = 'nowrap';
        summary.style.outline = 'none';
        summary.style.cursor = 'pointer';
        summary.style.listStyle = 'none';
        summary.innerHTML = 'DM <span style="font-size: 0.8em; margin-left: 4px;">▼</span>';

        const dropdown = document.createElement('div');
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.right = '0';
        dropdown.style.backgroundColor = bgColor;
        dropdown.style.border = `1px solid ${borderColor}`;
        dropdown.style.borderRadius = '4px';
        dropdown.style.padding = '4px 0';
        dropdown.style.marginTop = '4px';
        dropdown.style.zIndex = '1000';
        dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        dropdown.style.minWidth = '160px';

        Array.from(teacherLinks).forEach(link => {
          const teacherName = link.textContent.trim() || (currentLang === 'ja' ? '先生' : 'Teacher');
          const item = document.createElement('a');
          item.href = link.href;
          item.target = '_blank';
          item.rel = 'noopener noreferrer';
          item.textContent = currentLang === 'ja' ? `${teacherName}へDM` : `DM to ${teacherName}`;
          item.style.display = 'block';
          item.style.padding = '8px 16px';
          item.style.color = textColor;
          item.style.textDecoration = 'none';
          item.style.whiteSpace = 'nowrap';
          item.style.fontSize = '0.9rem';
          item.style.textAlign = 'left';
          item.onmouseover = () => item.style.backgroundColor = hoverColor;
          item.onmouseout = () => item.style.backgroundColor = 'transparent';
          // Close details when a link is clicked
          item.onclick = () => wrapper.removeAttribute('open');
          dropdown.appendChild(item);
        });

        wrapper.appendChild(summary);
        wrapper.appendChild(dropdown);

        // Hide summary marker for webkit browsers
        const style = document.createElement('style');
        style.textContent = '.custom-message-teacher-wrapper > summary::-webkit-details-marker { display: none; }';
        wrapper.appendChild(style);

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
          if (!wrapper.contains(e.target)) wrapper.removeAttribute('open');
        });

        headerContainer.appendChild(wrapper);
      }
    }
  };

  // --- シラバス連携機能 ---

  // コースページ等にシラバスリンクと情報を表示
  const addSyllabusLinkAndInfo = () => {
    if (!window.location.pathname.match(/\/(course\/view|enrol\/index|course\/search)\.php/)) return;
    const isCourseSearch = window.location.pathname.match(/\/(enrol\/index|course\/search)\.php/);

    // ヘッダー幅の調整
    const pageHeader = document.querySelector('#page-header');
    if (pageHeader) {
      pageHeader.classList.remove('header-maxwidth');
      pageHeader.style.maxWidth = '100%';
      const alignContainer = pageHeader.querySelector('.w-100 > .d-flex.align-items-center') || pageHeader;
      if (alignContainer && !alignContainer.dataset.resizeSynced) {
        alignContainer.dataset.resizeSynced = 'true';
        const syncWidth = () => {
          const target = document.querySelector('.course-content') || document.querySelector('#region-main');
          if (target && pageHeader) {
            const tr = target.getBoundingClientRect(), hr = pageHeader.getBoundingClientRect();
            if (tr.left - hr.left >= 0) alignContainer.style.paddingLeft = `${tr.left - hr.left}px`;
            if (hr.right - tr.right >= 0) alignContainer.style.paddingRight = `${hr.right - tr.right}px`;
          }
        };
        syncWidth(); window.addEventListener('resize', syncWidth);
      }
    }

    const titleContainer = document.querySelector('.page-context-header');
    if (titleContainer?.parentElement) titleContainer.parentElement.style.minWidth = '0';

    // 授業コード取得
    const courseCode = document.querySelector('.page-header-headings h1, .page-context-header h1, h1')?.textContent.trim().match(/\d{5,}/)?.[0] || '';

    // シラバスボタンの追加
    const headerContainer = document.querySelector('.header-actions-container');
    if (headerContainer && !document.querySelector('.custom-syllabus-link')) {
      const url = `https://syllabus.ritsumei.ac.jp/syllabus/s/${courseCode ? `?coursecode=${courseCode}${isCourseSearch ? '&nosave=true' : ''}` : ''}`;
      headerContainer.insertAdjacentHTML('afterbegin', `<a href="${url}" target="_blank" class="btn btn-secondary custom-syllabus-link" style="flex-shrink:0; white-space:nowrap;">${window.MoodleExtI18n.getMessage('content_btn_syllabus', currentLang)}</a>`);

      if (isSyllabusEnabled && courseCode && !isCourseSearch) {
        chrome.storage.local.get(`syllabus_${courseCode}`, (res) => {
          const syllabusBtn = headerContainer.querySelector('.custom-syllabus-link');
          if (res[`syllabus_${courseCode}`]?.url && syllabusBtn) syllabusBtn.href = res[`syllabus_${courseCode}`].url;
        });
      }
    }

    // シラバス情報の表示
    if (isSyllabusEnabled && courseCode && headerContainer && !document.querySelector('.syllabus-info-container')) {
      headerContainer.insertAdjacentHTML('afterbegin', `<div class="syllabus-info-container d-none"></div>`); // 重複防止用
      chrome.storage.local.get(`syllabus_${courseCode}`, (res) => {
        const data = res[`syllabus_${courseCode}`];
        const container = document.querySelector('.syllabus-info-container');
        if (data && data.schedule && container) {
          const isDark = document.body.classList.contains('dark-mode');
          container.className = 'syllabus-info-container p-2 border rounded d-flex align-items-center';
          Object.assign(container.style, {
            backgroundColor: isDark ? '#2c2c2c' : '#ffffff', color: isDark ? '#e0e0e0' : '#212529',
            borderColor: isDark ? '#444' : '', boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
            fontSize: '0.9rem', fontWeight: 'bold', gap: '15px', flexShrink: '0', whiteSpace: 'nowrap'
          });

          let roomHTML = `<strong>${window.MoodleExtI18n.getMessage('content_info_room', currentLang)}</strong> ${data.room || window.MoodleExtI18n.getMessage('content_info_unknown', currentLang)}`;
          if (data.campus && data.room && data.room !== '不明') {
            const mapUrls = { '衣笠': '227619', 'BKC': '227632', 'OIC': '229844' };
            const matchedCampus = Object.keys(mapUrls).find(k => data.campus.includes(k));
            if (matchedCampus) roomHTML = `<strong>${window.MoodleExtI18n.getMessage('content_info_room', currentLang)}</strong> <a href="https://www.ritsumei.ac.jp/file.jsp?id=${mapUrls[matchedCampus]}&f=.pdf" target="_blank" style="color: inherit; text-decoration: underline;" title="${data.campus}キャンパスマップ（PDF）">${data.room}</a>`;
          }
          let teacherHTML = `<strong>${window.MoodleExtI18n.getMessage('content_info_teacher', currentLang)}</strong> ${data.teacher}`;
          if (data.teacher) {
            const teachers = data.teacher.split(/[、,・\n]+/).map(t => t.trim()).filter(Boolean);
            if (teachers.length > 1) {
              const listText = currentLang === 'ja' ? '担当教員一覧' : 'Instructors List';
              const bgColor = isDark ? '#3a3a3a' : '#ffffff';
              const borderColor = isDark ? '#555' : '#ccc';
              const textColor = isDark ? '#e0e0e0' : '#212529';
              const linkColor = isDark ? '#66b2ff' : '#0056b3';
              teacherHTML = `<strong>${window.MoodleExtI18n.getMessage('content_info_teacher', currentLang)}</strong> 
                <details style="display: inline-block; position: relative; margin-left: 2px;">
                  <summary style="cursor: pointer; color: ${linkColor}; font-weight: normal; text-decoration: underline; outline: none;">${listText}</summary>
                  <div style="position: absolute; top: 100%; left: 0; background-color: ${bgColor}; color: ${textColor}; border: 1px solid ${borderColor}; padding: 8px 12px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 4px; white-space: nowrap; margin-top: 8px; font-weight: normal; line-height: 1.5;">
                    ${teachers.join('<br>')}
                  </div>
                </details>`;
            }
          }
          // 表示用に曜日を現在の言語へ変換（ストレージのデータは変更しない）
          const translatedSchedule = window.MoodleExtI18n.translateSchedule(data.schedule, currentLang);
          container.innerHTML = `<div><strong>${window.MoodleExtI18n.getMessage('content_info_schedule', currentLang)}</strong> ${translatedSchedule}</div><div>${teacherHTML}</div><div><strong>${window.MoodleExtI18n.getMessage('content_info_credits', currentLang)}</strong> ${data.credits}</div><div>${roomHTML}</div>`;
        }
      });
    }
  };

  // シラバス検索の自動入力（シラバスサイト用）
  const autoFillSyllabusSearch = () => {
    const courseCode = new URLSearchParams(window.location.search).get('coursecode');
    const searchInput = document.querySelector('input[placeholder*="授業コード"], input[placeholder*="科目名"]');
    if (!courseCode || !searchInput || searchInput.dataset.autoFilled) return;

    searchInput.dataset.autoFilled = "true";
    searchInput.focus();
    if (!document.execCommand('insertText', false, courseCode)) {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(searchInput, courseCode);
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    searchInput.dispatchEvent(new Event('blur', { bubbles: true }));

    let hasClicked = false;
    const checkResults = (obs) => {
      if (hasClicked) return;
      const links = Array.from(document.querySelectorAll('.siteforceContentArea a[href], body a[href]'))
        .filter(a => a.offsetParent !== null && !a.href.includes('javascript:') && !a.href.includes('#'));

      const targetLinks = links.filter(a => (a.closest('tr, article, li') || a).textContent.includes(courseCode));
      if (targetLinks.length > 0 && new Set(targetLinks.map(a => a.href.split('?')[0])).size === 1) {
        hasClicked = true;
        const link = targetLinks[0];
        link.target = '_self';

        // 直接リンク（詳細ページURL）を検索結果から事前に取得して保存
        const directUrl = link.href.split('?')[0];
        chrome.storage.local.get(`syllabus_${courseCode}`, (res) => {
          const data = res[`syllabus_${courseCode}`] || {};
          if (data.url !== directUrl) {
            data.url = directUrl;
            chrome.storage.local.set({ [`syllabus_${courseCode}`]: data });
          }
        });

        const params = new URLSearchParams(window.location.search);
        if (params.get('autofetch') === 'true') link.href += (link.href.includes('?') ? '&' : '?') + 'autofetch=true';
        if (params.get('nosave') === 'true') link.href += (link.href.includes('?') ? '&' : '?') + 'nosave=true';

        link.click();
        if (obs) obs.disconnect();
      }
    };

    const obs = new MutationObserver(() => checkResults(obs));
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 10000);

    const triggerSearch = () => {
      if (hasClicked) return;
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      const btn = document.querySelector('button[title="検索"], button[aria-label="検索"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('検索'));
      if (btn) btn.click();
      else searchInput.closest('form')?.submit();
    };
    [0, 50, 150, 300].forEach(delay => setTimeout(triggerSearch, delay));
  };

  // シラバス情報の取得と保存（シラバスサイト用）
  const extractAndSaveSyllabusData = () => {
    if (!isSyllabusEnabled || new URLSearchParams(window.location.search).get('nosave') === 'true' || document.body.dataset.syllabusExtracted === "true" || window.syllabusExtractInterval) return;

    window.syllabusExtractInterval = setInterval(() => {
      const courseNameEl = document.querySelector('td[data-label="授業科目名"]');
      const labels = Array.from(document.querySelectorAll('span.slds-form-element__label'));
      if (!courseNameEl || !labels.some(el => el.textContent.includes('授業施設'))) return;

      const courseCode = courseNameEl.textContent.match(/\d{5,}/)?.[0];
      if (!courseCode) return;

      const getLabelNext = (text) => labels.find(el => el.textContent.includes(text))?.nextElementSibling?.textContent.trim();
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('autofetch'); cleanUrl.searchParams.delete('nosave');
      const currentUrlStr = cleanUrl.toString();

      const newSyllabusData = {
        schedule: document.querySelector('td[data-label="開講曜日・時限"]')?.textContent.trim() || "不明",
        teacher: document.querySelector('td[data-label="全担当教員"]')?.textContent.trim() || "不明",
        credits: document.querySelector('td[data-label="単位数"]')?.textContent.trim() || "不明",
        room: getLabelNext('授業施設') || "不明",
        campus: getLabelNext('キャンパス') || "不明"
      };

      chrome.storage.local.get(`syllabus_${courseCode}`, (res) => {
        const existingData = res[`syllabus_${courseCode}`] || {};

        // すでに有効な直接リンクURLと詳細データが揃っている場合はスキップ
        const hasValidUrl = existingData.url && !existingData.url.includes('coursecode=');
        if (hasValidUrl && existingData.schedule && existingData.schedule !== "不明") {
          document.body.dataset.syllabusExtracted = "true";
          clearInterval(window.syllabusExtractInterval);
          if (new URLSearchParams(window.location.search).get('autofetch') === 'true') chrome.runtime.sendMessage({ action: "syllabusFetchComplete" });
          return;
        }

        let finalUrl = existingData.url;
        if (!finalUrl || finalUrl.includes('coursecode=')) {
          if (currentUrlStr.includes('/syllabuss/') || !currentUrlStr.includes('coursecode=')) {
            finalUrl = currentUrlStr;
          }
        }
        newSyllabusData.url = finalUrl || currentUrlStr;

        chrome.storage.local.set({ [`syllabus_${courseCode}`]: { ...existingData, ...newSyllabusData } }, () => {
          document.body.dataset.syllabusExtracted = "true";
          clearInterval(window.syllabusExtractInterval);
          if (new URLSearchParams(window.location.search).get('autofetch') !== 'true') showToast(window.MoodleExtI18n.getMessage('content_toast_syllabus_saved', currentLang));
          else chrome.runtime.sendMessage({ action: "syllabusFetchComplete" });
        });
      });
    }, 1000);
  };


  // --- 拡張機能の設定ドロワ ---
  const addSettingsDrawer = () => {
    if (!window.location.hostname.includes('lms.ritsumei.ac.jp')) return;
    if (document.querySelector('.custom-settings-drawer-btn')) return; // 重複防止


    // Moodleの要素を改変せず、完全に独立したラッパーを作成する
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-settings-toggler-wrapper d-print-none';

    const btn = document.createElement('button');
    btn.className = 'btn icon-no-margin custom-settings-drawer-btn';
    btn.title = window.MoodleExtI18n.getMessage('content_settings_drawer_title', currentLang) || '拡張機能の設定';
    btn.setAttribute('data-toggle', 'tooltip');
    btn.setAttribute('data-placement', 'right');
    // Moodleの純正アイコンと全く同じ構造（width/height 24px）にする
    btn.innerHTML = `
      <span class="sr-only">${btn.title}</span>
      <span class="dir-rtl-hide">
        <i class="icon fa-fw" style="-webkit-mask-image: url('${chrome.runtime.getURL('icons/icon48.png')}'); -webkit-mask-size: 16px; -webkit-mask-position: center; -webkit-mask-repeat: no-repeat; background-color: currentColor; width: 24px; height: 24px; margin: 0; display: inline-block; vertical-align: middle;"></i>
      </span>
    `;

    // 独立したラッパーに追加し、bodyにマウント
    wrapper.appendChild(btn);
    document.body.appendChild(wrapper);

    // 紹介吹き出しの表示判定と作成
    chrome.storage.local.get(['drawerIntroDismissed'], (result) => {
      if (!result.drawerIntroDismissed) {
        const bubble = document.createElement('div');
        bubble.className = 'custom-drawer-intro-bubble';

        const textSpan = document.createElement('span');
        textSpan.className = 'custom-drawer-intro-text';
        textSpan.textContent = window.MoodleExtI18n.getMessage('content_settings_drawer_intro', currentLang);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'custom-drawer-intro-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close');

        closeBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          chrome.storage.local.set({ drawerIntroDismissed: true }, () => {
            bubble.remove();
          });
        };

        bubble.appendChild(textSpan);
        bubble.appendChild(closeBtn);
        wrapper.appendChild(bubble);
      }
    });


    // ドロワコンテナの作成
    const drawer = document.createElement('div');
    drawer.className = 'custom-settings-drawer';
    // 初期状態は画面外
    drawer.style.right = '-350px';

    // iframeの作成
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('popup.html');
    iframe.style.width = '100%';
    iframe.style.flexGrow = '1';
    iframe.style.border = 'none';
    drawer.appendChild(iframe);

    // iframeからの閉じるメッセージを受け取る
    window.addEventListener('message', (event) => {
      if (event.data && event.data.action === 'closeSettingsDrawer') {
        drawer.style.right = '-350px';
        const page = document.getElementById('page');
        if (page) page.classList.remove('show-custom-drawer-right');
        // ドロワーが閉じたらツールチップを再表示できるようクラスを除去
        document.body.classList.remove('custom-drawer-is-open');
      }
    });

    document.body.appendChild(drawer);

    // トグルボタンのクリックイベント
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation(); // Moodle側のクリックイベント（ブロックドロワの開閉など）が誤動作するのを防ぐ

      const isClosed = drawer.style.right === '-350px' || drawer.style.right === '';
      const page = document.getElementById('page');
      if (isClosed) {
        drawer.style.right = '0';
        if (page) page.classList.add('show-custom-drawer-right');
        // ドロワーが開いている間はBootstrapのツールチップDOMをCSSで非表示にする
        document.body.classList.add('custom-drawer-is-open');
        // ドロワーが開いたことをiframeに通知
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ action: 'drawerOpened' }, '*');
        }
      } else {
        drawer.style.right = '-350px';
        if (page) page.classList.remove('show-custom-drawer-right');
        // ドロワーが閉じたらツールチップを再表示できるようクラスを除去
        document.body.classList.remove('custom-drawer-is-open');
      }
    };
  };

  // --- 監視と実行 ---

  // --- 休講情報・警戒レベルの通知バナー表示 ---
  const checkAcademicStatus = () => {
    // ダッシュボード（/my/ や /）でのみ実行
    if (!window.location.pathname.match(/^\/(my\/)?(index\.php)?$/)) return;
    if (document.querySelector('.extension-status-banner')) return; // 既に表示されている場合

    // 一度だけフェッチするためのフラグ
    if (window.hasCheckedAcademicStatus) return;
    window.hasCheckedAcademicStatus = true;

    fetch('https://www.ritsumei.ac.jp/academic-affairs/status/')
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const diary = doc.querySelector('.diary');
        if (!diary) return; // 通常時

        // 「休講」テキストがあるかチェック
        let isCanceled = false;
        const markLists = doc.querySelectorAll('.markList span.jp');
        for (const span of markLists) {
          if (span.textContent.includes('休講')) {
            isCanceled = true;
            break;
          }
        }

        const status = isCanceled ? 'canceled' : 'caution';
        const bannerText = window.MoodleExtI18n.getMessage(`status_${status}`, currentLang);

        const banner = document.createElement('a');
        banner.href = 'https://www.ritsumei.ac.jp/academic-affairs/status/';
        banner.target = '_blank';
        banner.className = `extension-status-banner ${status}`;
        banner.textContent = bannerText;

        const header = document.querySelector('#page-header');
        if (header && header.parentNode) {
          header.parentNode.insertBefore(banner, header);
        } else {
          document.body.insertBefore(banner, document.body.firstChild);
        }
      })
      .catch(err => console.error('Failed to fetch academic status:', err));
  };

  const runFeatures = () => {
    if (window.location.hostname.includes('lms.ritsumei.ac.jp')) {
      checkFirstTimePrompt();
      applyLuckyLogo();
      fixMoodleLayout();
      addCustomLinks();
      hideDuplicateLinks();
      addSyllabusLinkAndInfo();
      addMessageTeacherButton();
      addSettingsDrawer();
      checkAcademicStatus();
      if (isHighlightCurrentClassEnabled) highlightCurrentClass();
      applySkipHomeLinks();
      addMarkAllReadButton();
    } else if (window.location.hostname.includes('syllabus.ritsumei.ac.jp')) {
      autoFillSyllabusSearch();
      extractAndSaveSyllabusData();
    }
  };

  let lastUrl = location.href;
  let observerTimeout = null;
  const observer = new MutationObserver(() => {
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      document.body.dataset.syllabusExtracted = "false";
      clearInterval(window.syllabusExtractInterval);
      window.syllabusExtractInterval = null;
    }

    // 画面の連続更新による負荷（フリーズ）を防ぐための遅延処理（ディバウンス）
    if (observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      runFeatures();
    }, 300); // 300ミリ秒待ってから実行
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 初回実行と定期実行
  runFeatures();
  if (isHighlightCurrentClassEnabled && window.location.hostname.includes('lms.ritsumei.ac.jp')) {
    setInterval(highlightCurrentClass, 60000); // 1分ごとにハイライト更新
  }
};
