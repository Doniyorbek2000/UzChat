import { env } from "../config/env";
import { logger } from "./logger";

interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

let eskizToken: string | null = null;
let eskizTokenExpiresAt = 0;

const ESKIZ_BASE = "https://notify.eskiz.uz/api";

async function getEskizToken(): Promise<string> {
  if (eskizToken && Date.now() < eskizTokenExpiresAt) return eskizToken;

  const res = await fetch(`${ESKIZ_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.sms.eskizEmail, password: env.sms.eskizPassword }),
  });

  if (!res.ok) {
    throw new Error(`Eskiz auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { data?: { token?: string } };
  eskizToken = data.data?.token ?? null;
  eskizTokenExpiresAt = Date.now() + 28 * 24 * 60 * 60 * 1000;
  return eskizToken!;
}

const eskizProvider: SmsProvider = {
  async send(phone: string, message: string) {
    const token = await getEskizToken();
    const cleanPhone = phone.replace(/^\+/, "");

    const res = await fetch(`${ESKIZ_BASE}/message/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile_phone: cleanPhone,
        message,
        from: env.sms.eskizFrom,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Eskiz SMS failed: ${res.status} ${body}`);
    }

    logger.info("SMS sent via Eskiz", { phone: phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4) });
  },
};

const logProvider: SmsProvider = {
  async send(phone: string, message: string) {
    logger.info("SMS (dev mode)", {
      phone: phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4),
      message,
    });
  },
};

export function getSmsProvider(): SmsProvider {
  switch (env.sms.provider) {
    case "eskiz":
      return eskizProvider;
    default:
      return logProvider;
  }
}
