// 画面に見える UI 文字列を「識別子 → 日本語」で一覧にする（訳文は出さない。翻訳作業用）
const fs = require('fs');
const path = require('path');
const { loadPack, loadEnglish } = require('./parse-lang');
const norm = s => (s || '').replace(/\s+/g, ' ').trim();
const JA = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
const crawl = JSON.parse(fs.readFileSync(path.join(__dirname, 'crawl.json'), 'utf8'));
const ja = loadPack(path.join(__dirname, 'packs/ja'));
const en = loadEnglish(path.join(__dirname, 'moodle-src'));

// 見えるテキスト・placeholder・title だけ（aria-label のみのもの、非表示のものは除く）
const seen = new Map();
for (const key of Object.keys(crawl).filter(k => k.startsWith('ja '))) {
  const enPage = crawl[`en ${key.slice(3)}`] || {};
  for (const [p, v] of Object.entries(crawl[key])) {
    const visible = v.attr ? (v.attr === 'placeholder' || v.attr === 'title') : v.vis;
    if (!visible) continue;
    const t = norm(v.t);
    if (!JA.test(t) || t.length > 120) continue;
    const segs = t.includes(' · ') ? [t, ...t.split(' · ')] : [t];
    for (const s of segs) {
      if (!seen.has(s)) seen.set(s, { hints: new Set(), pages: new Set() });
      seen.get(s).pages.add(key.slice(3).split('?')[0]);
      const e = enPage[p] && norm(enPage[p].t);
      if (s === t && e && !JA.test(e)) seen.get(s).hints.add(e);
    }
  }
}
// ja の値 → 識別子
const exactIdx = new Map(), phList = [];
for (const [c, strs] of Object.entries(ja)) for (const [i, raw] of Object.entries(strs)) {
  const v = norm(raw);
  if (!v) continue;
  if (/\{\$a/.test(v)) phList.push({ id: `${c}:${i}`, v, re: new RegExp('^' + v.split(/(\{\$a(?:->\w+)?\})/).map(x => /^\{\$a(?:->\w+)?\}$/.test(x) ? '(.+?)' : x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$') });
  else { if (!exactIdx.has(v)) exactIdx.set(v, []); exactIdx.get(v).push(`${c}:${i}`); }
}
const enOf = id => { const [c, ...r] = id.split(':'); return en[c]?.[r.join(':')]; };
const rank = id => id.startsWith('moodle:') ? 0 : /^(block|core|calendar|grades|message|my|completion|course|badges|repository)/.test(id) ? 1 : /^mod_|^(assign|quiz|forum):/.test(id) ? 2 : 3;
const out = { exact: [], patterns: [], none: [] };
for (const [t, info] of seen) {
  const cands = exactIdx.get(t);
  if (cands) {
    // 画面の英語版と一致する識別子を優先（英語の中身は表示しない）
    const confirmed = cands.find(id => enOf(id) && info.hints.has(norm(enOf(id))));
    const id = confirmed || cands.filter(enOf).sort((a, b) => rank(a) - rank(b))[0] || cands[0];
    out.exact.push({ id, ja: t, confirmed: !!confirmed, pages: [...info.pages].join(',') });
    continue;
  }
  const p = phList.filter(x => x.re.test(t) && (x.v.replace(/\{\$a(?:->\w+)?\}/g, '').match(new RegExp(JA.source, 'g')) || []).length >= 2).sort((a, b) => rank(a.id) - rank(b.id) || b.v.length - a.v.length)[0];
  if (p) { if (!out.patterns.some(x => x.id === p.id)) out.patterns.push({ id: p.id, ja: p.v, example: t }); continue; }
  out.none.push({ ja: t, pages: [...info.pages].join(',') });
}
fs.writeFileSync(path.join(__dirname, 'ids.json'), JSON.stringify(out, null, 1));
console.log('exact', out.exact.length, 'patterns', out.patterns.length, 'none', out.none.length);
