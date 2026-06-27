import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";
import * as otpModule from "../utils/otp";
import type { Express } from "express";

let app: Express;
const TEST_PHONE = "+998990000001";
const TEST_USERNAME = "testuser_int";
const TEST_PASSWORD = "TestPass123!x";
const FAKE_PUBLIC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const FIXED_OTP = "123456";

vi.spyOn(otpModule, "generateOtpCode").mockReturnValue(FIXED_OTP);

describe("Auth integration", () => {
  beforeAll(async () => {
    app = createApp();
    await prisma.otpCode.deleteMany({ where: { phone: TEST_PHONE } });
    await prisma.otpCode.deleteMany({ where: { phone: "+998990000002" } });
    await prisma.loginAttempt.deleteMany({ where: { phone: TEST_PHONE } });
    await prisma.user.deleteMany({ where: { phone: TEST_PHONE } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: TEST_PHONE } });
    await prisma.$disconnect();
  });

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("dbLatency");
  });

  it("POST /auth/register/request-otp returns 204", async () => {
    const res = await request(app)
      .post("/auth/register/request-otp")
      .send({ phone: TEST_PHONE });
    expect(res.status).toBe(204);
  });

  it("POST /auth/register/verify-otp completes registration", async () => {
    const res = await request(app)
      .post("/auth/register/verify-otp")
      .send({
        phone: TEST_PHONE,
        code: FIXED_OTP,
        username: TEST_USERNAME,
        displayName: "Test User",
        password: TEST_PASSWORD,
        publicKey: FAKE_PUBLIC_KEY,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.user.username).toBe(TEST_USERNAME);
  });

  it("POST /auth/login with correct credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ phone: TEST_PHONE, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
  });

  it("POST /auth/login with wrong password returns 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ phone: TEST_PHONE, password: "WrongPass123!" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("protected route without token returns 401", async () => {
    const res = await request(app).get("/users/me");
    expect(res.status).toBe(401);
  });

  it("protected route with valid token returns 200", async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ phone: TEST_PHONE, password: TEST_PASSWORD });
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(TEST_USERNAME);
  });

  it("POST /auth/refresh rotates tokens", async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ phone: TEST_PHONE, password: TEST_PASSWORD });
    const rt = loginRes.body.refreshToken;

    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: rt });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.refreshToken).not.toBe(rt);
  });

  it("POST /auth/logout revokes session", async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ phone: TEST_PHONE, password: TEST_PASSWORD });

    const res = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: loginRes.body.refreshToken });
    expect(res.status).toBe(204);
  });

  it("rejects invalid phone format", async () => {
    const res = await request(app)
      .post("/auth/register/request-otp")
      .send({ phone: "invalidphone" });
    expect(res.status).toBe(400);
  });

  it("rejects weak password on registration", async () => {
    const phone2 = "+998990000002";
    await prisma.user.deleteMany({ where: { phone: phone2 } });

    await request(app)
      .post("/auth/register/request-otp")
      .send({ phone: phone2 });

    const res = await request(app)
      .post("/auth/register/verify-otp")
      .send({
        phone: phone2,
        code: FIXED_OTP,
        username: "weakpassuser",
        displayName: "Weak",
        password: "weak",
        publicKey: FAKE_PUBLIC_KEY,
      });
    expect(res.status).toBe(400);

    await prisma.otpCode.deleteMany({ where: { phone: phone2 } });
  });
});
