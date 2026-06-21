import { describe, it, expect } from "vitest";
import { createPostSchema, createCommentSchema, paginationQuery } from "../modules/feed/feed.schema";
import { createStoreSchema, createProductSchema, createOrderSchema, updateOrderStatusSchema } from "../modules/marketplace/marketplace.schema";
import { createRedPacketSchema } from "../modules/redpackets/redpackets.schema";

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
