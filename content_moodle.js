// ==========================================
// UI操作ユーティリティ
// ==========================================

// シラバス情報をMoodle画面に挿入
const insertSyllabusInfo = (data) => {
  const actionsContainer = document.querySelector('.header-actions-container');
  if (!actionsContainer || !actionsContainer.parentNode) return;

  // 情報コンテナの作成
  const infoContainer = document.createElement('div');
  infoContainer.className = 'syllabus-info-container mx-3 p-2 border rounded bg-light d-flex align-items-center text-muted';
  Object.assign(infoContainer.style, { fontSize: '0.85rem', gap: '15px' });
  
  infoContainer.innerHTML = `
    <div><strong>開講曜日・時限:</strong> ${data.schedule}</div>
    <div><strong>全担当教員:</strong> ${data.teacher}</div>
    <div><strong>単位数:</strong> ${data.credits}</div>
    <div><strong>授業施設:</strong> ${data.room}</div>
  `;

  actionsContainer.parentNode.insertBefore(infoContainer, actionsContainer);
};

// ==========================================
// メイン処理（Moodle用）
// ==========================================
window.addEventListener('load', () => {
  const titleElement = document.querySelector('.page-header-headings h1');
  if (!titleElement) return;

  // タイトルから授業コードを抽出
  const courseCodeMatch = titleElement.innerText.trim().match(/([0-9]{5,})/);
  const courseCode = courseCodeMatch ? courseCodeMatch[1] : null;
  if (!courseCode) return;

  // ストレージから情報を取得して表示
  const storageKey = `syllabus_${courseCode}`;
  chrome.storage.local.get([storageKey], (result) => {
    if (result[storageKey]) insertSyllabusInfo(result[storageKey]);
  });
});