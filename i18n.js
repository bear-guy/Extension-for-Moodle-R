// i18n.js
// カスタムの翻訳辞書モジュール

const translations = {
  // --- popup.html UI elements ---
  "popup_title": { "ja": "Extension for Moodle+R", "en": "Extension for Moodle+R" },
  "better_layout": { "ja": "ベターレイアウト", "en": "Better Layout" },
  "syllabus_auto_fetch": { "ja": "シラバス情報の自動取得", "en": "Auto-fetch Syllabus" },
  "fetch_all_syllabus": { "ja": "登録された授業のシラバスを全て取得", "en": "Fetch all registered syllabus data" },
  "clear_syllabus_data": { "ja": "取得したデータを削除", "en": "Clear fetched data" },
  "staff_mode": { "ja": "教職員モード", "en": "Staff Mode" },
  "skip_home": { "ja": "ホームスキップ", "en": "Skip Home" },
  "highlight_current": { "ja": "今日の時間割をハイライト", "en": "Highlight Today's Timetable" },
  "dark_mode": { "ja": "ダークモード（ベータ）", "en": "Dark Mode (Beta)" },
  "feeling_lucky": { "ja": "I'm Feeling Lucky", "en": "I'm Feeling Lucky" },
  "support_contact": { "ja": "サポート・お問い合わせ", "en": "Support / Contact" },
  "feature_intro": { "ja": "機能の紹介", "en": "Features" },
  "privacy_policy": { "ja": "プライバシーポリシー", "en": "Privacy Policy" },
  "language_auto": { "ja": "言語: 自動 (Auto)", "en": "Language: Auto" },
  "language_ja": { "ja": "日本語", "en": "日本語" },
  "language_en": { "ja": "English", "en": "English" },

  // --- popup.js alerts & confirms ---
  "confirm_disable_better_layout": { 
    "ja": "ベターレイアウトをオフにするとシラバス機能も無効になり、取得済みのシラバスデータがすべて削除されます。\n本当によろしいですか？", 
    "en": "Turning off Better Layout will disable syllabus features and delete all fetched data.\nAre you sure?" 
  },
  "syllabus_fetch_no_course_codes": { 
    "ja": "時間割から授業コードが見つかりませんでした。\nMoodleのダッシュボード（時間割が表示されているページ）を開いた状態で実行してください。\nまた、すでに登録されている可能性があります。", 
    "en": "No course codes found.\nPlease run this on the Moodle Dashboard where your timetable is displayed.\nIt may also be already registered." 
  },
  "syllabus_fetch_all_done": { 
    "ja": "登録されているすべての授業のシラバス情報はすでに取得済みです。\n最新の情報に更新したい場合は、下の「取得したデータを削除」を実行してから再度実行してください。", 
    "en": "Syllabus data for all registered courses has already been fetched.\nTo update to the latest information, please execute 'Clear fetched data' below and try again." 
  },
  "syllabus_fetch_start": { 
    "ja": "未取得の {count} 件の授業のシラバス自動取得を開始します。\n別タブが順次開いて処理されますので、しばらくお待ちください。", 
    "en": "Starting auto-fetch for {count} remaining courses.\nNew tabs will open sequentially. Please wait." 
  },
  "confirm_disable_syllabus": { 
    "ja": "シラバス情報の自動取得をオフにすると、取得済みのシラバスデータがすべて削除されます。\n本当によろしいですか？", 
    "en": "Turning off Auto-fetch Syllabus will delete all fetched syllabus data.\nAre you sure?" 
  },
  "confirm_enable_syllabus": { 
    "ja": "シラバス情報の自動取得がオンになりました。\n登録されたすべての授業のシラバスを自動取得しますか？（1分程度）\n※Moodleのダッシュボードを開いている必要があります。", 
    "en": "Auto-fetch Syllabus is now enabled.\nWould you like to auto-fetch syllabus data for all registered courses? (~1 min)\n*Requires the Moodle Dashboard to be open." 
  },
  "confirm_clear_syllabus": { 
    "ja": "取得したシラバスのデータをすべて削除しますか？\n取得したシラバス情報の表示が消え、再度シラバスを開くまで表示されなくなります。", 
    "en": "Clear all fetched syllabus data?\nSyllabus info will no longer be displayed until you open the syllabus again." 
  },
  "alert_syllabus_cleared": { 
    "ja": "シラバスデータを削除しました。", 
    "en": "Syllabus data cleared." 
  },
  "alert_no_data_to_clear": { 
    "ja": "削除するデータがありません。", 
    "en": "No data to clear." 
  },

  // --- content.js injected UI & alerts ---
  "content_syllabus_auto_fetch_done": { 
    "ja": "登録されたすべての授業のシラバス情報の自動取得が完了しました。\nページを再読み込みして表示を更新します。", 
    "en": "Finished auto-fetching syllabus data for all registered courses.\nReloading the page to update the display." 
  },
  "content_prompt_install_thanks": { 
    "ja": "インストールしていただき、ありがとうございます。\n\n{count}件の登録された授業のシラバス情報を自動で取得しますか？（1分程度かかります）", 
    "en": "Thank you for installing!\n\nWould you like to auto-fetch syllabus data for {count} registered courses? (Takes ~1 min)" 
  },
  "content_prompt_fetch_started": { 
    "ja": "シラバスの自動取得を開始しました（{count}件）。\n別タブが順次開いて処理されますので、しばらくお待ちください。", 
    "en": "Started auto-fetching syllabus data ({count} courses).\nNew tabs will open sequentially. Please wait." 
  },
  "content_mark_all_read": { "ja": "すべて既読にする", "en": "Mark all as read" },
  "content_message_teacher": { "ja": "{teacher} へメッセージを送信", "en": "Send message to {teacher}" },
  "content_btn_syllabus": { "ja": "シラバス", "en": "Syllabus" },
  "content_info_schedule": { "ja": "開講曜日・時限:", "en": "Schedule:" },
  "content_info_teacher": { "ja": "担当教員:", "en": "Teacher:" },
  "content_info_credits": { "ja": "単位:", "en": "Credits:" },
  "content_info_room": { "ja": "教室:", "en": "Room:" },
  "content_info_unknown": { "ja": "不明", "en": "Unknown" },
  "content_toast_syllabus_saved": { "ja": "シラバス情報を取得・保存しました。", "en": "Syllabus information fetched and saved." },
};

window.MoodleExtI18n = {
  // 現在設定されている言語 ('ja' または 'en') を取得する
  getLanguage: function(callback) {
    chrome.storage.local.get(['displayLanguage'], function(result) {
      if (result.displayLanguage && (result.displayLanguage === 'ja' || result.displayLanguage === 'en')) {
        callback(result.displayLanguage);
      } else {
        // 'auto' または設定がない場合はブラウザの言語を判定
        const browserLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
        callback(browserLang);
      }
    });
  },
  
  // キーと言語コードから翻訳された文字列を取得する
  getMessage: function(key, langCode, replacements = {}) {
    let text = translations[key]?.[langCode] || translations[key]?.['en'] || key;
    
    // {count} や {teacher} などのプレースホルダーを置換
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
    }
    
    return text;
  }
};
