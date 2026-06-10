# UzChat

WeChat-uslubidagi, end-to-end shifrlangan messenger. Loyiha ikki qismdan iborat:

- **`backend/`** — Node.js + Express + Socket.io + PostgreSQL (Prisma) REST/real-time API
- **`mobile/`** — React Native (Expo) + TypeScript mobil ilova

## Xavfsizlik (E2E shifrlash)

Har bir foydalanuvchi ro'yxatdan o'tganda qurilmasida X25519 kalit juftligini generatsiya qiladi
(`mobile/src/crypto/e2ee.ts`). **Maxfiy kalit hech qachon qurilmadan chiqmaydi** — faqat ochiq kalit
serverga yuboriladi.

Suhbat yaratilganda tasodifiy simmetrik kalit generatsiya qilinadi va har bir ishtirokchi uchun uning
ochiq kaliti bilan o'raladi (`nacl.box`). Xabarlar shu simmetrik kalit bilan `nacl.secretbox` orqali
shifrlanadi. Server faqat shifrlangan baytlarni saqlaydi va uzatadi — xabar matnini hech qachon
o'qiy olmaydi.

Qo'shimcha choralar: bcrypt parol hash, JWT access/refresh tokenlar (refresh tokenlar bazada
saqlanadi va rotatsiya qilinadi), rate-limiting, helmet, CORS, zod orqali input validatsiya.

## Backend ishga tushirish

```bash
cd backend
cp .env.example .env
docker compose -f ../docker-compose.yml up -d   # local PostgreSQL
npm install
npm run prisma:migrate
npm run dev
```

Server `http://localhost:4000` da ishga tushadi (REST + Socket.io).

## Mobil ilova ishga tushirish

```bash
cd mobile
npm install
npm run start
```

`src/config/env.ts` faylida (yoki `EXPO_PUBLIC_API_URL` env o'zgaruvchisi orqali) backend manzilini
o'z IP'ingizga moslang (jismoniy qurilmada test qilish uchun `localhost` ishlamaydi).

## Joriy funksiyalar (MVP)

- Telefon raqam + SMS-OTP orqali ro'yxatdan o'tish, login/refresh/logout
- Profil (ism, bio, avatar)
- Kontaktlar: username bo'yicha qo'shish, so'rovlarni qabul qilish/rad etish
- 1-1 va guruh suhbatlar, real-time xabar almashish (Socket.io)
- End-to-end shifrlangan matnli xabarlar, "yozmoqda...", o'qildi belgilari, online holat

## Keyingi bosqichlar (roadmap)

- Ovozli/video qo'ng'iroqlar (WebRTC)
- Media (rasm/video/fayl) uchun shifrlangan fayl saqlash (S3-mos)
- "Moments" — ijtimoiy lenta
- To'lov tizimi (WeChat Pay uslubida)
- Mini Programs platformasi
- Push bildirishnomalar
- Multi-device E2EE (kalitlarni qurilmalar orasida sinxronlash)
