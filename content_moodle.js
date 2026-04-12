window.addEventListener('load', () => {
    // Moodleのページタイトル（例: "54571:社会と福祉(GV)"）を取得
    const titleElement = document.querySelector('.page-header-headings h1');
    if (!titleElement) return;

    const titleText = titleElement.innerText.trim();
    // タイトルから授業コード（連続する数字）を抽出する
    const courseCodeMatch = titleText.match(/([0-9]{5,})/);
    const courseCode = courseCodeMatch ? courseCodeMatch[1] : null;

    if (!courseCode) return;

    // ストレージから授業コードをキーにしてシラバス情報を取得
    const storageKey = `syllabus_${courseCode}`;
    chrome.storage.local.get([storageKey], (result) => {
        const data = result[storageKey];
        if (data) {
            insertSyllabusInfo(data);
        }
    });
});

function insertSyllabusInfo(data) {
    const actionsContainer = document.querySelector('.header-actions-container');
    if (!actionsContainer || !actionsContainer.parentNode) return;

    // 挿入する情報コンテナの作成（MoodleのBootstrapスタイルを利用して整えます）
    const infoContainer = document.createElement('div');
    infoContainer.className = 'syllabus-info-container mx-3 p-2 border rounded bg-light d-flex align-items-center text-muted';
    infoContainer.style.fontSize = '0.85rem';
    infoContainer.style.gap = '15px';
    
    infoContainer.innerHTML = `
        <div><strong>開講曜日・時限:</strong> ${data.schedule}</div>
        <div><strong>全担当教員:</strong> ${data.teacher}</div>
        <div><strong>単位数:</strong> ${data.credits}</div>
        <div><strong>授業施設:</strong> ${data.room}</div>
    `;

    // タイトルと右側のシラバスボタン群の間に挿入する
    actionsContainer.parentNode.insertBefore(infoContainer, actionsContainer);
}