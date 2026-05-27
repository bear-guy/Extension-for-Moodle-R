// i18n.js
// カスタムの翻訳辞書モジュール

const translations = {
  // --- popup.html UI elements ---
  "popup_title": { "ja": "Extension for Moodle+R", "en": "Extension for Moodle+R", "zh": "Extension for Moodle+R", "ko": "Extension for Moodle+R", "es": "Extension for Moodle+R" },
  "better_layout": { "ja": "ベターレイアウト", "en": "Better Layout", "zh": "优化布局", "ko": "더 나은 레이아웃", "es": "Mejor Diseño" },
  "syllabus_auto_fetch": { "ja": "シラバス情報の自動取得", "en": "Auto-fetch Syllabus", "zh": "自动获取教学大纲", "ko": "강의 계획서 자동 가져오기", "es": "Obtención Automática de Temario" },
  "fetch_all_syllabus": { "ja": "登録された授業のシラバスを全て取得", "en": "Fetch all registered syllabus data", "zh": "获取所有已注册课程的教学大纲", "ko": "등록된 모든 강의 계획서 데이터 가져오기", "es": "Obtener todos los datos de temarios registrados" },
  "clear_syllabus_data": { "ja": "取得したデータを削除", "en": "Clear fetched data", "zh": "清除已获取的数据", "ko": "가져온 데이터 지우기", "es": "Borrar datos obtenidos" },
  "staff_mode": { "ja": "教職員モード", "en": "Staff Mode", "zh": "教职工模式", "ko": "교직원 모드", "es": "Modo Personal" },
  "skip_home": { "ja": "ホームスキップ", "en": "Skip Home", "zh": "跳过首页", "ko": "홈 건너뛰기", "es": "Omitir Inicio" },
  "highlight_current": { "ja": "今日の時間割をハイライト", "en": "Highlight Today's Timetable", "zh": "高亮显示今日课表", "ko": "오늘의 시간표 강조", "es": "Resaltar el Horario de Hoy" },
  "dark_mode": { "ja": "ダークモード（ベータ）", "en": "Dark Mode (Beta)", "zh": "深色模式 (Beta)", "ko": "다크 모드 (베타)", "es": "Modo Oscuro (Beta)" },
  "feeling_lucky": { "ja": "I'm Feeling Lucky", "en": "I'm Feeling Lucky", "zh": "I'm Feeling Lucky", "ko": "I'm Feeling Lucky", "es": "I'm Feeling Lucky" },
  "support_contact": { "ja": "サポート・お問い合わせ", "en": "Support / Contact", "zh": "支持与联系", "ko": "지원 / 문의", "es": "Soporte / Contacto" },
  "feature_intro": { "ja": "機能の紹介", "en": "Features", "zh": "功能介绍", "ko": "기능 소개", "es": "Características" },
  "privacy_policy": { "ja": "プライバシーポリシー", "en": "Privacy Policy", "zh": "隐私政策", "ko": "개인정보처리방침", "es": "Política de Privacidad" },
  "language_auto": { "ja": "言語: 自動 (Auto)", "en": "Language: Auto", "zh": "语言: 自动 (Auto)", "ko": "언어: 자동 (Auto)", "es": "Idioma: Automático (Auto)" },
  "language_ja": { "ja": "日本語", "en": "日本語", "zh": "日本語", "ko": "日本語", "es": "日本語" },
  "language_en": { "ja": "English", "en": "English", "zh": "English", "ko": "English", "es": "English" },
  "language_label": { "ja": "言語 (Language)", "en": "Language (言語)", "zh": "语言 (Language)", "ko": "언어 (Language)", "es": "Idioma (Language)" },

  // --- popup.js alerts & confirms ---
  "confirm_disable_better_layout": { 
    "ja": "ベターレイアウトをオフにするとシラバス機能も無効になり、取得済みのシラバスデータがすべて削除されます。\n本当によろしいですか？", 
    "en": "Turning off Better Layout will disable syllabus features and delete all fetched data.\nAre you sure?",
    "zh": "关闭优化布局将同时禁用教学大纲功能，并删除所有已获取的数据。\n确定要关闭吗？",
    "ko": "더 나은 레이아웃을 끄면 강의 계획서 기능도 비활성화되며, 가져온 모든 데이터가 삭제됩니다.\n계속하시겠습니까?",
    "es": "Desactivar Mejor Diseño deshabilitará las funciones del temario y eliminará todos los datos obtenidos.\n¿Estás seguro?"
  },
  "syllabus_fetch_no_course_codes": { 
    "ja": "時間割から授業コードが見つかりませんでした。\nMoodleのダッシュボード（時間割が表示されているページ）を開いた状態で実行してください。\nまた、すでに登録されている可能性があります。", 
    "en": "No course codes found.\nPlease run this on the Moodle Dashboard where your timetable is displayed.\nIt may also be already registered.",
    "zh": "未找到课程代码。\n请在显示课表的Moodle仪表板页面上运行此功能。\n另外，您的课程可能已被注册。",
    "ko": "수업 코드를 찾을 수 없습니다.\n시간표가 표시된 Moodle 대시보드에서 실행해 주세요.\n또는 이미 등록되었을 수 있습니다.",
    "es": "No se encontraron códigos de curso.\nEjecuta esto en el Panel de Moodle donde se muestra tu horario.\nTambién es posible que ya esté registrado."
  },
  "syllabus_fetch_all_done": { 
    "ja": "登録されているすべての授業のシラバス情報はすでに取得済みです。\n最新の情報に更新したい場合は、下の「取得したデータを削除」を実行してから再度実行してください。", 
    "en": "Syllabus data for all registered courses has already been fetched.\nTo update to the latest information, please execute 'Clear fetched data' below and try again.",
    "zh": "所有已注册课程的教学大纲均已获取完毕。\n若想更新至最新信息，请点击下方的“清除已获取的数据”后重试。",
    "ko": "등록된 모든 수업의 강의 계획서 정보를 이미 가져왔습니다.\n최신 정보로 업데이트하려면 아래의 '가져온 데이터 지우기'를 실행한 후 다시 시도해 주세요.",
    "es": "Ya se han obtenido los datos del temario de todos los cursos registrados.\nPara actualizar a la información más reciente, ejecuta 'Borrar datos obtenidos' a continuación y vuelve a intentarlo."
  },
  "syllabus_fetch_start": { 
    "ja": "未取得の {count} 件の授業のシラバス自動取得を開始します。\n別タブが順次開いて処理されますので、しばらくお待ちください。", 
    "en": "Starting auto-fetch for {count} remaining courses.\nNew tabs will open sequentially. Please wait.",
    "zh": "开始自动获取剩余 {count} 门课程的教学大纲。\n新标签页将依次打开，请稍候。",
    "ko": "가져오지 않은 {count}개 수업의 강의 계획서 자동 가져오기를 시작합니다.\n새 탭이 순차적으로 열립니다. 잠시만 기다려 주세요.",
    "es": "Iniciando la obtención automática de {count} cursos restantes.\nSe abrirán nuevas pestañas secuencialmente. Por favor, espera."
  },
  "confirm_disable_syllabus": { 
    "ja": "シラバス情報の自動取得をオフにすると、取得済みのシラバスデータがすべて削除されます。\n本当によろしいですか？", 
    "en": "Turning off Auto-fetch Syllabus will delete all fetched syllabus data.\nAre you sure?",
    "zh": "关闭自动获取教学大纲功能将删除所有已获取的教学大纲数据。\n确定要关闭吗？",
    "ko": "강의 계획서 자동 가져오기를 끄면 가져온 모든 강의 계획서 데이터가 삭제됩니다.\n계속하시겠습니까?",
    "es": "Desactivar Obtención Automática de Temario eliminará todos los datos de temario obtenidos.\n¿Estás seguro?"
  },
  "confirm_enable_syllabus": { 
    "ja": "シラバス情報の自動取得がオンになりました。\n登録されたすべての授業のシラバスを自動取得しますか？（1分程度）\n※Moodleのダッシュボードを開いている必要があります。", 
    "en": "Auto-fetch Syllabus is now enabled.\nWould you like to auto-fetch syllabus data for all registered courses? (~1 min)\n*Requires the Moodle Dashboard to be open.",
    "zh": "自动获取教学大纲已开启。\n您是否要自动获取所有已注册课程的教学大纲？（约1分钟）\n※需要在Moodle仪表板页面上运行。",
    "ko": "강의 계획서 자동 가져오기가 켜졌습니다.\n등록된 모든 수업의 강의 계획서를 자동으로 가져오시겠습니까? (약 1분 소요)\n※ Moodle 대시보드가 열려 있어야 합니다.",
    "es": "La Obtención Automática de Temario ahora está activada.\n¿Te gustaría obtener automáticamente los datos del temario de todos los cursos registrados? (~1 min)\n*Requiere que el Panel de Moodle esté abierto."
  },
  "confirm_clear_syllabus": { 
    "ja": "取得したシラバスのデータをすべて削除しますか？\n取得したシラバス情報の表示が消え、再度シラバスを開くまで表示されなくなります。", 
    "en": "Clear all fetched syllabus data?\nSyllabus info will no longer be displayed until you open the syllabus again.",
    "zh": "是否清除所有已获取的教学大纲数据？\n教学大纲信息将被隐藏，直到您再次打开大纲为止。",
    "ko": "가져온 모든 강의 계획서 데이터를 지우시겠습니까?\n강의 계획서 정보는 다시 열 때까지 표시되지 않습니다.",
    "es": "¿Borrar todos los datos de temario obtenidos?\nLa información del temario ya no se mostrará hasta que vuelvas a abrir el temario."
  },
  "alert_syllabus_cleared": { 
    "ja": "シラバスデータを削除しました。", 
    "en": "Syllabus data cleared.",
    "zh": "教学大纲数据已清除。",
    "ko": "강의 계획서 데이터가 지워졌습니다.",
    "es": "Datos del temario borrados."
  },
  "alert_no_data_to_clear": { 
    "ja": "削除するデータがありません。", 
    "en": "No data to clear.",
    "zh": "没有可清除的数据。",
    "ko": "지울 데이터가 없습니다.",
    "es": "No hay datos para borrar."
  },

  // --- content.js injected UI & alerts ---
  "content_syllabus_auto_fetch_done": { 
    "ja": "登録されたすべての授業のシラバス情報の自動取得が完了しました。\nページを再読み込みして表示を更新します。", 
    "en": "Finished auto-fetching syllabus data for all registered courses.\nReloading the page to update the display.",
    "zh": "已完成所有已注册课程教学大纲的自动获取。\n正在重新加载页面以更新显示。",
    "ko": "등록된 모든 수업의 강의 계획서 자동 가져오기가 완료되었습니다.\n디스플레이를 업데이트하기 위해 페이지를 다시 로드합니다.",
    "es": "Terminada la obtención automática de datos de temarios de todos los cursos registrados.\nRecargando la página para actualizar la pantalla."
  },
  "content_prompt_install_thanks": { 
    "ja": "インストールしていただき、ありがとうございます。\n\n{count}件の登録された授業のシラバス情報を自動で取得しますか？（1分程度かかります）", 
    "en": "Thank you for installing!\n\nWould you like to auto-fetch syllabus data for {count} registered courses? (Takes ~1 min)",
    "zh": "感谢您的安装！\n\n您是否要自动获取 {count} 门已注册课程的教学大纲？（约需1分钟）",
    "ko": "설치해 주셔서 감사합니다!\n\n{count}개의 등록된 수업에 대한 강의 계획서 데이터를 자동으로 가져오시겠습니까? (약 1분 소요)",
    "es": "¡Gracias por instalar!\n\n¿Te gustaría obtener automáticamente los datos del temario de {count} cursos registrados? (Tarda ~1 min)"
  },
  "content_prompt_fetch_started": { 
    "ja": "シラバスの自動取得を開始しました（{count}件）。\n別タブが順次開いて処理されますので、しばらくお待ちください。", 
    "en": "Started auto-fetching syllabus data ({count} courses).\nNew tabs will open sequentially. Please wait.",
    "zh": "已开始自动获取教学大纲（共 {count} 门）。\n新标签页将依次打开进行处理，请稍候。",
    "ko": "강의 계획서 데이터 자동 가져오기를 시작했습니다 ({count} 수업).\n새 탭이 순차적으로 열립니다. 잠시 기다려 주세요.",
    "es": "Iniciada la obtención automática de datos de temarios ({count} cursos).\nSe abrirán nuevas pestañas secuencialmente. Por favor, espera."
  },
  "content_mark_all_read": { "ja": "すべて既読にする", "en": "Mark all as read", "zh": "全部标记为已读", "ko": "모두 읽음으로 표시", "es": "Marcar todo como leído" },
  "content_message_teacher": { "ja": "{teacher} へメッセージを送信", "en": "Send message to {teacher}", "zh": "发送消息给 {teacher}", "ko": "{teacher}님에게 메시지 보내기", "es": "Enviar mensaje a {teacher}" },
  "content_btn_syllabus": { "ja": "シラバス", "en": "Syllabus", "zh": "教学大纲", "ko": "강의 계획서", "es": "Temario" },
  "content_info_schedule": { "ja": "開講曜日・時限:", "en": "Schedule:", "zh": "上课时间:", "ko": "수업 시간:", "es": "Horario:" },
  "content_info_teacher": { "ja": "担当教員:", "en": "Teacher:", "zh": "授课教师:", "ko": "담당 교수:", "es": "Profesor:" },
  "content_info_credits": { "ja": "単位:", "en": "Credits:", "zh": "学分:", "ko": "학점:", "es": "Créditos:" },
  "content_info_room": { "ja": "教室:", "en": "Room:", "zh": "教室:", "ko": "강의실:", "es": "Aula:" },
  "content_info_unknown": { "ja": "不明", "en": "Unknown", "zh": "未知", "ko": "알 수 없음", "es": "Desconocido" },
  "content_toast_syllabus_saved": { "ja": "シラバス情報を取得・保存しました。", "en": "Syllabus information fetched and saved.", "zh": "已获取并保存教学大纲信息。", "ko": "강의 계획서 정보를 가져와 저장했습니다.", "es": "Información del temario obtenida y guardada." },
};

window.MoodleExtI18n = {
  // 現在設定されている言語 ('ja' または 'en') を取得する
  getLanguage: function(callback) {
    chrome.storage.local.get(['displayLanguage'], function(result) {
      if (result.displayLanguage && ['ja', 'en', 'zh', 'ko', 'es'].includes(result.displayLanguage)) {
        callback(result.displayLanguage);
      } else {
        // 'auto' または設定がない場合はブラウザの言語を判定
        let browserLang = 'en';
        if (navigator.language.startsWith('ja')) browserLang = 'ja';
        else if (navigator.language.startsWith('zh')) browserLang = 'zh';
        else if (navigator.language.startsWith('ko')) browserLang = 'ko';
        else if (navigator.language.startsWith('es')) browserLang = 'es';
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
