document.addEventListener('DOMContentLoaded', () => {
  // 自動検知してクラスを付与
  let browserLang = 'en';
  if (navigator.language.startsWith('ja')) browserLang = 'ja';
  else if (navigator.language.startsWith('zh')) browserLang = 'zh';
  document.body.classList.add(`lang-${browserLang}`);

  // JA / EN / ZH のリンククリックイベント
  const jaBtn = document.getElementById('langBtnJa');
  const enBtn = document.getElementById('langBtnEn');
  const zhBtn = document.getElementById('langBtnZh');

  if (jaBtn && enBtn && zhBtn) {
    // 現在の言語に応じて見た目を少し変える
    const updateBtnStyles = (lang) => {
      [jaBtn, enBtn, zhBtn].forEach(btn => {
        btn.style.fontWeight = 'normal';
        btn.style.color = '#888';
      });
      if (lang === 'ja') {
        jaBtn.style.fontWeight = 'bold';
        jaBtn.style.color = '#333';
      } else if (lang === 'zh') {
        zhBtn.style.fontWeight = 'bold';
        zhBtn.style.color = '#333';
      } else {
        enBtn.style.fontWeight = 'bold';
        enBtn.style.color = '#333';
      }
    };

    updateBtnStyles(browserLang);

    jaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-en', 'lang-zh');
      document.body.classList.add('lang-ja');
      updateBtnStyles('ja');
    });

    enBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-ja', 'lang-zh');
      document.body.classList.add('lang-en');
      updateBtnStyles('en');
    });

    zhBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-ja', 'lang-en');
      document.body.classList.add('lang-zh');
      updateBtnStyles('zh');
    });
  }
});
