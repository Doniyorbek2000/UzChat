import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLATFORM_APPS = [
  {
    name: "UzTaxi",
    description: "Taksi chaqirish xizmati — tez va qulay. Shahar bo'ylab sayohat qiling.",
    url: "https://uzchat.app/mini/taxi",
    iconUrl: null,
    category: "transport",
  },
  {
    name: "UzHotels",
    description: "O'zbekiston bo'ylab mehmonxonalarni qidiring va band qiling.",
    url: "https://uzchat.app/mini/hotels",
    iconUrl: null,
    category: "travel",
  },
  {
    name: "UzFood",
    description: "Ovqat buyurtma qilish — restoran va kafelardan yetkazib berish.",
    url: "https://uzchat.app/mini/food",
    iconUrl: null,
    category: "food",
  },
  {
    name: "UzDoctor",
    description: "Shifokor bilan onlayn maslahat. Uy qulay sharoitida sog'liqni saqlang.",
    url: "https://uzchat.app/mini/doctor",
    iconUrl: null,
    category: "health",
  },
  {
    name: "UzPharmacy",
    description: "Dorixona — dori-darmonlarni qidiring va buyurtma qiling.",
    url: "https://uzchat.app/mini/pharmacy",
    iconUrl: null,
    category: "health",
  },
  {
    name: "UzShop",
    description: "Onlayn do'kon — turli tovarlarni qulay narxlarda xarid qiling.",
    url: "https://uzchat.app/mini/shop",
    iconUrl: null,
    category: "shopping",
  },
  {
    name: "UzPay",
    description: "To'lovlar va pul o'tkazmalari — tez va xavfsiz.",
    url: "https://uzchat.app/mini/pay",
    iconUrl: null,
    category: "finance",
  },
  {
    name: "UzNews",
    description: "Yangiliklar — O'zbekiston va dunyo yangiliklari bir joyda.",
    url: "https://uzchat.app/mini/news",
    iconUrl: null,
    category: "news",
  },
  {
    name: "UzGames",
    description: "O'yinlar — do'stlaringiz bilan o'ynang va zavqlaning.",
    url: "https://uzchat.app/mini/games",
    iconUrl: null,
    category: "games",
  },
  {
    name: "UzTicket",
    description: "Chipta sotib olish — kontsertlar, kinoteatrlar va tadbirlar.",
    url: "https://uzchat.app/mini/tickets",
    iconUrl: null,
    category: "entertainment",
  },
];

async function main() {
  let systemUser = await prisma.user.findFirst({ where: { username: "uzchat_official" } });

  if (!systemUser) {
    const bcrypt = await import("bcryptjs");
    systemUser = await prisma.user.create({
      data: {
        phone: "+998000000000",
        username: "uzchat_official",
        displayName: "UzChat Platform",
        passwordHash: await bcrypt.hash("system_not_for_login", 10),
        publicKey: "SYSTEM_PLATFORM_KEY",
      },
    });
  }

  for (const app of PLATFORM_APPS) {
    const existing = await prisma.miniApp.findFirst({ where: { name: app.name, creatorId: systemUser.id } });
    if (!existing) {
      await prisma.miniApp.create({
        data: { ...app, creatorId: systemUser.id },
      });
      console.log(`Created: ${app.name}`);
    } else {
      console.log(`Exists: ${app.name}`);
    }
  }
}

main()
  .then(() => console.log("Done"))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
