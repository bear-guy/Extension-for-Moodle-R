document.addEventListener('DOMContentLoaded', () => {
  // 自動検知してクラスを付与
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  
  let browserLang = 'ja';
  if (urlLang && ['ja', 'en', 'zh', 'ko', 'es'].includes(urlLang)) {
    browserLang = urlLang;
  } else {
    if (navigator.language.startsWith('en')) browserLang = 'en';
    else if (navigator.language.startsWith('zh')) browserLang = 'zh';
    else if (navigator.language.startsWith('ko')) browserLang = 'ko';
    else if (navigator.language.startsWith('es')) browserLang = 'es';
  }
  
  document.body.classList.add(`lang-${browserLang}`);

  // JA / EN / ZH / KO / ES のリンククリックイベント
  const jaBtn = document.getElementById('langBtnJa');
  const enBtn = document.getElementById('langBtnEn');
  const zhBtn = document.getElementById('langBtnZh');
  const koBtn = document.getElementById('langBtnKo');
  const esBtn = document.getElementById('langBtnEs');

  if (jaBtn && enBtn && zhBtn && koBtn && esBtn) {
    // 現在の言語に応じて見た目を少し変える
    const updateBtnStyles = (lang) => {
      [jaBtn, enBtn, zhBtn, koBtn, esBtn].forEach(btn => {
        btn.style.fontWeight = 'normal';
        btn.style.color = '#888';
      });
      if (lang === 'ja') {
        jaBtn.style.fontWeight = 'bold';
        jaBtn.style.color = '#333';
      } else if (lang === 'zh') {
        zhBtn.style.fontWeight = 'bold';
        zhBtn.style.color = '#333';
      } else if (lang === 'ko') {
        koBtn.style.fontWeight = 'bold';
        koBtn.style.color = '#333';
      } else if (lang === 'es') {
        esBtn.style.fontWeight = 'bold';
        esBtn.style.color = '#333';
      } else {
        enBtn.style.fontWeight = 'bold';
        enBtn.style.color = '#333';
      }
    };

    updateBtnStyles(browserLang);

    jaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-en', 'lang-zh', 'lang-ko', 'lang-es');
      document.body.classList.add('lang-ja');
      updateBtnStyles('ja');
    });

    enBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-ja', 'lang-zh', 'lang-ko', 'lang-es');
      document.body.classList.add('lang-en');
      updateBtnStyles('en');
    });

    zhBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-ja', 'lang-en', 'lang-ko', 'lang-es');
      document.body.classList.add('lang-zh');
      updateBtnStyles('zh');
    });

    koBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-ja', 'lang-en', 'lang-zh', 'lang-es');
      document.body.classList.add('lang-ko');
      updateBtnStyles('ko');
    });

    esBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-ja', 'lang-en', 'lang-zh', 'lang-ko');
      document.body.classList.add('lang-es');
      updateBtnStyles('es');
    });
  }
});
