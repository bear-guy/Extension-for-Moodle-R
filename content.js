// ==========================================
// メッセージ受信（シラバス自動取得用）
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCourseCodes") {
    const courseCodes = [];
    const subjects = document.querySelectorAll('.timetable-table table .subject a');
    subjects.forEach(link => {
      const match = (link.title || link.innerText).match(/\d{5,}/);
      if (match && !courseCodes.includes(match[0])) courseCodes.push(match[0]);
    });
    sendResponse({ courseCodes });
  } else if (request.action === "autoFetchCompleted") {
    if (confirm("登録されたすべての授業のシラバス情報の自動取得が完了しました。\nページを再読み込みして表示を更新します。")) window.location.reload();
  }
});

// OSのダークモード設定を取得
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// ==========================================
// 初期化・設定読み込み
// ==========================================
chrome.storage.local.get({ 
  isEnabled: true, isDarkMode: prefersDark, isSkipHomeEnabled: true, 
  isStaffMode: false, isSyllabusEnabled: true, isHighlightCurrentClassEnabled: true 
}, (data) => {
  // ホームスキップ（リダイレクト）
  if (data.isSkipHomeEnabled && window.location.pathname.match(/^\/(index\.php)?$/)) {
    window.location.replace('https://lms.ritsumei.ac.jp/my/');
    return;
  }
  if (data.isSkipHomeEnabled) document.body.classList.add('moodle-ext-skip-home');

  // 拡張機能のメイン処理開始
  if (data.isEnabled) {
    document.body.classList.add('moodle-ext-enabled');
    initExtension(data.isStaffMode, data.isSyllabusEnabled, data.isHighlightCurrentClassEnabled);
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
const initExtension = (isStaffMode, isSyllabusEnabled, isHighlightCurrentClassEnabled) => {
  
  // --- 共通ユーティリティ ---

  // 動的スタイルの注入
  if (!document.getElementById('moodle-ext-dynamic-style')) {
    const style = document.createElement('style');
    style.id = 'moodle-ext-dynamic-style';
    style.textContent = `
      body.dark-mode img[src*="/monologo"] { filter: invert(1) brightness(1.5) !important; }
      body.dark-mode .btn-secondary, body.dark-mode .custom-syllabus-link { background-color: #2c2c2c !important; color: #e0e0e0 !important; border-color: #555 !important; }
      body.dark-mode .btn-secondary:hover, body.dark-mode .custom-syllabus-link:hover { background-color: #3a3a3a !important; color: #ffffff !important; }
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
      table.querySelectorAll('tr').forEach(row => {
        for (let i = 6; i < row.cells.length; i++) row.cells[i].style.display = 'none'; // 土日を隠す
      });

      table.querySelectorAll('.subject a:not([data-processed="true"])').forEach(link => {
        link.dataset.processed = "true";
        link.title = link.innerText.trim();
        if (link.innerText.length > 6) {
          const newText = link.innerText.substring(6, 22);
          link.innerText = link.innerText.length > 22 ? newText + '…' : newText;
        }

        const roomDiv = link.parentElement.querySelector('.room');
        if (roomDiv) {
          const roomText = roomDiv.innerText.trim().replace(/^[月火水木金土日]\d+:/, '');
          roomDiv.innerText = roomText;
          const match = link.title.match(/\d{5,}/);
          if (match) chrome.storage.local.get(`syllabus_${match[0]}`, (res) => {
            if (res[`syllabus_${match[0]}`]?.teacher && res[`syllabus_${match[0]}`].teacher !== "不明") {
              roomDiv.innerText = `${roomText} ${res[`syllabus_${match[0]}`].teacher}`;
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
  };

  // 重複するデフォルトリンクを非表示
  const hideDuplicateLinks = () => {
    const duplicateKeywords = isStaffMode ? ['休補講・教室変更', '教職員ポータル', '教務支援', '教員ポータル', 'Respon', '打刻', 'manaba+R'] : ['Student Portal', 'STUDENT PORTAL', 'Campus Web'];
    const duplicateUrls = isStaffMode ? ['course/cancel.html', 'kyu-hoko', 'sharepoint.com/sites/portal', 'academic-affairs', 'faculty-portal', 'ritsumei.respon.jp', 'ritsumei-cws', 'ct.ritsumei.ac.jp/ct/'] : ['sp.ritsumei.ac.jp/studentportal', 'www.ritsumei.ac.jp/rsp', 'cw.ritsumei.ac.jp/campusweb'];

    document.querySelectorAll('a:not(.custom-drawer-link)').forEach(a => {
      if (a.closest('.custom-nav-link') || a.classList.contains('custom-drawer-link')) return;
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
    const now = new Date(), day = now.getDay(), currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (day < 1 || day > 6) return;

    const currentPeriod = [
      { p: 1, s: 540, e: 635 }, { p: 2, s: 645, e: 740 }, { p: 3, s: 790, e: 885 },
      { p: 4, s: 895, e: 990 }, { p: 5, s: 1000, e: 1095 }, { p: 6, s: 1105, e: 1200 }
    ].find(t => currentMinutes >= t.s && currentMinutes <= t.e)?.p || 0;

    if (currentPeriod === 0) return;
    const cell = document.querySelector('.timetable-table table')?.rows[currentPeriod]?.cells[day];
    if (cell && !cell.classList.contains('empty')) cell.classList.add('current-class-highlight');
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
      headerContainer.insertAdjacentHTML('afterbegin', `<a href="${url}" target="_blank" class="btn btn-secondary custom-syllabus-link" style="flex-shrink:0; white-space:nowrap;">シラバス</a>`);
      
      if (isSyllabusEnabled && courseCode && !isCourseSearch) {
        chrome.storage.local.get(`syllabus_${courseCode}`, (res) => {
          if (res[`syllabus_${courseCode}`]?.url) document.querySelector('.custom-syllabus-link').href = res[`syllabus_${courseCode}`].url;
        });
      }
    }

    // シラバス情報の表示
    if (isSyllabusEnabled && courseCode && headerContainer && !document.querySelector('.syllabus-info-container')) {
      headerContainer.insertAdjacentHTML('beforebegin', `<div class="syllabus-info-container d-none"></div>`); // 重複防止用
      chrome.storage.local.get(`syllabus_${courseCode}`, (res) => {
        const data = res[`syllabus_${courseCode}`];
        const container = document.querySelector('.syllabus-info-container');
        if (data && container) {
          const isDark = document.body.classList.contains('dark-mode');
          container.className = 'syllabus-info-container ms-auto me-3 p-2 border rounded d-flex align-items-center';
          Object.assign(container.style, {
            backgroundColor: isDark ? '#2c2c2c' : '#ffffff', color: isDark ? '#e0e0e0' : '#212529',
            borderColor: isDark ? '#444' : '', boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
            fontSize: '0.9rem', fontWeight: 'bold', gap: '15px', flexShrink: '0', whiteSpace: 'nowrap'
          });

          let roomHTML = `<strong>教室:</strong> ${data.room || '不明'}`;
          if (data.campus && data.room && data.room !== '不明') {
            const mapUrls = { '衣笠': '227619', 'BKC': '227632', 'OIC': '229844' };
            const matchedCampus = Object.keys(mapUrls).find(k => data.campus.includes(k));
            if (matchedCampus) roomHTML = `<strong>教室:</strong> <a href="https://www.ritsumei.ac.jp/file.jsp?id=${mapUrls[matchedCampus]}&f=.pdf" target="_blank" style="color: inherit; text-decoration: underline;" title="${data.campus}キャンパスマップ（PDF）">${data.room}</a>`;
          }
          container.innerHTML = `<div><strong>開講曜日・時限:</strong> ${data.schedule}</div><div><strong>担当教員:</strong> ${data.teacher}</div><div><strong>単位:</strong> ${data.credits}</div><div>${roomHTML}</div>`;
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

      const syllabusData = {
        url: cleanUrl.toString(),
        schedule: document.querySelector('td[data-label="開講曜日・時限"]')?.textContent.trim() || "不明",
        teacher: document.querySelector('td[data-label="全担当教員"]')?.textContent.trim() || "不明",
        credits: document.querySelector('td[data-label="単位数"]')?.textContent.trim() || "不明",
        room: getLabelNext('授業施設') || "不明",
        campus: getLabelNext('キャンパス') || "不明"
      };

      chrome.storage.local.get(`syllabus_${courseCode}`, (res) => {
        if (res[`syllabus_${courseCode}`]?.url) {
          document.body.dataset.syllabusExtracted = "true";
          clearInterval(window.syllabusExtractInterval);
          if (new URLSearchParams(window.location.search).get('autofetch') === 'true') chrome.runtime.sendMessage({ action: "syllabusFetchComplete" });
          return;
        }

        chrome.storage.local.set({ [`syllabus_${courseCode}`]: syllabusData }, () => {
          document.body.dataset.syllabusExtracted = "true";
          clearInterval(window.syllabusExtractInterval);
          showToast(`✅ シラバス情報${res[`syllabus_${courseCode}`] ? '（リンク）を更新' : 'を取得・保存'}しました！`);
          if (new URLSearchParams(window.location.search).get('autofetch') === 'true') chrome.runtime.sendMessage({ action: "syllabusFetchComplete" });
        });
      });
    }, 1000);
  };


  // --- 監視と実行 ---

  const runFeatures = () => {
    if (window.location.hostname.includes('lms.ritsumei.ac.jp')) {
      fixMoodleLayout();
      addCustomLinks();
      hideDuplicateLinks();
      addSyllabusLinkAndInfo();
      if (isHighlightCurrentClassEnabled) highlightCurrentClass();
      applySkipHomeLinks();
    } else if (window.location.hostname.includes('syllabus.ritsumei.ac.jp')) {
      autoFillSyllabusSearch();
      extractAndSaveSyllabusData();
    }
  };

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      document.body.dataset.syllabusExtracted = "false";
      clearInterval(window.syllabusExtractInterval);
      window.syllabusExtractInterval = null;
    }
    runFeatures();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  // 初回実行と定期実行
  runFeatures();
  if (isHighlightCurrentClassEnabled && window.location.hostname.includes('lms.ritsumei.ac.jp')) {
    setInterval(highlightCurrentClass, 60000); // 1分ごとにハイライト更新
  }
};

