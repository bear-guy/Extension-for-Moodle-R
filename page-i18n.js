document.addEventListener('DOMContentLoaded', () => {
  // 自動検知してクラスを付与
  const browserLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
  document.body.classList.add(`lang-${browserLang}`);

  // JA / EN のリンククリックイベント
  const jaBtn = document.getElementById('langBtnJa');
  const enBtn = document.getElementById('langBtnEn');

  if (jaBtn && enBtn) {
    // 現在の言語に応じて見た目を少し変える
    const updateBtnStyles = (lang) => {
      if (lang === 'ja') {
        jaBtn.style.fontWeight = 'bold';
        jaBtn.style.color = '#333';
        enBtn.style.fontWeight = 'normal';
        enBtn.style.color = '#888';
      } else {
        enBtn.style.fontWeight = 'bold';
        enBtn.style.color = '#333';
        jaBtn.style.fontWeight = 'normal';
        jaBtn.style.color = '#888';
      }
    };

    updateBtnStyles(browserLang);

    jaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-en');
      document.body.classList.add('lang-ja');
      updateBtnStyles('ja');
    });

    enBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.remove('lang-ja');
      document.body.classList.add('lang-en');
      updateBtnStyles('en');
    });
  }
});
