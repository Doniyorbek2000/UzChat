import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";
import * as otpModule from "../utils/otp";
import * as socketsModule from "../sockets";
import type { Express } from "express";

const mockEmit = vi.fn().mockReturnThis();
const mockTo = vi.fn().mockReturnValue({ emit: mockEmit, socketsJoin: vi.fn(), except: vi.fn().mockReturnValue({ emit: mockEmit }) });
const mockIo = { to: mockTo, in: vi.fn().mockReturnValue({ disconnectSockets: vi.fn() }), sockets: { adapter: { rooms: new Map() } } } as any;
vi.spyOn(socketsModule, "getIo").mockReturnValue(mockIo);
vi.spyOn(socketsModule, "isUserOnline").mockResolvedValue(false);
vi.spyOn(socketsModule, "filterOnlineUsers").mockResolvedValue(new Set());

let app: Express;
let tokenA: string;
let tokenB: string;
let userAId: string;
let userBId: string;
let conversationId: string;

const PHONE_A = "+998990000020";
const PHONE_B = "+998990000021";
const USER_A = "chatuser_a";
const USER_B = "chatuser_b";
const PASSWORD = "TestPass123!x";
const FAKE_PUBLIC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const FAKE_WRAPPED_KEY = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";
const FAKE_WRAPPED_NONCE = "CCCCCCCCCCCCCCCCCCCCCCCCC=";
const FIXED_OTP = "123456";

vi.spyOn(otpModule, "generateOtpCode").mockReturnValue(FIXED_OTP);

async function registerAndLogin(phone: string, username: string): Promise<{ token: string; userId: string }> {
  await request(app).post("/auth/register/request-otp").send({ phone });
  await request(app).post("/auth/register/verify-otp").send({
    phone,
    code: FIXED_OTP,
    username,
    displayName: username,
    password: PASSWORD,
    publicKey: FAKE_PUBLIC_KEY,
  });
  const loginRes = await request(app).post("/auth/login").send({ phone, password: PASSWORD });
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  return { token: loginRes.body.accessToken, userId: user!.id };
}

describe("Chat integration", () => {
  beforeAll(async () => {
    app = createApp();
    await prisma.user.deleteMany({ where: { phone: { in: [PHONE_A, PHONE_B] } } });

    const a = await registerAndLogin(PHONE_A, USER_A);
    const b = await registerAndLogin(PHONE_B, USER_B);
    tokenA = a.token;
    tokenB = b.token;
    userAId = a.userId;
    userBId = b.userId;
  });

  afterAll(async () => {
    if (conversationId) {
      await prisma.message.deleteMany({ where: { conversationId } });
      await prisma.conversationParticipant.deleteMany({ where: { conversationId } });
      await prisma.conversation.deleteMany({ where: { id: conversationId } });
    }
    await prisma.user.deleteMany({ where: { phone: { in: [PHONE_A, PHONE_B] } } });
    await prisma.$disconnect();
  });

  it("POST /conversations creates a DIRECT chat", async () => {
    const res = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        type: "DIRECT",
        keySenderPublicKey: FAKE_PUBLIC_KEY,
        participants: [
          { userId: userAId, wrappedKey: FAKE_WRAPPED_KEY, wrappedKeyNonce: FAKE_WRAPPED_NONCE },
          { userId: userBId, wrappedKey: FAKE_WRAPPED_KEY, wrappedKeyNonce: FAKE_WRAPPED_NONCE },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("DIRECT");
    expect(res.body.participants.length).toBe(2);
    conversationId = res.body.id;
  });

  it("GET /conversations lists conversations", async () => {
    const res = await request(app)
      .get("/conversations")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.some((c: any) => c.id === conversationId)).toBe(true);
  });

  it("GET /conversations/:id returns the conversation", async () => {
    const res = await request(app)
      .get(`/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(conversationId);
  });

  it("POST /conversations/:id/messages sends a message", async () => {
    const res = await request(app)
      .post(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ type: "TEXT", ciphertext: "dGVzdCBtZXNzYWdl", nonce: "dGVzdG5vbmNlMTIzNDU2Nzg5MDEyMzQ1" });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("TEXT");
    expect(res.body.senderId).toBe(userAId);
  });

  it("GET /conversations/:id/messages lists messages", async () => {
    const res = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("other participant can see the conversation", async () => {
    const res = await request(app)
      .get(`/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(conversationId);
  });

  it("other participant can read messages", async () => {
    const res = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("POST mark read returns 204", async () => {
    const msgRes = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${tokenB}`);
    const lastMsg = msgRes.body[0];

    const res = await request(app)
      .post(`/conversations/${conversationId}/read`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ upToMessageId: lastMsg.id });
    expect(res.status).toBe(204);
  });

  it("POST /conversations creates a GROUP", async () => {
    const res = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        type: "GROUP",
        title: "Test guruh",
        keySenderPublicKey: FAKE_PUBLIC_KEY,
        participants: [
          { userId: userAId, wrappedKey: FAKE_WRAPPED_KEY, wrappedKeyNonce: FAKE_WRAPPED_NONCE },
          { userId: userBId, wrappedKey: FAKE_WRAPPED_KEY, wrappedKeyNonce: FAKE_WRAPPED_NONCE },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("GROUP");
    expect(res.body.title).toBe("Test guruh");

    await prisma.message.deleteMany({ where: { conversationId: res.body.id } });
    await prisma.conversationParticipant.deleteMany({ where: { conversationId: res.body.id } });
    await prisma.conversation.deleteMany({ where: { id: res.body.id } });
  });

  it("unauthorized user cannot access conversation", async () => {
    const res = await request(app)
      .get(`/conversations/${conversationId}`);
    expect(res.status).toBe(401);
  });

  it("search users returns results", async () => {
    const res = await request(app)
      .get("/search?q=chatuser")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
  });

  it("search history is saved and retrievable", async () => {
    const res = await request(app)
      .get("/search/history")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("DELETE /search/history clears history", async () => {
    const res = await request(app)
      .delete("/search/history")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(204);
  });
});
