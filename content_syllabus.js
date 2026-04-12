window.addEventListener('load', () => {
    try {
        // ※注意: 以下のセレクタ（document.querySelector等）は実際のシラバス詳細ページのHTML構造に合わせて書き換えてください。
        
        // 授業コードを取得 (Moodle側のコードと一致させるためのキーとなります)
        // 仮の取得例
        const courseCodeElement = document.querySelector('.course-code-selector'); 
        const courseCode = courseCodeElement ? courseCodeElement.innerText.trim() : null;

        if (!courseCode) return;

        // 各情報の取得
        const syllabusData = {
            schedule: document.querySelector('.schedule-selector')?.innerText.trim() || "不明",
            teacher: document.querySelector('.teacher-selector')?.innerText.trim() || "不明",
            credits: document.querySelector('.credits-selector')?.innerText.trim() || "不明",
            room: document.querySelector('.room-selector')?.innerText.trim() || "不明"
        };

        // 授業コードをキーにしてストレージに保存
        const storageKey = `syllabus_${courseCode}`;
        chrome.storage.local.set({ [storageKey]: syllabusData }, () => {
            console.log(`[Extension-for-Moodle-R] シラバス情報を保存しました: ${courseCode}`, syllabusData);
        });
    } catch (error) {
        console.error("[Extension-for-Moodle-R] シラバス情報の取得に失敗しました", error);
    }
});