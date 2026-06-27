import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";
import * as otpModule from "../utils/otp";
import type { Express } from "express";

let app: Express;
let token: string;
let userId: string;
let postId: string;
let commentId: string;

const TEST_PHONE = "+998990000030";
const TEST_USERNAME = "feeduser_int";
const PASSWORD = "TestPass123!x";
const FAKE_PUBLIC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const FIXED_OTP = "123456";

vi.spyOn(otpModule, "generateOtpCode").mockReturnValue(FIXED_OTP);

describe("Feed integration", () => {
  beforeAll(async () => {
    app = createApp();
    await prisma.user.deleteMany({ where: { phone: TEST_PHONE } });

    await request(app).post("/auth/register/request-otp").send({ phone: TEST_PHONE });
    await request(app).post("/auth/register/verify-otp").send({
      phone: TEST_PHONE,
      code: FIXED_OTP,
      username: TEST_USERNAME,
      displayName: "Feed User",
      password: PASSWORD,
      publicKey: FAKE_PUBLIC_KEY,
    });
    const loginRes = await request(app).post("/auth/login").send({ phone: TEST_PHONE, password: PASSWORD });
    token = loginRes.body.accessToken;
    const user = await prisma.user.findUnique({ where: { phone: TEST_PHONE }, select: { id: true } });
    userId = user!.id;
  });

  afterAll(async () => {
    if (postId) {
      await prisma.postComment.deleteMany({ where: { postId } });
      await prisma.postLike.deleteMany({ where: { postId } });
      await prisma.post.deleteMany({ where: { id: postId } });
    }
    await prisma.post.deleteMany({ where: { userId } });
    await prisma.searchHistory.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { phone: TEST_PHONE } });
    await prisma.$disconnect();
  });

  it("POST /feed creates a post", async () => {
    const res = await request(app)
      .post("/feed")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Bu test post" });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Bu test post");
    expect(res.body.user.username).toBe(TEST_USERNAME);
    postId = res.body.id;
  });

  it("GET /feed returns feed with the post", async () => {
    const res = await request(app)
      .get("/feed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.posts).toBeDefined();
    expect(res.body.posts.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /feed/user/:userId returns user posts", async () => {
    const res = await request(app)
      .get(`/feed/user/${userId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.posts[0].user.id).toBe(userId);
  });

  it("POST /feed/:postId/like likes a post", async () => {
    const res = await request(app)
      .post(`/feed/${postId}/like`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(true);
  });

  it("DELETE /feed/:postId/like unlikes a post", async () => {
    const res = await request(app)
      .delete(`/feed/${postId}/like`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(false);
  });

  it("POST /feed/:postId/comments adds comment", async () => {
    const res = await request(app)
      .post(`/feed/${postId}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Test izoh" });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Test izoh");
    commentId = res.body.id;
  });

  it("GET /feed/:postId/comments lists comments", async () => {
    const res = await request(app)
      .get(`/feed/${postId}/comments`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.comments.length).toBeGreaterThanOrEqual(1);
  });

  it("DELETE /feed/comments/:commentId removes comment", async () => {
    const res = await request(app)
      .delete(`/feed/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it("rejects post without content or media", async () => {
    const res = await request(app)
      .post("/feed")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("DELETE /feed/:postId deletes post", async () => {
    const extraPost = await request(app)
      .post("/feed")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "O'chiriladigan post" });
    const res = await request(app)
      .delete(`/feed/${extraPost.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it("unauthenticated cannot post", async () => {
    const res = await request(app)
      .post("/feed")
      .send({ content: "Unauthorized post" });
    expect(res.status).toBe(401);
  });

  it("GET /users/me returns profile", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(TEST_USERNAME);
    expect(res.body).toHaveProperty("displayName");
    expect(res.body).toHaveProperty("phone");
  });

  it("PATCH /users/me updates profile", async () => {
    const res = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ bio: "Test bio yangilandi" });
    expect(res.status).toBe(200);
    expect(res.body.bio).toBe("Test bio yangilandi");
  });
});
