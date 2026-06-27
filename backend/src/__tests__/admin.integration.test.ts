import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";
import * as otpModule from "../utils/otp";
import type { Express } from "express";

let app: Express;
let adminToken: string;
const ADMIN_PHONE = "+998990000010";
const ADMIN_USERNAME = "admin_test_int";
const ADMIN_PASSWORD = "AdminPass123!x";
const FAKE_PUBLIC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const FIXED_OTP = "123456";

vi.spyOn(otpModule, "generateOtpCode").mockReturnValue(FIXED_OTP);

describe("Admin integration", () => {
  beforeAll(async () => {
    app = createApp();

    await prisma.user.deleteMany({ where: { phone: ADMIN_PHONE } });

    await request(app)
      .post("/auth/register/request-otp")
      .send({ phone: ADMIN_PHONE });

    await request(app)
      .post("/auth/register/verify-otp")
      .send({
        phone: ADMIN_PHONE,
        code: FIXED_OTP,
        username: ADMIN_USERNAME,
        displayName: "Admin Test",
        password: ADMIN_PASSWORD,
        publicKey: FAKE_PUBLIC_KEY,
      });

    await prisma.user.update({
      where: { phone: ADMIN_PHONE },
      data: { isAdmin: true },
    });

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD });
    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: ADMIN_PHONE } });
    await prisma.$disconnect();
  });

  it("GET /admin/dashboard returns stats", async () => {
    const res = await request(app)
      .get("/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(res.body).toHaveProperty("conversations");
    expect(res.body).toHaveProperty("messages");
    expect(res.body.users).toHaveProperty("total");
    expect(res.body.users).toHaveProperty("newToday");
  });

  it("GET /admin/health returns system info", async () => {
    const res = await request(app)
      .get("/admin/health")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("dbLatencyMs");
  });

  it("GET /admin/users lists users with pagination", async () => {
    const res = await request(app)
      .get("/admin/users?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("totalPages");
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it("GET /admin/users with search", async () => {
    const res = await request(app)
      .get(`/admin/users?search=${ADMIN_USERNAME}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThan(0);
  });

  it("GET /admin/content-stats returns counts", async () => {
    const res = await request(app)
      .get("/admin/content-stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("posts");
    expect(res.body).toHaveProperty("reels");
    expect(res.body).toHaveProperty("stories");
    expect(res.body).toHaveProperty("pendingReports");
  });

  it("GET /admin/posts lists posts", async () => {
    const res = await request(app)
      .get("/admin/posts?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("posts");
    expect(Array.isArray(res.body.posts)).toBe(true);
  });

  it("GET /admin/reels lists reels", async () => {
    const res = await request(app)
      .get("/admin/reels?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("reels");
  });

  it("GET /admin/stories lists stories", async () => {
    const res = await request(app)
      .get("/admin/stories?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stories");
  });

  it("GET /admin/audit-log returns audit entries", async () => {
    const res = await request(app)
      .get("/admin/audit-log?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("logs");
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  it("GET /admin/login-attempts returns login history", async () => {
    const res = await request(app)
      .get("/admin/login-attempts?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("attempts");
  });

  it("non-admin user cannot access admin endpoints", async () => {
    const phone = "+998990000011";
    await prisma.user.deleteMany({ where: { phone } });

    await request(app)
      .post("/auth/register/request-otp")
      .send({ phone });
    await request(app)
      .post("/auth/register/verify-otp")
      .send({ phone, code: FIXED_OTP, username: "nonadmin_int", displayName: "NonAdmin", password: "NonAdmin123!x", publicKey: FAKE_PUBLIC_KEY });

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ phone, password: "NonAdmin123!x" });

    const res = await request(app)
      .get("/admin/dashboard")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);
    expect(res.status).toBe(403);

    await prisma.user.deleteMany({ where: { phone } });
  });
});
