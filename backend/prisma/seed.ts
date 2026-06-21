import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("UzChat2024!", 12);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      id: crypto.randomUUID(),
      username: "admin",
      displayName: "UzChat Admin",
      phone: "+998900000001",
      passwordHash,
      publicKey: crypto.randomBytes(32).toString("base64"),
      isAdmin: true,
      isVerified: true,
      verifiedType: "official",
    },
  });
  console.log(`  Admin user: @${admin.username} (${admin.id})`);

  // System user for platform services
  const system = await prisma.user.upsert({
    where: { username: "uzchat_official" },
    update: {},
    create: {
      id: crypto.randomUUID(),
      username: "uzchat_official",
      displayName: "UzChat Rasmiy",
      phone: "+998900000000",
      passwordHash,
      publicKey: crypto.randomBytes(32).toString("base64"),
      isVerified: true,
      verifiedType: "official",
    },
  });
  console.log(`  System user: @${system.username} (${system.id})`);

  // Demo users
  const demoUsers = [
    { username: "aziz", displayName: "Aziz Karimov", phone: "+998901111111" },
    { username: "dilnoza", displayName: "Dilnoza Rahimova", phone: "+998902222222" },
    { username: "sardor", displayName: "Sardor Toshmatov", phone: "+998903333333" },
    { username: "malika", displayName: "Malika Umarova", phone: "+998904444444" },
    { username: "jamshid", displayName: "Jamshid Aliyev", phone: "+998905555555" },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        id: crypto.randomUUID(),
        username: u.username,
        displayName: u.displayName,
        phone: u.phone,
        passwordHash,
        publicKey: crypto.randomBytes(32).toString("base64"),
      },
    });
  }
  console.log(`  ${demoUsers.length} demo users created`);

  // Mini-apps
  const miniApps = [
    { name: "UzTaxi", description: "Taksi chaqirish xizmati", url: "https://uzchat.app/mini/taxi", category: "transport" },
    { name: "UzHotels", description: "Mehmonxonalarni qidiring va band qiling", url: "https://uzchat.app/mini/hotels", category: "travel" },
    { name: "UzFood", description: "Ovqat buyurtma qilish xizmati", url: "https://uzchat.app/mini/food", category: "food" },
    { name: "UzDoctor", description: "Shifokor bilan onlayn maslahat", url: "https://uzchat.app/mini/doctor", category: "health" },
    { name: "UzPharmacy", description: "Dori-darmonlar yetkazib berish", url: "https://uzchat.app/mini/pharmacy", category: "health" },
    { name: "UzShop", description: "Onlayn do'kon va xaridlar", url: "https://uzchat.app/mini/shop", category: "shopping" },
    { name: "UzPay", description: "To'lov tizimi va pul o'tkazmalari", url: "https://uzchat.app/mini/pay", category: "finance" },
    { name: "UzNews", description: "So'nggi yangiliklar va voqealar", url: "https://uzchat.app/mini/news", category: "news" },
    { name: "UzGames", description: "O'yinlar va o'yin-kulgilar", url: "https://uzchat.app/mini/games", category: "games" },
    { name: "UzTicket", description: "Chipta va tadbirlarni band qiling", url: "https://uzchat.app/mini/ticket", category: "entertainment" },
  ];

  for (const app of miniApps) {
    await prisma.miniApp.upsert({
      where: { id: app.name.toLowerCase() },
      update: {},
      create: {
        id: app.name.toLowerCase(),
        developerId: system.id,
        name: app.name,
        description: app.description,
        url: app.url,
        category: app.category,
        isActive: true,
      },
    });
  }
  console.log(`  ${miniApps.length} mini-apps created`);

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
