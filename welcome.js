document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- 言語の切り替え ---
  // 最初の言語は page-i18n.js（先に読み込む）が body の lang-xx クラスで決める
  const LANGS = ['ja', 'en', 'zh', 'ko', 'es'];
  const HTML_LANG = { ja: 'ja', en: 'en', zh: 'zh-CN', ko: 'ko', es: 'es' };
  const TITLES = {
    ja: 'Extension for Moodle+R へようこそ！',
    en: 'Welcome to Extension for Moodle+R!',
    zh: '欢迎使用 Extension for Moodle+R！',
    ko: 'Extension for Moodle+R에 오신 것을 환영합니다!',
    es: '¡Bienvenido a Extension for Moodle+R!'
  };
  const applyLang = (lang) => {
    LANGS.forEach(l => document.body.classList.toggle(`lang-${l}`, l === lang));
    // 文節での改行（word-break: auto-phrase）やフォントの選択が言語に合うよう、html の lang も変える
    document.documentElement.lang = HTML_LANG[lang];
    document.title = TITLES[lang];
    document.querySelectorAll('.lang-select [data-lang]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));
  };
  document.querySelectorAll('.lang-select [data-lang]').forEach(btn => btn.addEventListener('click', () => {
    applyLang(btn.dataset.lang);
    try { localStorage.setItem('preferredLanguage', btn.dataset.lang); } catch (e) { /* 保存できなくても表示は切り替わる */ }
  }));
  applyLang(LANGS.find(l => document.body.classList.contains(`lang-${l}`)) || 'ja');

  // --- ヒーローの画像: カーソルの位置に合わせてゆっくり傾ける ---
  // 動きの滑らかさは CSS の transition に任せ、ここでは -1〜1 の位置を渡すだけ
  const visual = document.querySelector('.hero-visual');
  if (visual && !reducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let frame = 0;
    visual.addEventListener('pointermove', (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = visual.getBoundingClientRect();
        const clamp = v => Math.max(-1, Math.min(1, v)).toFixed(3);
        visual.style.setProperty('--mx', clamp(((e.clientX - r.left) / r.width - 0.5) * 2));
        visual.style.setProperty('--my', clamp(((e.clientY - r.top) / r.height - 0.5) * 2));
      });
    });
    visual.addEventListener('pointerenter', () => visual.classList.add('is-hovered'));
    visual.addEventListener('pointerleave', () => {
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      visual.classList.remove('is-hovered');
      visual.style.setProperty('--mx', 0);
      visual.style.setProperty('--my', 0);
    });
  }

  // --- Before / After スライダー ---
  const compare = document.getElementById('compare');
  if (compare) {
    const range = compare.querySelector('input');
    let hintFrame = 0;
    const setPos = (v) => { compare.style.setProperty('--pos', `${v}%`); };
    const stopHint = () => {
      if (hintFrame) cancelAnimationFrame(hintFrame);
      hintFrame = 0;
      compare.classList.remove('hinting');
    };
    // 一度でも触ったらヒントは出さない
    const markTouched = () => { compare.classList.add('touched'); stopHint(); };
    range.addEventListener('pointerdown', markTouched);
    range.addEventListener('keydown', markTouched);
    range.addEventListener('input', () => { markTouched(); setPos(range.value); });

    // 初めて画面に入ったときに一度だけ、つまみを左右に動かして「動かせる」ことを見せる
    // （スクロールで出入りするたびに動くとうるさいので、1 回の読み込みにつき 1 回まで）
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const playHint = () => {
      if (reducedMotion || compare.classList.contains('touched')) return;
      const keys = [50, 30, 70, 50];
      const seg = 750; // 1 区間の長さ（ms）
      const start = performance.now() + 400;
      compare.classList.add('hinting');
      const step = (now) => {
        const t = Math.max(0, now - start);
        const i = Math.min(Math.floor(t / seg), keys.length - 2);
        const p = Math.min(1, (t - i * seg) / seg);
        const v = keys[i] + (keys[i + 1] - keys[i]) * ease(p);
        setPos(v);
        range.value = v;
        if (t < seg * (keys.length - 1)) hintFrame = requestAnimationFrame(step);
        else { setPos(50); range.value = 50; stopHint(); }
      };
      hintFrame = requestAnimationFrame(step);
    };
    const hintObserver = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      hintObserver.disconnect();
      playHint();
    }, { threshold: 0.6 });
    hintObserver.observe(compare);
  }

  // --- 画像の切り替えデモ（色・ダークモード・言語） ---
  document.querySelectorAll('.switcher').forEach(group => {
    const target = document.getElementById(group.dataset.target);
    group.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      target.src = btn.dataset.src;
    }));
  });

  // --- 画像の拡大表示 ---
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    document.querySelectorAll('.zoomable').forEach(img => img.addEventListener('click', () => {
      lightbox.querySelector('img').src = img.src;
      lightbox.showModal();
    }));
    lightbox.addEventListener('click', () => lightbox.close());
  }

  // --- PayPay ID などのコピーボタン ---
  document.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
      } catch (e) {
        // クリップボードが使えない環境では、ID を選択状態にして手動でコピーしてもらう
        const target = btn.parentElement.querySelector('strong');
        if (target) window.getSelection().selectAllChildren(target);
      }
    });
  });

  // --- スクロールでフェードイン ---
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
});
