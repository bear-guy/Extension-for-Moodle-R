// Moodle+R の UI 文字列を ja / en で収集する（閲覧のみ）。結果は crawl.json（個人のコース名などを含むのでコミットしない）
// ?lang=en / ?lang=ja はテスト用ブラウザのセッションの表示言語だけを切り替え、最後に ja に戻す
const fs = require('fs');
const path = require('path');
const { launchMoodle } = require(`${process.env.HOME}/Library/Caches/extension-for-moodle-r-test/launch.js`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PAGES = [
  '/my/', '/my/courses.php', '/course/view.php?id=31407', '/course/view.php?id=40084', '/mod/forum/view.php?id=58077',
  '/calendar/view.php?view=month', '/calendar/view.php?view=upcoming', '/calendar/view.php?view=day',
  '/grade/report/overview/index.php', '/user/profile.php', '/user/preferences.php', '/message/index.php',
  '/message/output/popup/notifications.php', '/course/search.php?search=%E7%B5%B1%E8%A8%88', '/badges/mybadges.php', '/user/files.php', '/course/index.php'
];
const collect = page => page.evaluate(() => {
  const isExt = el => el.closest('.custom-settings-drawer, .custom-settings-toggler-wrapper, .custom-nav-link, .custom-drawer-link, .custom-status-link, .syllabus-info-container, .custom-syllabus-link, .custom-message-teacher-wrapper, .custom-mark-all-read-btn, .date-row, .extension-status-banner');
  const path = el => { const p = []; while (el && el !== document.body) { const idx = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0; p.unshift(`${el.tagName}${el.id && !/\d{3,}/.test(el.id) ? '#' + el.id : ''}:${idx}`); el = el.parentElement; } return p.join('/'); };
  const out = {};
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode, el = n.parentElement, t = n.textContent.replace(/\s+/g, ' ').trim();
    if (!t || !el || el.closest('script,style,noscript,template') || isExt(el)) continue;
    const i = Array.from(el.childNodes).indexOf(n);
    out[`${path(el)}#t${i}`] = { t, vis: el.checkVisibility() };
  }
  for (const el of document.querySelectorAll('[placeholder],[title],[aria-label]')) {
    if (isExt(el)) continue;
    for (const a of ['placeholder', 'title', 'aria-label']) { const v = el.getAttribute(a)?.replace(/\s+/g, ' ').trim(); if (v) out[`${path(el)}@${a}`] = { t: v, attr: a }; }
  }
  return out;
});
(async () => {
  const { ctx, page } = await launchMoodle({ headless: true, contextOptions: { locale: 'ja-JP' }, settings: { drawerIntroDismissed: true } });
  const result = {};
  for (const lang of ['ja', 'en']) {
    for (const p of PAGES) {
      await page.goto(`https://lms.ritsumei.ac.jp${p}${p.includes('?') ? '&' : '?'}lang=${lang}`).catch(() => {});
      await sleep(3500);
      // ドロップダウン（ユーザーメニュー・学習機能・リンク集など）を開いて中身も描画させる
      for (const sel of ['#user-menu-toggle', '.primary-navigation .dropdown-toggle']) {
        for (const el of await page.$$(sel)) { if (await el.isVisible()) { await el.click({ timeout: 1500 }).catch(() => {}); await sleep(300); } }
      }
      await page.keyboard.press('Escape').catch(() => {});
      result[`${lang} ${p}`] = await collect(page);
      console.log(lang, p, Object.keys(result[`${lang} ${p}`]).length, new URL(page.url()).pathname);
    }
  }
  await page.goto('https://lms.ritsumei.ac.jp/my/?lang=ja'); await sleep(1500);
  console.log('restored lang:', await page.evaluate(() => document.documentElement.lang));
  fs.writeFileSync(path.join(__dirname, 'crawl.json'), JSON.stringify(result));
  await ctx.close();
})().catch(e => { console.error('ERROR', e); process.exit(1); });
