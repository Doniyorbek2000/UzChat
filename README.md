# UzChat

Telegram + Instagram + WeChat imkoniyatlarini birlashtirgan, end-to-end shifrlangan superilova.
Loyiha ikki qismdan iborat:

- **`backend/`** — Node.js + Express + Socket.io + PostgreSQL (Prisma) + Redis REST/real-time API
- **`mobile/`** — React Native (Expo) + TypeScript mobil ilova

## Arxitektura (masshtab uchun)

- **Media saqlash** — `STORAGE_DRIVER=s3` bilan istalgan S3-mos ombor (MinIO/R2/AWS):
  bir nechta backend replikasi bitta omborni ko'radi, CDN ulash mumkin. `local` drayver
  bitta server uchun diskda saqlaydi. docker-compose'da MinIO tayyor keladi.
- **Gorizontal masshtab** — Socket.io Redis adapter, klasterlararo presence (Redis'da
  ulanishlar soni + TTL heartbeat), barcha fon joblari distributed lock bilan (har
  interval faqat bitta replikada ishlaydi).
- **Kuzatuv** — `GET /metrics` (Prometheus, `METRICS_TOKEN` bilan himoyalangan):
  HTTP latency histogrammasi, socket ulanishlar gauge, jarayon metrikalari.
- **Mobil tezlik** — SQLite kesh (chat ro'yxati + har chatda 300 tagacha xabar) ilovani
  bir zumda va to'liq oflaynda ochadi; xabarlar diskda **shifrlangan holda** saqlanadi.
  Doimiy oflayn outbox: internetsiz yozilgan xabarlar reconnect'da avtomatik ketadi.

## Xavfsizlik (E2E shifrlash)

Har bir foydalanuvchi ro'yxatdan o'tganda qurilmasida X25519 kalit juftligini generatsiya
qiladi (`mobile/src/crypto/e2ee.ts`). **Maxfiy kalit hech qachon qurilmadan chiqmaydi.**
Suhbat kaliti har bir ishtirokchi uchun uning ochiq kaliti bilan o'raladi (`nacl.box`),
xabarlar `nacl.secretbox` bilan shifrlanadi — server faqat shifrlangan baytlarni ko'radi.
Qo'shimcha: bcrypt parol hash, JWT access/refresh rotatsiyasi, 2FA, rate-limiting
(Redis-backed), helmet/CSP/HSTS, zod validatsiya, E2EE kalit zaxirasi (yangi qurilmada
tarixni tiklash), sessiyalarni masofadan uzish.

## Asosiy bo'limlar

- **Suhbatlar (Telegram darajasi)** — 1-1/guruh/kanal, papkalar, reaksiyalar, so'rovnomalar,
  rejalashtirilgan xabarlar, tahrir tarixi, o'chirilgan/tahrirlangan xabarlarni lokal saqlash
  (sozlamalarda, faqat shu qurilmada), lokal xabar qidiruvi, optimistik yuborish + outbox,
  WebRTC audio/video qo'ng'iroqlar, maxfiy chatlar.
- **Reels (Instagram uslubi)** — engagement×yangilik bo'yicha saralangan "Siz uchun" lenta,
  vertikal swipe pleer + keyingi videoni oldindan yuklash, per-user view dedup, share hisobi,
  foydalanuvchi profilida reellar lentasi.
- **Kashfiyot (WeChat uslubi)** — hamyon, bozor, o'yinlar, musiqa, jamiyatlar, jonli efirlar,
  "oxirgi ishlatilganlar" personalizatsiyasi, global qidiruv.
- **Mini-dasturlar** — `window.UzChat` SDK: `getUser()`, `requestPayment()` (nativ tasdiq
  bilan real hamyon to'lovi), `share()`, `openLink()`, `close()`, host tema ranglari.
  Sezgir chaqiriqlar faqat mini-dastur o'z origin'idan qabul qilinadi.
- **Profil** — 2FA, faol seanslar, maxfiylik (last-seen istisnolari bilan), ilova qulfi,
  sozlamalar qidiruvi, ma'lumot eksporti, avto-javob, til tanlash.

## Til (i18n)

23 til: o'zbek (lotin/kirill), rus, ingliz, turk, qozoq, qirg'iz, tojik, ozarbayjon, arab,
fors, hind, urdu, indonez, xitoy, yapon, koreys, nemis, fransuz, ispan, italyan, portugal,
vyetnam. Kalit — o'zbekcha matnning o'zi (`tr("...")`), tarjima topilmasa o'zbekcha qoladi.
Yangi tarjimalar `mobile/src/i18n/strings.ts` ga qo'shiladi. RTL tillar uchun layout ilova
qayta ochilganda qo'llanadi.

## Backend ishga tushirish

```bash
cd backend
cp .env.example .env
docker compose -f ../docker-compose.yml up -d   # PostgreSQL + Redis + MinIO
npm install
npm run prisma:migrate
npm run dev
```

Server `http://localhost:4000` da ishga tushadi (REST + Socket.io). Testlar: `npm test`.

## Mobil ilova ishga tushirish

```bash
cd mobile
npm install
npm run start
```

`EXPO_PUBLIC_API_URL` orqali backend manzilini o'z IP'ingizga moslang (jismoniy qurilmada
`localhost` ishlamaydi).

## Ishlab chiqarishga chiqarish

- `.env.production.example` dagi barcha qiymatlarni to'ldiring (JWT sirlar, MinIO parol,
  Eskiz SMS, METRICS_TOKEN).
- `docker compose up -d --build` — nginx (TLS) + backend + PostgreSQL + Redis + MinIO.
- Mobil: `eas build` (app.json'da bundle id, ruxsat matnlari va deep-link tayyor).

## Keyingi bosqichlar (roadmap)

- Payme/Click/Uzum orqali real hamyon to'ldirish (webhook tasdiqlashi bilan)
- Video transcoding (FFmpeg) + HLS + CDN — reels sifat pog'onalari
- Signal double-ratchet (forward secrecy) va multi-device sessiyalar
- PgBouncer + read-replica, kanallar uchun alohida fan-out xizmati
- i18n lug'atining qolgan qismi va RTL layout sayqali
