// Moodle の言語ファイル（PHP）を実行せずに文字列として解析し、{ component: { id: value } } を返す
const fs = require('fs');
const path = require('path');

// PHP の文字列リテラル（'...' / "..."）を連結式ごと読み取る
function readPhpString(src, i) {
  let value = '';
  for (;;) {
    while (/\s/.test(src[i])) i++;
    const q = src[i];
    if (q !== "'" && q !== '"') break;
    i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\' && i + 1 < src.length) {
        const nx = src[i + 1];
        if (q === "'") {
          if (nx === "'" || nx === '\\') { value += nx; i += 2; continue; }
          value += '\\'; i++; continue;
        }
        const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', $: '$' };
        if (nx in map) { value += map[nx]; i += 2; continue; }
        value += '\\'; i++; continue;
      }
      value += src[i++];
    }
    i++; // 閉じクォート
    while (/\s/.test(src[i])) i++;
    if (src[i] === '.') { i++; continue; } // 連結
    break;
  }
  return { value, end: i };
}

function parseFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = {};
  const re = /\$string\[\s*(['"])([^'"]+)\1\s*\]\s*=\s*/g;
  let m;
  while ((m = re.exec(src))) {
    const { value, end } = readPhpString(src, re.lastIndex);
    out[m[2]] = value;
    re.lastIndex = end;
  }
  return out;
}

// dir 直下の *.php（言語パック）を読む
function loadPack(dir) {
  const pack = {};
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.php')) pack[path.basename(f, '.php')] = parseFile(path.join(dir, f));
  return pack;
}

// Moodle ソースツリーから lang/en/*.php をすべて読む
function loadEnglish(root) {
  const pack = {};
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.php') && p.includes(`${path.sep}lang${path.sep}en${path.sep}`)) pack[path.basename(e.name, '.php')] = parseFile(p);
    }
  };
  walk(root);
  return pack;
}

module.exports = { parseFile, loadPack, loadEnglish };

if (require.main === module) {
  const base = __dirname;
  const en = loadEnglish(path.join(base, 'moodle-src'));
  const ja = loadPack(path.join(base, 'packs', 'ja'));
  const count = p => Object.values(p).reduce((s, c) => s + Object.keys(c).length, 0);
  console.log('en components', Object.keys(en).length, 'strings', count(en));
  console.log('ja components', Object.keys(ja).length, 'strings', count(ja));
  console.log('sample', en.moodle?.dashboard, '/', ja.moodle?.mycourses, '/', en.block_timeline?.pluginname, '/', ja.block_timeline?.pluginname);
}
