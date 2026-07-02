import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";
import { KeyPair } from "./e2ee";

// Password-encrypted backup of the device E2EE keypair. Uploaded to the
// server as opaque ciphertext so a new device can restore the same keypair
// (and keep decrypting existing conversations) after entering the account
// password. The server never sees the password or the derived key.

// Iterated SHA-512 KDF. tweetnacl has no scrypt/argon2 and expo-crypto has
// no PBKDF2, so this stretches the password the portable way. ~30k rounds
// keeps derivation under a second on typical devices while making offline
// guessing of a leaked backup meaningfully slower.
const KDF_ITERATIONS = 30_000;

export interface KeyBackupPayload {
  ciphertext: string;
  nonce: string;
  salt: string;
}

function deriveBackupKey(password: string, saltB64: string): Uint8Array {
  const salt = decodeBase64(saltB64);
  const passwordBytes = decodeUTF8(password);
  let hash = nacl.hash(concat(passwordBytes, salt));
  for (let i = 1; i < KDF_ITERATIONS; i++) {
    hash = nacl.hash(hash);
  }
  return hash.slice(0, nacl.secretbox.keyLength);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export function encryptKeyBackup(keyPair: KeyPair, password: string): KeyBackupPayload {
  const salt = nacl.randomBytes(16);
  const saltB64 = encodeBase64(salt);
  const key = deriveBackupKey(password, saltB64);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const plaintext = decodeUTF8(JSON.stringify({ publicKey: keyPair.publicKey, privateKey: keyPair.privateKey }));
  const ciphertext = nacl.secretbox(plaintext, nonce, key);
  return { ciphertext: encodeBase64(ciphertext), nonce: encodeBase64(nonce), salt: saltB64 };
}

export function decryptKeyBackup(backup: KeyBackupPayload, password: string): KeyPair {
  const key = deriveBackupKey(password, backup.salt);
  const opened = nacl.secretbox.open(decodeBase64(backup.ciphertext), decodeBase64(backup.nonce), key);
  if (!opened) throw new Error("Kalit zaxirasini ochib bo'lmadi — parol noto'g'ri bo'lishi mumkin");
  const parsed = JSON.parse(encodeUTF8(opened));
  if (!parsed.publicKey || !parsed.privateKey) throw new Error("Zaxira formati noto'g'ri");
  return { publicKey: parsed.publicKey, privateKey: parsed.privateKey };
}
