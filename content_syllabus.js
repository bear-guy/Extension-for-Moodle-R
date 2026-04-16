// ==========================================
// シラバス情報取得・保存処理（シラバスサイト用）
// ==========================================
window.addEventListener('load', () => {
  try {
    // 授業コードを取得
    const courseCodeElement = document.querySelector('.course-code-selector'); 
    const courseCode = courseCodeElement ? courseCodeElement.innerText.trim() : null;
    if (!courseCode) return;

    // シラバス情報の抽出
    const syllabusData = {
      schedule: document.querySelector('.schedule-selector')?.innerText.trim() || "不明",
      teacher: document.querySelector('.teacher-selector')?.innerText.trim() || "不明",
      credits: document.querySelector('.credits-selector')?.innerText.trim() || "不明",
      room: document.querySelector('.room-selector')?.innerText.trim() || "不明"
    };

    // ストレージに保存
    const storageKey = `syllabus_${courseCode}`;
    chrome.storage.local.set({ [storageKey]: syllabusData }, () => {
      console.log(`[Extension-for-Moodle-R] シラバス情報を保存しました: ${courseCode}`, syllabusData);
    });
  } catch (error) {
    console.error("[Extension-for-Moodle-R] シラバス情報の取得に失敗しました", error);
  }
});