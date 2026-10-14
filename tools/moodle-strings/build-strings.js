// 拡張に同梱する翻訳データ（moodle-strings.js）を作る
// 使い方: node build-strings.js ../../moodle-strings.js
// 訳は translations.js（独自訳）だけを使い、Moodle 公式言語パックの訳文は使わない。
// 日本語の原文は手元の言語パック（fetch-sources.sh で取得。コミットしない）から識別子で引き、ハッシュ値にして出力する。
// そのため、生成物にも リポジトリにも Moodle の言語文字列そのものは入らない。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadPack } = require('./parse-lang');
const { ids, patterns, custom } = require('./translations');

const norm = s => (s || '').replace(/\s+/g, ' ').trim();

// 実行時と同じ計算にするため、moodle-translate.js の hashText をそのまま使う
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../moodle-translate.js'), 'utf8'), sandbox);
const { hashText } = sandbox.window.MoodleExtTranslate;

const ja = loadPack(path.join(__dirname, 'packs/ja'));
const jaOf = (id) => {
  const i = id.indexOf(':');
  return ja[id.slice(0, i)]?.[id.slice(i + 1)];
};

const warnings = [];
const exact = {};
const sources = []; // 生成物に原文が混入していないかの確認用
const addExact = (text, tr, label) => {
  const h = hashText(text);
  if (exact[h] && exact[h].join() !== tr.join()) warnings.push(`同じ原文に別の訳: ${label}`);
  exact[h] = tr;
};

for (const [id, tr] of Object.entries(ids)) {
  const text = norm(jaOf(id));
  if (!text) { warnings.push(`言語パックに無い識別子: ${id}`); continue; }
  sources.push(text);
  addExact(text, tr, id);
}
for (const [text, tr] of Object.entries(custom)) addExact(norm(text), tr, text);

const outPatterns = [];
for (const [id, value] of Object.entries(patterns)) {
  const { append = '', t } = Array.isArray(value) ? { t: value } : value;
  const raw = jaOf(id);
  if (!raw) { warnings.push(`言語パックに無い識別子: ${id}`); continue; }
  const template = norm(raw) + append;
  const parts = template.split(/(\{\$a(?:->\w+)?\})/);
  const names = parts.filter((_, i) => i % 2 === 1).map(p => p.match(/->(\w+)/)?.[1] || '');
  const fixed = parts.filter((_, i) => i % 2 === 0);
  if (!names.length) { warnings.push(`プレースホルダーの無いパターン: ${id}`); continue; }
  fixed.forEach(f => { if (f.trim().length > 1) sources.push(f.trim()); });
  outPatterns.push({ s: fixed.map(f => [hashText(f), f.length]), n: names, t });
}

const json = JSON.stringify({ exact, patterns: outPatterns });
// かなを含む原文が生成物に入っていないことを確認する（漢字だけの語は中国語訳と偶然一致しうるので対象外）
const leaked = sources.filter(s => /[\u3040-\u30ff]/.test(s) && json.includes(s));
if (leaked.length) { console.error('原文が生成物に含まれています:', leaked); process.exit(1); }

// 画面で見つかった UI 文字列のうち、訳が無いもの（list-ids.js の結果があれば）
const idsFile = path.join(__dirname, 'ids.json');
if (fs.existsSync(idsFile)) {
  const listed = JSON.parse(fs.readFileSync(idsFile, 'utf8'));
  const missing = [...listed.exact.map(e => e.id).filter(id => !ids[id]), ...listed.patterns.map(e => e.id).filter(id => !patterns[id])];
  if (missing.length) console.log(`訳の無い識別子（意図的に除外したものを含む）: ${missing.join(', ')}`);
}
warnings.forEach(w => console.log(`注意: ${w}`));

const header = `// moodle-strings.js
// 自動生成ファイル。手で編集しない（生成手順は CLAUDE.md の「Moodle 本体の翻訳」を参照）。
// 日本語の原文のハッシュ値 → 独自の訳 [en, zh, ko, es]。訳は tools/moodle-strings/translations.js。
// Moodle の言語文字列（原文・公式訳）は含まない。
`;
const outFile = process.argv[2];
if (outFile) {
  fs.writeFileSync(outFile, `${header}window.MoodleExtMoodleStrings = ${json};\n`);
  console.log('wrote', outFile, fs.statSync(outFile).size, 'bytes', 'exact', Object.keys(exact).length, 'patterns', outPatterns.length);
}
