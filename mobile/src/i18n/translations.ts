// Core UI dictionary for the 22 supported locales. The base language is
// Uzbek (Latin) — any key missing in another locale falls back to it, so the
// app never shows a raw key. Screens adopt t() incrementally; new strings
// should be added here first.

export const uz = {
  // common
  cancel: "Bekor qilish",
  save: "Saqlash",
  delete: "O'chirish",
  edit: "Tahrirlash",
  done: "Tayyor",
  close: "Yopish",
  search: "Qidirish",
  send: "Yuborish",
  retry: "Qayta urinish",
  error: "Xatolik",
  loading: "Yuklanmoqda...",
  yes: "Ha",
  no: "Yo'q",
  ok: "OK",
  share: "Ulashish",
  copy: "Nusxalash",
  open: "Ochish",
  // tabs
  tabChats: "Suhbatlar",
  tabReels: "Reels",
  tabDiscover: "Kashfiyotlar",
  tabProfile: "Profil",
  // chat
  online: "onlayn",
  offline: "oflayn",
  typing: "yozmoqda...",
  messageDeleted: "Xabar o'chirildi",
  edited: "tahrirlangan",
  reply: "Javob berish",
  forward: "Yo'naltirish",
  pin: "Qadash",
  mute: "Ovozsiz qilish",
  archive: "Arxivlash",
  newChat: "Yangi suhbat",
  contacts: "Kontaktlar",
  calls: "Qo'ng'iroqlar",
  // settings
  settings: "Sozlamalar",
  language: "Til",
  languageDesc: "Ilova tilini tanlang",
  privacy: "Maxfiylik",
  notifications: "Bildirishnomalar",
  theme: "Mavzu",
  wallet: "Hamyon",
  storageUsage: "Xotira",
  activeSessions: "Faol seanslar",
  twoFactor: "Ikki bosqichli tekshiruv",
  appLock: "Ilovani qulflash",
  changePassword: "Parolni o'zgartirish",
  logout: "Chiqish",
  logoutConfirm: "Hisobdan chiqmoqchimisiz?",
} as const;

export type TranslationKey = keyof typeof uz;
export type Dictionary = Partial<Record<TranslationKey, string>>;

const uzCyrl: Dictionary = {
  cancel: "Бекор қилиш", save: "Сақлаш", delete: "Ўчириш", edit: "Таҳрирлаш", done: "Тайёр",
  close: "Ёпиш", search: "Қидириш", send: "Юбориш", retry: "Қайта уриниш", error: "Хатолик",
  loading: "Юкланмоқда...", yes: "Ҳа", no: "Йўқ", ok: "OK", share: "Улашиш", copy: "Нусхалаш", open: "Очиш",
  tabChats: "Суҳбатлар", tabReels: "Reels", tabDiscover: "Кашфиётлар", tabProfile: "Профил",
  online: "онлайн", offline: "офлайн", typing: "ёзмоқда...", messageDeleted: "Хабар ўчирилди",
  edited: "таҳрирланган", reply: "Жавоб бериш", forward: "Йўналтириш", pin: "Қадаш",
  mute: "Овозсиз қилиш", archive: "Архивлаш", newChat: "Янги суҳбат", contacts: "Контактлар", calls: "Қўнғироқлар",
  settings: "Созламалар", language: "Тил", languageDesc: "Илова тилини танланг", privacy: "Махфийлик",
  notifications: "Билдиришномалар", theme: "Мавзу", wallet: "Ҳамён", storageUsage: "Хотира",
  activeSessions: "Фаол сеанслар", twoFactor: "Икки босқичли текшириш", appLock: "Иловани қулфлаш",
  changePassword: "Паролни ўзгартириш", logout: "Чиқиш", logoutConfirm: "Ҳисобдан чиқмоқчимисиз?",
};

const ru: Dictionary = {
  cancel: "Отмена", save: "Сохранить", delete: "Удалить", edit: "Изменить", done: "Готово",
  close: "Закрыть", search: "Поиск", send: "Отправить", retry: "Повторить", error: "Ошибка",
  loading: "Загрузка...", yes: "Да", no: "Нет", ok: "OK", share: "Поделиться", copy: "Копировать", open: "Открыть",
  tabChats: "Чаты", tabReels: "Reels", tabDiscover: "Обзор", tabProfile: "Профиль",
  online: "в сети", offline: "не в сети", typing: "печатает...", messageDeleted: "Сообщение удалено",
  edited: "изменено", reply: "Ответить", forward: "Переслать", pin: "Закрепить",
  mute: "Без звука", archive: "В архив", newChat: "Новый чат", contacts: "Контакты", calls: "Звонки",
  settings: "Настройки", language: "Язык", languageDesc: "Выберите язык приложения", privacy: "Конфиденциальность",
  notifications: "Уведомления", theme: "Тема", wallet: "Кошелёк", storageUsage: "Память",
  activeSessions: "Активные сеансы", twoFactor: "Двухэтапная проверка", appLock: "Блокировка приложения",
  changePassword: "Сменить пароль", logout: "Выйти", logoutConfirm: "Выйти из аккаунта?",
};

const en: Dictionary = {
  cancel: "Cancel", save: "Save", delete: "Delete", edit: "Edit", done: "Done",
  close: "Close", search: "Search", send: "Send", retry: "Retry", error: "Error",
  loading: "Loading...", yes: "Yes", no: "No", ok: "OK", share: "Share", copy: "Copy", open: "Open",
  tabChats: "Chats", tabReels: "Reels", tabDiscover: "Discover", tabProfile: "Profile",
  online: "online", offline: "offline", typing: "typing...", messageDeleted: "Message deleted",
  edited: "edited", reply: "Reply", forward: "Forward", pin: "Pin",
  mute: "Mute", archive: "Archive", newChat: "New chat", contacts: "Contacts", calls: "Calls",
  settings: "Settings", language: "Language", languageDesc: "Choose the app language", privacy: "Privacy",
  notifications: "Notifications", theme: "Theme", wallet: "Wallet", storageUsage: "Storage",
  activeSessions: "Active sessions", twoFactor: "Two-step verification", appLock: "App lock",
  changePassword: "Change password", logout: "Log out", logoutConfirm: "Log out of your account?",
};

const tr: Dictionary = {
  cancel: "İptal", save: "Kaydet", delete: "Sil", edit: "Düzenle", done: "Bitti",
  close: "Kapat", search: "Ara", send: "Gönder", retry: "Tekrar dene", error: "Hata",
  loading: "Yükleniyor...", yes: "Evet", no: "Hayır", ok: "Tamam", share: "Paylaş", copy: "Kopyala", open: "Aç",
  tabChats: "Sohbetler", tabReels: "Reels", tabDiscover: "Keşfet", tabProfile: "Profil",
  online: "çevrimiçi", offline: "çevrimdışı", typing: "yazıyor...", messageDeleted: "Mesaj silindi",
  edited: "düzenlendi", reply: "Yanıtla", forward: "İlet", pin: "Sabitle",
  mute: "Sessize al", archive: "Arşivle", newChat: "Yeni sohbet", contacts: "Kişiler", calls: "Aramalar",
  settings: "Ayarlar", language: "Dil", languageDesc: "Uygulama dilini seçin", privacy: "Gizlilik",
  notifications: "Bildirimler", theme: "Tema", wallet: "Cüzdan", storageUsage: "Depolama",
  activeSessions: "Aktif oturumlar", twoFactor: "İki adımlı doğrulama", appLock: "Uygulama kilidi",
  changePassword: "Şifreyi değiştir", logout: "Çıkış yap", logoutConfirm: "Hesaptan çıkılsın mı?",
};

const kk: Dictionary = {
  cancel: "Болдырмау", save: "Сақтау", delete: "Жою", edit: "Өңдеу", done: "Дайын",
  close: "Жабу", search: "Іздеу", send: "Жіберу", retry: "Қайталау", error: "Қате",
  loading: "Жүктелуде...", yes: "Иә", no: "Жоқ", ok: "OK", share: "Бөлісу", copy: "Көшіру", open: "Ашу",
  tabChats: "Чаттар", tabReels: "Reels", tabDiscover: "Ашу", tabProfile: "Профиль",
  online: "желіде", offline: "желіде емес", typing: "жазып жатыр...", messageDeleted: "Хабар жойылды",
  edited: "өңделген", reply: "Жауап беру", forward: "Қайта жіберу", pin: "Бекіту",
  mute: "Дыбыссыз", archive: "Мұрағаттау", newChat: "Жаңа чат", contacts: "Контактілер", calls: "Қоңыраулар",
  settings: "Параметрлер", language: "Тіл", languageDesc: "Қолданба тілін таңдаңыз", privacy: "Құпиялылық",
  notifications: "Хабарландырулар", theme: "Тақырып", wallet: "Әмиян", storageUsage: "Жад",
  activeSessions: "Белсенді сеанстар", twoFactor: "Екі қадамдық тексеру", appLock: "Қолданба құлпы",
  changePassword: "Құпия сөзді өзгерту", logout: "Шығу", logoutConfirm: "Аккаунттан шығасыз ба?",
};

const ky: Dictionary = {
  cancel: "Жокко чыгаруу", save: "Сактоо", delete: "Өчүрүү", edit: "Оңдоо", done: "Даяр",
  close: "Жабуу", search: "Издөө", send: "Жөнөтүү", retry: "Кайталоо", error: "Ката",
  loading: "Жүктөлүүдө...", yes: "Ооба", no: "Жок", ok: "OK", share: "Бөлүшүү", copy: "Көчүрүү", open: "Ачуу",
  tabChats: "Чаттар", tabReels: "Reels", tabDiscover: "Ачуу", tabProfile: "Профиль",
  online: "тармакта", offline: "тармакта эмес", typing: "жазып жатат...", messageDeleted: "Билдирүү өчүрүлдү",
  edited: "оңдолгон", reply: "Жооп берүү", forward: "Багыттоо", pin: "Кадоо",
  mute: "Үнсүз", archive: "Архивдөө", newChat: "Жаңы чат", contacts: "Байланыштар", calls: "Чалуулар",
  settings: "Жөндөөлөр", language: "Тил", languageDesc: "Колдонмо тилин тандаңыз", privacy: "Купуялык",
  notifications: "Билдирмелер", theme: "Тема", wallet: "Капчык", storageUsage: "Эстутум",
  activeSessions: "Активдүү сеанстар", twoFactor: "Эки кадамдуу текшерүү", appLock: "Колдонмо кулпусу",
  changePassword: "Сырсөздү өзгөртүү", logout: "Чыгуу", logoutConfirm: "Аккаунттан чыгасызбы?",
};

const tg: Dictionary = {
  cancel: "Бекор кардан", save: "Захира кардан", delete: "Нест кардан", edit: "Таҳрир", done: "Тайёр",
  close: "Пӯшидан", search: "Ҷустуҷӯ", send: "Фиристодан", retry: "Такрор", error: "Хато",
  loading: "Бор шуда истодааст...", yes: "Ҳа", no: "Не", ok: "OK", share: "Мубодила", copy: "Нусха", open: "Кушодан",
  tabChats: "Чатҳо", tabReels: "Reels", tabDiscover: "Кашф", tabProfile: "Профил",
  online: "онлайн", offline: "офлайн", typing: "навишта истодааст...", messageDeleted: "Паём нест шуд",
  edited: "таҳриршуда", reply: "Ҷавоб", forward: "Равона кардан", pin: "Часпондан",
  mute: "Бесадо", archive: "Бойгонӣ", newChat: "Чати нав", contacts: "Тамосҳо", calls: "Зангҳо",
  settings: "Танзимот", language: "Забон", languageDesc: "Забони барномаро интихоб кунед", privacy: "Махфият",
  notifications: "Огоҳиномаҳо", theme: "Мавзӯъ", wallet: "Ҳамён", storageUsage: "Ҳофиза",
  activeSessions: "Сеансҳои фаъол", twoFactor: "Санҷиши думарҳилагӣ", appLock: "Қулфи барнома",
  changePassword: "Тағйири парол", logout: "Баромадан", logoutConfirm: "Аз ҳисоб мебароед?",
};

const az: Dictionary = {
  cancel: "Ləğv et", save: "Yadda saxla", delete: "Sil", edit: "Redaktə et", done: "Hazır",
  close: "Bağla", search: "Axtar", send: "Göndər", retry: "Yenidən cəhd et", error: "Xəta",
  loading: "Yüklənir...", yes: "Bəli", no: "Xeyr", ok: "OK", share: "Paylaş", copy: "Kopyala", open: "Aç",
  tabChats: "Söhbətlər", tabReels: "Reels", tabDiscover: "Kəşf et", tabProfile: "Profil",
  online: "onlayn", offline: "oflayn", typing: "yazır...", messageDeleted: "Mesaj silindi",
  edited: "redaktə edilib", reply: "Cavabla", forward: "Yönləndir", pin: "Sabitlə",
  mute: "Səssiz et", archive: "Arxivlə", newChat: "Yeni söhbət", contacts: "Kontaktlar", calls: "Zənglər",
  settings: "Parametrlər", language: "Dil", languageDesc: "Tətbiq dilini seçin", privacy: "Məxfilik",
  notifications: "Bildirişlər", theme: "Mövzu", wallet: "Pul kisəsi", storageUsage: "Yaddaş",
  activeSessions: "Aktiv sessiyalar", twoFactor: "İki mərhələli yoxlama", appLock: "Tətbiq kilidi",
  changePassword: "Şifrəni dəyiş", logout: "Çıxış", logoutConfirm: "Hesabdan çıxırsınız?",
};

const ar: Dictionary = {
  cancel: "إلغاء", save: "حفظ", delete: "حذف", edit: "تعديل", done: "تم",
  close: "إغلاق", search: "بحث", send: "إرسال", retry: "إعادة المحاولة", error: "خطأ",
  loading: "جارٍ التحميل...", yes: "نعم", no: "لا", ok: "حسناً", share: "مشاركة", copy: "نسخ", open: "فتح",
  tabChats: "الدردشات", tabReels: "Reels", tabDiscover: "اكتشف", tabProfile: "الملف الشخصي",
  online: "متصل", offline: "غير متصل", typing: "يكتب...", messageDeleted: "تم حذف الرسالة",
  edited: "معدّلة", reply: "رد", forward: "إعادة توجيه", pin: "تثبيت",
  mute: "كتم", archive: "أرشفة", newChat: "دردشة جديدة", contacts: "جهات الاتصال", calls: "المكالمات",
  settings: "الإعدادات", language: "اللغة", languageDesc: "اختر لغة التطبيق", privacy: "الخصوصية",
  notifications: "الإشعارات", theme: "المظهر", wallet: "المحفظة", storageUsage: "التخزين",
  activeSessions: "الجلسات النشطة", twoFactor: "التحقق بخطوتين", appLock: "قفل التطبيق",
  changePassword: "تغيير كلمة المرور", logout: "تسجيل الخروج", logoutConfirm: "تسجيل الخروج من الحساب؟",
};

const fa: Dictionary = {
  cancel: "لغو", save: "ذخیره", delete: "حذف", edit: "ویرایش", done: "انجام شد",
  close: "بستن", search: "جستجو", send: "ارسال", retry: "تلاش مجدد", error: "خطا",
  loading: "در حال بارگذاری...", yes: "بله", no: "خیر", ok: "باشه", share: "اشتراک‌گذاری", copy: "کپی", open: "باز کردن",
  tabChats: "گفتگوها", tabReels: "Reels", tabDiscover: "کاوش", tabProfile: "پروفایل",
  online: "آنلاین", offline: "آفلاین", typing: "در حال نوشتن...", messageDeleted: "پیام حذف شد",
  edited: "ویرایش‌شده", reply: "پاسخ", forward: "هدایت", pin: "سنجاق",
  mute: "بی‌صدا", archive: "بایگانی", newChat: "گفتگوی جدید", contacts: "مخاطبین", calls: "تماس‌ها",
  settings: "تنظیمات", language: "زبان", languageDesc: "زبان برنامه را انتخاب کنید", privacy: "حریم خصوصی",
  notifications: "اعلان‌ها", theme: "پوسته", wallet: "کیف پول", storageUsage: "حافظه",
  activeSessions: "نشست‌های فعال", twoFactor: "تأیید دومرحله‌ای", appLock: "قفل برنامه",
  changePassword: "تغییر رمز عبور", logout: "خروج", logoutConfirm: "از حساب خارج می‌شوید؟",
};

const hi: Dictionary = {
  cancel: "रद्द करें", save: "सहेजें", delete: "हटाएं", edit: "संपादित करें", done: "हो गया",
  close: "बंद करें", search: "खोजें", send: "भेजें", retry: "पुनः प्रयास", error: "त्रुटि",
  loading: "लोड हो रहा है...", yes: "हाँ", no: "नहीं", ok: "ठीक", share: "साझा करें", copy: "कॉपी", open: "खोलें",
  tabChats: "चैट", tabReels: "Reels", tabDiscover: "खोजें", tabProfile: "प्रोफ़ाइल",
  online: "ऑनलाइन", offline: "ऑफ़लाइन", typing: "लिख रहे हैं...", messageDeleted: "संदेश हटा दिया गया",
  edited: "संपादित", reply: "जवाब दें", forward: "अग्रेषित करें", pin: "पिन करें",
  mute: "म्यूट", archive: "संग्रहित करें", newChat: "नई चैट", contacts: "संपर्क", calls: "कॉल",
  settings: "सेटिंग्स", language: "भाषा", languageDesc: "ऐप की भाषा चुनें", privacy: "गोपनीयता",
  notifications: "सूचनाएं", theme: "थीम", wallet: "वॉलेट", storageUsage: "स्टोरेज",
  activeSessions: "सक्रिय सत्र", twoFactor: "दो-चरणीय सत्यापन", appLock: "ऐप लॉक",
  changePassword: "पासवर्ड बदलें", logout: "लॉग आउट", logoutConfirm: "खाते से लॉग आउट करें?",
};

const ur: Dictionary = {
  cancel: "منسوخ", save: "محفوظ کریں", delete: "حذف کریں", edit: "ترمیم", done: "ہو گیا",
  close: "بند کریں", search: "تلاش", send: "بھیجیں", retry: "دوبارہ کوشش", error: "خرابی",
  loading: "لوڈ ہو رہا ہے...", yes: "ہاں", no: "نہیں", ok: "ٹھیک ہے", share: "شیئر کریں", copy: "کاپی", open: "کھولیں",
  tabChats: "چیٹس", tabReels: "Reels", tabDiscover: "دریافت", tabProfile: "پروفائل",
  online: "آن لائن", offline: "آف لائن", typing: "لکھ رہے ہیں...", messageDeleted: "پیغام حذف ہو گیا",
  edited: "ترمیم شدہ", reply: "جواب دیں", forward: "آگے بھیجیں", pin: "پن کریں",
  mute: "خاموش", archive: "محفوظ خانہ", newChat: "نئی چیٹ", contacts: "رابطے", calls: "کالز",
  settings: "ترتیبات", language: "زبان", languageDesc: "ایپ کی زبان منتخب کریں", privacy: "رازداری",
  notifications: "اطلاعات", theme: "تھیم", wallet: "بٹوہ", storageUsage: "اسٹوریج",
  activeSessions: "فعال سیشنز", twoFactor: "دو مرحلہ تصدیق", appLock: "ایپ لاک",
  changePassword: "پاس ورڈ تبدیل کریں", logout: "لاگ آؤٹ", logoutConfirm: "اکاؤنٹ سے لاگ آؤٹ کریں؟",
};

const id: Dictionary = {
  cancel: "Batal", save: "Simpan", delete: "Hapus", edit: "Edit", done: "Selesai",
  close: "Tutup", search: "Cari", send: "Kirim", retry: "Coba lagi", error: "Kesalahan",
  loading: "Memuat...", yes: "Ya", no: "Tidak", ok: "OK", share: "Bagikan", copy: "Salin", open: "Buka",
  tabChats: "Obrolan", tabReels: "Reels", tabDiscover: "Jelajahi", tabProfile: "Profil",
  online: "daring", offline: "luring", typing: "mengetik...", messageDeleted: "Pesan dihapus",
  edited: "diedit", reply: "Balas", forward: "Teruskan", pin: "Sematkan",
  mute: "Bisukan", archive: "Arsipkan", newChat: "Obrolan baru", contacts: "Kontak", calls: "Panggilan",
  settings: "Pengaturan", language: "Bahasa", languageDesc: "Pilih bahasa aplikasi", privacy: "Privasi",
  notifications: "Notifikasi", theme: "Tema", wallet: "Dompet", storageUsage: "Penyimpanan",
  activeSessions: "Sesi aktif", twoFactor: "Verifikasi dua langkah", appLock: "Kunci aplikasi",
  changePassword: "Ubah kata sandi", logout: "Keluar", logoutConfirm: "Keluar dari akun?",
};

const zh: Dictionary = {
  cancel: "取消", save: "保存", delete: "删除", edit: "编辑", done: "完成",
  close: "关闭", search: "搜索", send: "发送", retry: "重试", error: "错误",
  loading: "加载中...", yes: "是", no: "否", ok: "确定", share: "分享", copy: "复制", open: "打开",
  tabChats: "聊天", tabReels: "视频", tabDiscover: "发现", tabProfile: "我",
  online: "在线", offline: "离线", typing: "正在输入...", messageDeleted: "消息已删除",
  edited: "已编辑", reply: "回复", forward: "转发", pin: "置顶",
  mute: "静音", archive: "归档", newChat: "新聊天", contacts: "通讯录", calls: "通话",
  settings: "设置", language: "语言", languageDesc: "选择应用语言", privacy: "隐私",
  notifications: "通知", theme: "主题", wallet: "钱包", storageUsage: "存储",
  activeSessions: "活跃会话", twoFactor: "两步验证", appLock: "应用锁",
  changePassword: "修改密码", logout: "退出登录", logoutConfirm: "退出账号？",
};

const ja: Dictionary = {
  cancel: "キャンセル", save: "保存", delete: "削除", edit: "編集", done: "完了",
  close: "閉じる", search: "検索", send: "送信", retry: "再試行", error: "エラー",
  loading: "読み込み中...", yes: "はい", no: "いいえ", ok: "OK", share: "共有", copy: "コピー", open: "開く",
  tabChats: "チャット", tabReels: "リール", tabDiscover: "発見", tabProfile: "プロフィール",
  online: "オンライン", offline: "オフライン", typing: "入力中...", messageDeleted: "メッセージが削除されました",
  edited: "編集済み", reply: "返信", forward: "転送", pin: "ピン留め",
  mute: "ミュート", archive: "アーカイブ", newChat: "新しいチャット", contacts: "連絡先", calls: "通話",
  settings: "設定", language: "言語", languageDesc: "アプリの言語を選択", privacy: "プライバシー",
  notifications: "通知", theme: "テーマ", wallet: "ウォレット", storageUsage: "ストレージ",
  activeSessions: "アクティブなセッション", twoFactor: "2段階認証", appLock: "アプリロック",
  changePassword: "パスワード変更", logout: "ログアウト", logoutConfirm: "アカウントからログアウトしますか？",
};

const ko: Dictionary = {
  cancel: "취소", save: "저장", delete: "삭제", edit: "편집", done: "완료",
  close: "닫기", search: "검색", send: "보내기", retry: "다시 시도", error: "오류",
  loading: "로딩 중...", yes: "예", no: "아니요", ok: "확인", share: "공유", copy: "복사", open: "열기",
  tabChats: "채팅", tabReels: "릴스", tabDiscover: "탐색", tabProfile: "프로필",
  online: "온라인", offline: "오프라인", typing: "입력 중...", messageDeleted: "메시지가 삭제됨",
  edited: "편집됨", reply: "답장", forward: "전달", pin: "고정",
  mute: "음소거", archive: "보관", newChat: "새 채팅", contacts: "연락처", calls: "통화",
  settings: "설정", language: "언어", languageDesc: "앱 언어 선택", privacy: "개인정보",
  notifications: "알림", theme: "테마", wallet: "지갑", storageUsage: "저장공간",
  activeSessions: "활성 세션", twoFactor: "2단계 인증", appLock: "앱 잠금",
  changePassword: "비밀번호 변경", logout: "로그아웃", logoutConfirm: "계정에서 로그아웃할까요?",
};

const de: Dictionary = {
  cancel: "Abbrechen", save: "Speichern", delete: "Löschen", edit: "Bearbeiten", done: "Fertig",
  close: "Schließen", search: "Suchen", send: "Senden", retry: "Erneut versuchen", error: "Fehler",
  loading: "Lädt...", yes: "Ja", no: "Nein", ok: "OK", share: "Teilen", copy: "Kopieren", open: "Öffnen",
  tabChats: "Chats", tabReels: "Reels", tabDiscover: "Entdecken", tabProfile: "Profil",
  online: "online", offline: "offline", typing: "schreibt...", messageDeleted: "Nachricht gelöscht",
  edited: "bearbeitet", reply: "Antworten", forward: "Weiterleiten", pin: "Anheften",
  mute: "Stummschalten", archive: "Archivieren", newChat: "Neuer Chat", contacts: "Kontakte", calls: "Anrufe",
  settings: "Einstellungen", language: "Sprache", languageDesc: "App-Sprache wählen", privacy: "Privatsphäre",
  notifications: "Benachrichtigungen", theme: "Design", wallet: "Wallet", storageUsage: "Speicher",
  activeSessions: "Aktive Sitzungen", twoFactor: "Zwei-Faktor-Authentifizierung", appLock: "App-Sperre",
  changePassword: "Passwort ändern", logout: "Abmelden", logoutConfirm: "Vom Konto abmelden?",
};

const fr: Dictionary = {
  cancel: "Annuler", save: "Enregistrer", delete: "Supprimer", edit: "Modifier", done: "Terminé",
  close: "Fermer", search: "Rechercher", send: "Envoyer", retry: "Réessayer", error: "Erreur",
  loading: "Chargement...", yes: "Oui", no: "Non", ok: "OK", share: "Partager", copy: "Copier", open: "Ouvrir",
  tabChats: "Discussions", tabReels: "Reels", tabDiscover: "Découvrir", tabProfile: "Profil",
  online: "en ligne", offline: "hors ligne", typing: "écrit...", messageDeleted: "Message supprimé",
  edited: "modifié", reply: "Répondre", forward: "Transférer", pin: "Épingler",
  mute: "Muet", archive: "Archiver", newChat: "Nouvelle discussion", contacts: "Contacts", calls: "Appels",
  settings: "Paramètres", language: "Langue", languageDesc: "Choisir la langue de l'application", privacy: "Confidentialité",
  notifications: "Notifications", theme: "Thème", wallet: "Portefeuille", storageUsage: "Stockage",
  activeSessions: "Sessions actives", twoFactor: "Vérification en deux étapes", appLock: "Verrouillage",
  changePassword: "Changer le mot de passe", logout: "Se déconnecter", logoutConfirm: "Se déconnecter du compte ?",
};

const es: Dictionary = {
  cancel: "Cancelar", save: "Guardar", delete: "Eliminar", edit: "Editar", done: "Listo",
  close: "Cerrar", search: "Buscar", send: "Enviar", retry: "Reintentar", error: "Error",
  loading: "Cargando...", yes: "Sí", no: "No", ok: "OK", share: "Compartir", copy: "Copiar", open: "Abrir",
  tabChats: "Chats", tabReels: "Reels", tabDiscover: "Descubrir", tabProfile: "Perfil",
  online: "en línea", offline: "desconectado", typing: "escribiendo...", messageDeleted: "Mensaje eliminado",
  edited: "editado", reply: "Responder", forward: "Reenviar", pin: "Fijar",
  mute: "Silenciar", archive: "Archivar", newChat: "Nuevo chat", contacts: "Contactos", calls: "Llamadas",
  settings: "Ajustes", language: "Idioma", languageDesc: "Elige el idioma de la app", privacy: "Privacidad",
  notifications: "Notificaciones", theme: "Tema", wallet: "Billetera", storageUsage: "Almacenamiento",
  activeSessions: "Sesiones activas", twoFactor: "Verificación en dos pasos", appLock: "Bloqueo de app",
  changePassword: "Cambiar contraseña", logout: "Cerrar sesión", logoutConfirm: "¿Cerrar sesión de la cuenta?",
};

const it: Dictionary = {
  cancel: "Annulla", save: "Salva", delete: "Elimina", edit: "Modifica", done: "Fatto",
  close: "Chiudi", search: "Cerca", send: "Invia", retry: "Riprova", error: "Errore",
  loading: "Caricamento...", yes: "Sì", no: "No", ok: "OK", share: "Condividi", copy: "Copia", open: "Apri",
  tabChats: "Chat", tabReels: "Reels", tabDiscover: "Scopri", tabProfile: "Profilo",
  online: "online", offline: "offline", typing: "sta scrivendo...", messageDeleted: "Messaggio eliminato",
  edited: "modificato", reply: "Rispondi", forward: "Inoltra", pin: "Fissa",
  mute: "Silenzia", archive: "Archivia", newChat: "Nuova chat", contacts: "Contatti", calls: "Chiamate",
  settings: "Impostazioni", language: "Lingua", languageDesc: "Scegli la lingua dell'app", privacy: "Privacy",
  notifications: "Notifiche", theme: "Tema", wallet: "Portafoglio", storageUsage: "Archiviazione",
  activeSessions: "Sessioni attive", twoFactor: "Verifica in due passaggi", appLock: "Blocco app",
  changePassword: "Cambia password", logout: "Esci", logoutConfirm: "Uscire dall'account?",
};

const pt: Dictionary = {
  cancel: "Cancelar", save: "Salvar", delete: "Excluir", edit: "Editar", done: "Concluído",
  close: "Fechar", search: "Pesquisar", send: "Enviar", retry: "Tentar novamente", error: "Erro",
  loading: "Carregando...", yes: "Sim", no: "Não", ok: "OK", share: "Compartilhar", copy: "Copiar", open: "Abrir",
  tabChats: "Conversas", tabReels: "Reels", tabDiscover: "Descobrir", tabProfile: "Perfil",
  online: "online", offline: "offline", typing: "digitando...", messageDeleted: "Mensagem apagada",
  edited: "editada", reply: "Responder", forward: "Encaminhar", pin: "Fixar",
  mute: "Silenciar", archive: "Arquivar", newChat: "Nova conversa", contacts: "Contatos", calls: "Chamadas",
  settings: "Configurações", language: "Idioma", languageDesc: "Escolha o idioma do app", privacy: "Privacidade",
  notifications: "Notificações", theme: "Tema", wallet: "Carteira", storageUsage: "Armazenamento",
  activeSessions: "Sessões ativas", twoFactor: "Verificação em duas etapas", appLock: "Bloqueio do app",
  changePassword: "Alterar senha", logout: "Sair", logoutConfirm: "Sair da conta?",
};

const vi: Dictionary = {
  cancel: "Hủy", save: "Lưu", delete: "Xóa", edit: "Sửa", done: "Xong",
  close: "Đóng", search: "Tìm kiếm", send: "Gửi", retry: "Thử lại", error: "Lỗi",
  loading: "Đang tải...", yes: "Có", no: "Không", ok: "OK", share: "Chia sẻ", copy: "Sao chép", open: "Mở",
  tabChats: "Trò chuyện", tabReels: "Reels", tabDiscover: "Khám phá", tabProfile: "Hồ sơ",
  online: "trực tuyến", offline: "ngoại tuyến", typing: "đang nhập...", messageDeleted: "Tin nhắn đã xóa",
  edited: "đã sửa", reply: "Trả lời", forward: "Chuyển tiếp", pin: "Ghim",
  mute: "Tắt tiếng", archive: "Lưu trữ", newChat: "Trò chuyện mới", contacts: "Danh bạ", calls: "Cuộc gọi",
  settings: "Cài đặt", language: "Ngôn ngữ", languageDesc: "Chọn ngôn ngữ ứng dụng", privacy: "Quyền riêng tư",
  notifications: "Thông báo", theme: "Giao diện", wallet: "Ví", storageUsage: "Bộ nhớ",
  activeSessions: "Phiên hoạt động", twoFactor: "Xác minh hai bước", appLock: "Khóa ứng dụng",
  changePassword: "Đổi mật khẩu", logout: "Đăng xuất", logoutConfirm: "Đăng xuất khỏi tài khoản?",
};

export interface LocaleInfo {
  code: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "uz", nativeName: "O'zbekcha", flag: "🇺🇿" },
  { code: "uz-Cyrl", nativeName: "Ўзбекча (кирилл)", flag: "🇺🇿" },
  { code: "ru", nativeName: "Русский", flag: "🇷🇺" },
  { code: "en", nativeName: "English", flag: "🇬🇧" },
  { code: "tr", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "kk", nativeName: "Қазақша", flag: "🇰🇿" },
  { code: "ky", nativeName: "Кыргызча", flag: "🇰🇬" },
  { code: "tg", nativeName: "Тоҷикӣ", flag: "🇹🇯" },
  { code: "az", nativeName: "Azərbaycanca", flag: "🇦🇿" },
  { code: "ar", nativeName: "العربية", flag: "🇸🇦", rtl: true },
  { code: "fa", nativeName: "فارسی", flag: "🇮🇷", rtl: true },
  { code: "hi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", nativeName: "اردو", flag: "🇵🇰", rtl: true },
  { code: "id", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "zh", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", nativeName: "한국어", flag: "🇰🇷" },
  { code: "de", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "fr", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", nativeName: "Español", flag: "🇪🇸" },
  { code: "it", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", nativeName: "Português", flag: "🇧🇷" },
  { code: "vi", nativeName: "Tiếng Việt", flag: "🇻🇳" },
];

export const DICTIONARIES: Record<string, Dictionary> = {
  uz,
  "uz-Cyrl": uzCyrl,
  ru,
  en,
  tr,
  kk,
  ky,
  tg,
  az,
  ar,
  fa,
  hi,
  ur,
  id,
  zh,
  ja,
  ko,
  de,
  fr,
  es,
  it,
  pt,
  vi,
};
