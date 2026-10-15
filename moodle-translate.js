// moodle-translate.js
// Moodle+R の UI（ナビゲーション・ブロック名・ボタン・日付など Moodle に元からある文言）を、拡張の表示言語に翻訳する。
// 翻訳データ（moodle-strings.js）は「日本語の原文のハッシュ値 → 独自の訳」だけを持ち、原文そのものは含まない。
// 辞書にある UI 文字列だけを置き換えるので、先生や大学が入力したコンテンツ（コース名・活動名・投稿本文など）は翻訳しない。

(() => {
  const LANG_INDEX = { en: 0, zh: 1, ko: 2, es: 3 };
  // 曜日名・月名・日付の並びは Intl で各言語の表記にする
  const LOCALES = ['en-GB', 'zh-CN', 'ko-KR', 'es-ES'];
  const JAPANESE = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
  const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'];

  // 先生や大学が入力したコンテンツの領域と、拡張自身の UI（i18n.js で翻訳済み）。ここにある文字列は翻訳しない
  const SKIP_SELECTOR = [
    'script', 'style', 'noscript', 'template', 'textarea', '[contenteditable="true"]',
    '.no-overflow', '.text_to_html', '.post-content-container', '[data-region="post-content-container"]',
    '.summarytext', '.activity-description', '.activity-altcontent', '.contentafterlink', '.description-inner',
    '.coursename', '.course-title', '.instancename', '.activityname', '.sectionname',
    '.courseindex-link', '.courseindex-section-title', '.event-name', '.breadcrumb', '.discussion-name',
    '.timetable-others a', '.messageteacher_link', '.usertext', '.fullname',
    // 時間割の授業名と教室は content.js が加工する（曜日時限の除去・教員名の追加）ので触らない
    '.timetable-table .subject a', '.timetable-table .room', '.moodle-ext-deadline-badge', '.moodle-ext-deadline-popover',
    '.custom-settings-drawer', '.custom-settings-toggler-wrapper', '.syllabus-info-container', '.extension-status-banner'
  ].join(',');

  // 経過時間の単位（[単数, 複数] を言語ごとに）と「〜前」の書き方
  const DURATION_UNITS = {
    '日': [['day', 'days'], ['天', '天'], ['일', '일'], ['día', 'días']],
    '時間': [['hour', 'hours'], ['小时', '小时'], ['시간', '시간'], ['hora', 'horas']],
    '分': [['min', 'mins'], ['分钟', '分钟'], ['분', '분'], ['minuto', 'minutos']],
    '秒': [['sec', 'secs'], ['秒', '秒'], ['초', '초'], ['segundo', 'segundos']]
  };
  const AGO = ['{d} ago', '{d}前', '{d} 전', 'hace {d}'];

  let data = null;
  let langIdx = -1;
  const done = new WeakMap(); // テキストノード → 翻訳後の文字列（再翻訳を防ぐ）

  // 文字列のハッシュ値（53 ビット、36 進数）。cyrb53（bryc 氏によるパブリックドメインのハッシュ関数）。
  // tools/moodle-strings/build-strings.js もこの関数を使う
  const hashText = (str) => {
    let h1 = 0xdeadbeef ^ str.length;
    let h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };

  const translateExact = (text) => data.exact[hashText(text)]?.[langIdx] ?? null;

  // パターン: 固定部分（ハッシュ値と長さ）の間に値が入る。先頭・末尾の固定部分は空のこともある
  const matchPattern = (text, segs) => {
    const [firstHash, firstLen] = segs[0];
    if (hashText(text.slice(0, firstLen)) !== firstHash) return null;
    const values = [];
    let pos = firstLen;
    for (let i = 1; i < segs.length; i++) {
      const [hash, len] = segs[i];
      let found = -1;
      if (i === segs.length - 1) {
        const start = text.length - len;
        if (start > pos && hashText(text.slice(start)) === hash) found = start;
      } else {
        for (let p = pos + 1; p + len <= text.length; p++) {
          if (hashText(text.slice(p, p + len)) === hash) { found = p; break; }
        }
      }
      if (found < 0) return null;
      values.push(text.slice(pos, found));
      pos = found + len;
    }
    return values;
  };

  const translatePattern = (text) => {
    for (const p of data.patterns) {
      const values = matchPattern(text, p.s);
      if (!values) continue;
      let out = p.t[langIdx];
      p.n.forEach((name, i) => {
        // 値（活動の種類や日付など）が UI 文字列なら、それも翻訳する
        const value = translateText(values[i]) ?? values[i].trim();
        out = out.split(name ? `{$a->${name}}` : '{$a}').join(value);
      });
      return out;
    }
    return null;
  };

  const WEEKDAYS = '日月火水木金土';
  // 日本語の日付（例: "2026年 10月 15日(木曜日)" "2026年 09月 27日(日) 18:45" "2026年 10月" "10月 15日"）
  const DATE_RE = /^(?:(\d{4})年\s*)?(\d{1,2})月(?:\s*(\d{1,2})日)?(?:\s*\(([日月火水木金土])(曜日)?\))?(?:\s*(\d{1,2}):(\d{2}))?$/;
  const translateDate = (text) => {
    const m = text.match(DATE_RE);
    if (!m) return null;
    const [, year, month, day, weekday, longWeekday, hour, minute] = m;
    if (!year && !day) {
      // 月だけ（例: "9月"）
      return new Intl.DateTimeFormat(LOCALES[langIdx], { month: 'long' }).format(new Date(2000, Number(month) - 1, 1));
    }
    const date = new Date(Number(year || new Date().getFullYear()), Number(month) - 1, Number(day || 1), Number(hour || 0), Number(minute || 0));
    // 曜日が書かれていて日付と合わない（年が省略されている等）場合は曜日を出さない
    const weekdayMatches = weekday && WEEKDAYS[date.getDay()] === weekday;
    const options = { month: 'long' };
    if (year) options.year = 'numeric';
    if (day) options.day = 'numeric';
    if (weekdayMatches) options.weekday = longWeekday ? 'long' : 'short';
    if (hour) Object.assign(options, { hour: '2-digit', minute: '2-digit', hour12: false });
    return new Intl.DateTimeFormat(LOCALES[langIdx], options).format(date);
  };

  // "3 時間 54 分" のような経過時間
  const translateDuration = (text) => {
    if (!/^(\d+\s*(日|時間|分|秒)\s*)+$/.test(text)) return null;
    return [...text.matchAll(/(\d+)\s*(日|時間|分|秒)/g)]
      .map(([, n, unit]) => `${n} ${DURATION_UNITS[unit][langIdx][Number(n) === 1 ? 0 : 1]}`)
      .join(' ');
  };

  const translateSpecial = (text) => {
    let m;
    // 番号付きの活動の種類（例: "13_課題"）
    if ((m = text.match(/^(\d+_)\s?(.+)$/))) {
      const name = translateExact(m[2]);
      return name ? `${m[1]}${name}` : null;
    }
    // 曜日・時限つきの教室（例: "水-:施設なし" "木5:AC130"）
    if ((m = text.match(/^([月火水木金土日])(\d+|-):(.*)$/))) {
      const day = translateExact(m[1]);
      return day ? `${day}${m[2]}:${translateText(m[3]) ?? m[3]}` : null;
    }
    // 「〜前」（例: "3 時間 54 分 前"）
    if ((m = text.match(/^(.+?)\s*前$/))) {
      const duration = translateDuration(m[1]);
      return duration ? AGO[langIdx].replace('{d}', duration) : null;
    }
    return translateDate(text) ?? translateDuration(text);
  };

  // " · " で区切られた文字列（例: "「13_課題」の提出期限 · <コース名>"）は部分ごとに翻訳する
  const translateSegments = (text) => {
    if (!text.includes(' · ')) return null;
    const segments = text.split(' · ');
    const translated = segments.map(s => translateText(s) ?? s);
    return translated.some((s, i) => s !== segments[i]) ? translated.join(' · ') : null;
  };

  // 1 つの文字列を翻訳する（訳が無ければ null）
  function translateText(text) {
    const key = text.replace(/\s+/g, ' ').trim();
    if (!key || !JAPANESE.test(key)) return null;
    return translateExact(key) ?? translatePattern(key) ?? translateSpecial(key) ?? translateSegments(key);
  }

  const translateNode = (node) => {
    if (done.get(node) === node.nodeValue) return;
    const translated = translateText(node.nodeValue);
    if (translated !== null) {
      // 前後の空白は残す
      const [, lead, , trail] = node.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
      node.nodeValue = `${lead}${translated}${trail}`;
    }
    done.set(node, node.nodeValue);
  };

  const translatePage = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !n.parentElement.closest(SKIP_SELECTOR)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateNode);

    document.body.querySelectorAll(`${TRANSLATABLE_ATTRS.map(a => `[${a}]`).join(',')}, input[type="submit"], input[type="button"]`).forEach(el => {
      if (el.closest(SKIP_SELECTOR)) return;
      [...TRANSLATABLE_ATTRS, ...(el.matches('input') ? ['value'] : [])].forEach(attr => {
        const value = el.getAttribute(attr);
        const translated = value && translateText(value);
        if (translated) el.setAttribute(attr, translated);
      });
    });
  };

  window.MoodleExtTranslate = {
    hashText,
    // lang: 拡張の表示言語（ja など対象外の言語では何もしない）
    start(lang) {
      langIdx = LANG_INDEX[lang] ?? -1;
      data = window.MoodleExtMoodleStrings;
      if (langIdx < 0 || !data) return;
      translatePage();
      // Moodle は DOM を動的に書き換えるので、変化があれば追従する
      let timer = null;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(translatePage, 200);
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    },
    translateText: (text) => (data ? translateText(text) : null)
  };
})();
