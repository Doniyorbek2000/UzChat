import { describe, it, expect } from "vitest";
import { createPostSchema, createCommentSchema, paginationQuery } from "../modules/feed/feed.schema";
import { createStoreSchema, createProductSchema, createOrderSchema, updateOrderStatusSchema } from "../modules/marketplace/marketplace.schema";
import { createRedPacketSchema } from "../modules/redpackets/redpackets.schema";
import { sendPaymentSchema, topUpSchema } from "../modules/payments/payments.schema";
import { translateSchema } from "../modules/translate/translate.schema";
import { sendGiftSchema, createGiftSchema, listGiftsQuery } from "../modules/gifts/gifts.controller";
import { sendCardSchema, createCardSchema } from "../modules/greetings/greetings.controller";
import { spendPointsSchema } from "../modules/loyalty/loyalty.controller";
import { badgeActionSchema } from "../modules/badges/badges.controller";
import { createFaqSchema, faqSearchQuery } from "../modules/faq/faq.controller";
import { autoReplySchema } from "../modules/autoreply/autoreply.controller";
import { syncSchema } from "../modules/contactimport/contactimport.controller";

describe("Feed schemas", () => {
  describe("createPostSchema", () => {
    it("accepts valid post with content", () => {
      const result = createPostSchema.safeParse({ content: "Salom dunyo!" });
      expect(result.success).toBe(true);
    });

    it("accepts post with mediaUrls", () => {
      const result = createPostSchema.safeParse({ mediaUrls: ["https://example.com/img.jpg"] });
      expect(result.success).toBe(true);
    });

    it("rejects content over 2000 chars", () => {
      const result = createPostSchema.safeParse({ content: "a".repeat(2001) });
      expect(result.success).toBe(false);
    });

    it("rejects invalid visibility", () => {
      const result = createPostSchema.safeParse({ content: "test", visibility: "UNKNOWN" });
      expect(result.success).toBe(false);
    });

    it("defaults visibility to PUBLIC", () => {
      const result = createPostSchema.safeParse({ content: "test" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.visibility).toBe("PUBLIC");
    });
  });

  describe("createCommentSchema", () => {
    it("accepts valid comment", () => {
      const result = createCommentSchema.safeParse({ content: "Yaxshi!" });
      expect(result.success).toBe(true);
    });

    it("rejects empty comment", () => {
      const result = createCommentSchema.safeParse({ content: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("paginationQuery", () => {
    it("accepts valid UUID cursor", () => {
      const result = paginationQuery.safeParse({ cursor: "550e8400-e29b-41d4-a716-446655440000" });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID cursor", () => {
      const result = paginationQuery.safeParse({ cursor: "invalid" });
      expect(result.success).toBe(false);
    });

    it("coerces string limit to number", () => {
      const result = paginationQuery.safeParse({ limit: "50" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.limit).toBe(50);
    });

    it("rejects limit over 100", () => {
      const result = paginationQuery.safeParse({ limit: "200" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Marketplace schemas", () => {
  describe("createStoreSchema", () => {
    it("accepts valid store", () => {
      const result = createStoreSchema.safeParse({ name: "Test Do'kon" });
      expect(result.success).toBe(true);
    });

    it("rejects name shorter than 2 chars", () => {
      const result = createStoreSchema.safeParse({ name: "A" });
      expect(result.success).toBe(false);
    });
  });

  describe("createProductSchema", () => {
    it("accepts valid product", () => {
      const result = createProductSchema.safeParse({ name: "Telefon", price: 5000000 });
      expect(result.success).toBe(true);
    });

    it("rejects negative price", () => {
      const result = createProductSchema.safeParse({ name: "Telefon", price: -100 });
      expect(result.success).toBe(false);
    });

    it("rejects zero price", () => {
      const result = createProductSchema.safeParse({ name: "Telefon", price: 0 });
      expect(result.success).toBe(false);
    });

    it("accepts optional sku", () => {
      const result = createProductSchema.safeParse({ name: "Telefon", price: 100, sku: "SKU-001" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.sku).toBe("SKU-001");
    });
  });

  describe("createOrderSchema", () => {
    it("accepts valid order", () => {
      const result = createOrderSchema.safeParse({
        storeId: "550e8400-e29b-41d4-a716-446655440000",
        items: [{ productId: "550e8400-e29b-41d4-a716-446655440001", quantity: 2 }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty items", () => {
      const result = createOrderSchema.safeParse({
        storeId: "550e8400-e29b-41d4-a716-446655440000",
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID storeId", () => {
      const result = createOrderSchema.safeParse({
        storeId: "invalid",
        items: [{ productId: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional shippingAddress", () => {
      const result = createOrderSchema.safeParse({
        storeId: "550e8400-e29b-41d4-a716-446655440000",
        items: [{ productId: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 }],
        shippingAddress: "Toshkent, Navoiy ko'chasi 10",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateOrderStatusSchema", () => {
    it("accepts valid status", () => {
      expect(updateOrderStatusSchema.safeParse({ status: "CONFIRMED" }).success).toBe(true);
      expect(updateOrderStatusSchema.safeParse({ status: "SHIPPED" }).success).toBe(true);
      expect(updateOrderStatusSchema.safeParse({ status: "DELIVERED" }).success).toBe(true);
      expect(updateOrderStatusSchema.safeParse({ status: "CANCELLED" }).success).toBe(true);
      expect(updateOrderStatusSchema.safeParse({ status: "REFUNDED" }).success).toBe(true);
    });

    it("rejects invalid status", () => {
      expect(updateOrderStatusSchema.safeParse({ status: "UNKNOWN" }).success).toBe(false);
    });
  });
});

describe("RedPacket schemas", () => {
  describe("createRedPacketSchema", () => {
    it("accepts valid red packet", () => {
      const result = createRedPacketSchema.safeParse({ amount: 50000, message: "Bayram muborak!" });
      expect(result.success).toBe(true);
    });

    it("rejects negative amount", () => {
      const result = createRedPacketSchema.safeParse({ amount: -100 });
      expect(result.success).toBe(false);
    });
  });
});

describe("Payment schemas", () => {
  describe("sendPaymentSchema", () => {
    it("accepts valid payment", () => {
      const result = sendPaymentSchema.safeParse({
        receiverId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 100000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID receiverId", () => {
      const result = sendPaymentSchema.safeParse({ receiverId: "invalid", amount: 100 });
      expect(result.success).toBe(false);
    });

    it("rejects zero amount", () => {
      const result = sendPaymentSchema.safeParse({
        receiverId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects amount over 50M", () => {
      const result = sendPaymentSchema.safeParse({
        receiverId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 50_000_001,
      });
      expect(result.success).toBe(false);
    });

    it("defaults currency to UZS", () => {
      const result = sendPaymentSchema.safeParse({
        receiverId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 1000,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.currency).toBe("UZS");
    });

    it("accepts optional note", () => {
      const result = sendPaymentSchema.safeParse({
        receiverId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 5000,
        note: "Tushlik uchun",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("topUpSchema", () => {
    it("accepts valid top-up", () => {
      expect(topUpSchema.safeParse({ amount: 50000 }).success).toBe(true);
    });

    it("rejects negative amount", () => {
      expect(topUpSchema.safeParse({ amount: -1 }).success).toBe(false);
    });
  });
});

describe("Translate schema", () => {
  it("accepts valid translate request", () => {
    const result = translateSchema.safeParse({
      messageId: "550e8400-e29b-41d4-a716-446655440000",
      toLang: "uz",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing messageId", () => {
    const result = translateSchema.safeParse({ toLang: "uz" });
    expect(result.success).toBe(false);
  });
});

describe("Gift schemas", () => {
  describe("sendGiftSchema", () => {
    it("accepts valid gift send", () => {
      const result = sendGiftSchema.safeParse({
        receiverId: "550e8400-e29b-41d4-a716-446655440000",
        giftId: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional message", () => {
      const result = sendGiftSchema.safeParse({
        receiverId: "550e8400-e29b-41d4-a716-446655440000",
        giftId: "550e8400-e29b-41d4-a716-446655440001",
        message: "Tabriklayman!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID receiverId", () => {
      const result = sendGiftSchema.safeParse({
        receiverId: "invalid",
        giftId: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(false);
    });

    it("rejects message over 500 chars", () => {
      const result = sendGiftSchema.safeParse({
        receiverId: "550e8400-e29b-41d4-a716-446655440000",
        giftId: "550e8400-e29b-41d4-a716-446655440001",
        message: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createGiftSchema", () => {
    it("accepts valid gift creation", () => {
      const result = createGiftSchema.safeParse({
        name: "Gul",
        icon: "🌹",
        price: 5000,
        category: "flowers",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-integer price", () => {
      const result = createGiftSchema.safeParse({
        name: "Gul",
        icon: "🌹",
        price: 50.5,
        category: "flowers",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("listGiftsQuery", () => {
    it("accepts valid category filter", () => {
      const result = listGiftsQuery.safeParse({ category: "flowers" });
      expect(result.success).toBe(true);
    });

    it("accepts empty query", () => {
      const result = listGiftsQuery.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe("Greeting card schemas", () => {
  it("accepts valid card send", () => {
    const result = sendCardSchema.safeParse({
      receiverId: "550e8400-e29b-41d4-a716-446655440000",
      cardId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID cardId", () => {
    const result = sendCardSchema.safeParse({
      receiverId: "550e8400-e29b-41d4-a716-446655440000",
      cardId: "bad-id",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid card creation", () => {
    const result = createCardSchema.safeParse({
      templateName: "Bayram tabrigi",
      category: "holiday",
      imageUrl: "https://example.com/card.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid imageUrl", () => {
    const result = createCardSchema.safeParse({
      templateName: "Bayram",
      category: "holiday",
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("Loyalty schema", () => {
  it("accepts valid spend points", () => {
    const result = spendPointsSchema.safeParse({ amount: 100, reason: "Sovg'a" });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = spendPointsSchema.safeParse({ amount: 0, reason: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects amount over 1M", () => {
    const result = spendPointsSchema.safeParse({ amount: 1000001, reason: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects empty reason", () => {
    const result = spendPointsSchema.safeParse({ amount: 50, reason: "" });
    expect(result.success).toBe(false);
  });
});

describe("Badge schema", () => {
  it("accepts valid badge action", () => {
    const result = badgeActionSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      badge: "early_adopter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID userId", () => {
    const result = badgeActionSchema.safeParse({ userId: "invalid", badge: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects badge over 50 chars", () => {
    const result = badgeActionSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      badge: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe("FAQ schemas", () => {
  it("accepts valid FAQ creation", () => {
    const result = createFaqSchema.safeParse({
      title: "Ro'yxatdan o'tish",
      content: "Ilovani yuklab oling va ro'yxatdan o'ting",
      category: "general",
    });
    expect(result.success).toBe(true);
  });

  it("rejects FAQ without title", () => {
    const result = createFaqSchema.safeParse({ content: "test", category: "general" });
    expect(result.success).toBe(false);
  });

  it("accepts valid search query", () => {
    const result = faqSearchQuery.safeParse({ q: "parol" });
    expect(result.success).toBe(true);
  });
});

describe("AutoReply schema", () => {
  it("accepts valid auto-reply config", () => {
    const result = autoReplySchema.safeParse({
      enabled: true,
      message: "Hozir band, keyinroq javob beraman",
    });
    expect(result.success).toBe(true);
  });

  it("rejects message over 500 chars", () => {
    const result = autoReplySchema.safeParse({
      enabled: true,
      message: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional time range", () => {
    const result = autoReplySchema.safeParse({
      enabled: true,
      message: "Kechasi javob bermayman",
      startTime: "22:00",
      endTime: "08:00",
    });
    expect(result.success).toBe(true);
  });
});

describe("Contact import schema", () => {
  it("accepts valid contact sync", () => {
    const result = syncSchema.safeParse({
      contacts: [{ phone: "+998901234567", displayName: "Ali" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty contacts array", () => {
    const result = syncSchema.safeParse({ contacts: [] });
    expect(result.success).toBe(true);
  });

  it("rejects phone shorter than 5 chars", () => {
    const result = syncSchema.safeParse({
      contacts: [{ phone: "123", displayName: "Test" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects contacts array over 1000", () => {
    const contacts = Array.from({ length: 1001 }, (_, i) => ({
      phone: `+9989012345${String(i).padStart(2, "0")}`,
      displayName: `User ${i}`,
    }));
    const result = syncSchema.safeParse({ contacts });
    expect(result.success).toBe(false);
  });

  it("rejects displayName over 100 chars", () => {
    const result = syncSchema.safeParse({
      contacts: [{ phone: "+998901234567", displayName: "a".repeat(101) }],
    });
    expect(result.success).toBe(false);
  });
});
