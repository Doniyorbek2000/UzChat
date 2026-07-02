import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";
import * as otpModule from "../utils/otp";
import type { Express } from "express";

let app: Express;
let accessToken: string;
let userId: string;

const TEST_PHONE = "+998990000077";
const TEST_USERNAME = "keybackup_int";
const TEST_PASSWORD = "TestPass123!x";
const PUBLIC_KEY = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";
const ROTATED_KEY = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=";
const FIXED_OTP = "123456";

vi.spyOn(otpModule, "generateOtpCode").mockReturnValue(FIXED_OTP);

describe("E2EE key backup", () => {
  beforeAll(async () => {
    app = createApp();
    await prisma.otpCode.deleteMany({ where: { phone: TEST_PHONE } });
    await prisma.user.deleteMany({ where: { phone: TEST_PHONE } });

    await request(app).post("/auth/register/request-otp").send({ phone: TEST_PHONE });
    const res = await request(app).post("/auth/register/verify-otp").send({
      phone: TEST_PHONE,
      code: FIXED_OTP,
      username: TEST_USERNAME,
      displayName: "Key Backup Test",
      password: TEST_PASSWORD,
      publicKey: PUBLIC_KEY,
    });
    accessToken = res.body.accessToken;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: TEST_PHONE } });
    await prisma.$disconnect();
  });

  it("GET /devices/key-backup returns 404 before any backup exists", async () => {
    const res = await request(app)
      .get("/devices/key-backup")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it("PUT /devices/key-backup stores the backup", async () => {
    const res = await request(app)
      .put("/devices/key-backup")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ciphertext: "enc-payload-1", nonce: "nonce-1", salt: "salt-1" });
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);
  });

  it("GET /devices/key-backup returns the stored backup", async () => {
    const res = await request(app)
      .get("/devices/key-backup")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ciphertext).toBe("enc-payload-1");
    expect(res.body.nonce).toBe("nonce-1");
    expect(res.body.salt).toBe("salt-1");
  });

  it("PUT /devices/key-backup upserts (overwrites) an existing backup", async () => {
    await request(app)
      .put("/devices/key-backup")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ciphertext: "enc-payload-2", nonce: "nonce-2", salt: "salt-2" });
    const res = await request(app)
      .get("/devices/key-backup")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.body.ciphertext).toBe("enc-payload-2");
  });

  it("rejects unauthenticated access", async () => {
    const res = await request(app).get("/devices/key-backup");
    expect(res.status).toBe(401);
  });

  it("POST /devices/rotate-public-key updates the account public key", async () => {
    const res = await request(app)
      .post("/devices/rotate-public-key")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ publicKey: ROTATED_KEY });
    expect(res.status).toBe(200);
    expect(res.body.rotated).toBe(true);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { publicKey: true } });
    expect(user?.publicKey).toBe(ROTATED_KEY);
  });

  it("backup is deleted with the user (cascade)", async () => {
    const backup = await prisma.encryptedKeyBackup.findUnique({ where: { userId } });
    expect(backup).not.toBeNull();
    await prisma.user.delete({ where: { id: userId } });
    const after = await prisma.encryptedKeyBackup.findUnique({ where: { userId } });
    expect(after).toBeNull();
  });
});
