import "react-native-get-random-values";
import nacl from "tweetnacl";
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from "tweetnacl-util";

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface WrappedKey {
  wrappedKey: string;
  wrappedKeyNonce: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
}

/** Generates a new X25519 keypair for this device. The private key never leaves the device. */
export function generateKeyPair(): KeyPair {
  const pair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(pair.publicKey),
    privateKey: encodeBase64(pair.secretKey),
  };
}

/** Generates a new random symmetric key used to encrypt messages within a conversation. */
export function generateConversationKey(): string {
  return encodeBase64(nacl.randomBytes(nacl.secretbox.keyLength));
}

/** Encrypts a conversation key for a specific recipient using their public key (NaCl box). */
export function wrapConversationKey(
  conversationKey: string,
  recipientPublicKey: string,
  senderPrivateKey: string
): WrappedKey {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const sealed = nacl.box(
    decodeBase64(conversationKey),
    nonce,
    decodeBase64(recipientPublicKey),
    decodeBase64(senderPrivateKey)
  );
  return { wrappedKey: encodeBase64(sealed), wrappedKeyNonce: encodeBase64(nonce) };
}

/** Decrypts a conversation key that was wrapped for this user. */
export function unwrapConversationKey(
  wrappedKey: string,
  wrappedKeyNonce: string,
  senderPublicKey: string,
  recipientPrivateKey: string
): string {
  const opened = nacl.box.open(
    decodeBase64(wrappedKey),
    decodeBase64(wrappedKeyNonce),
    decodeBase64(senderPublicKey),
    decodeBase64(recipientPrivateKey)
  );
  if (!opened) throw new Error("Suhbat kalitini ochib bo'lmadi");
  return encodeBase64(opened);
}

/** Encrypts a plaintext message with the conversation's shared symmetric key. */
export function encryptMessage(plaintext: string, conversationKey: string): EncryptedPayload {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(decodeUTF8(plaintext), nonce, decodeBase64(conversationKey));
  return { ciphertext: encodeBase64(ciphertext), nonce: encodeBase64(nonce) };
}

/** Decrypts a message with the conversation's shared symmetric key. */
export function decryptMessage(ciphertext: string, nonce: string, conversationKey: string): string {
  const opened = nacl.secretbox.open(decodeBase64(ciphertext), decodeBase64(nonce), decodeBase64(conversationKey));
  if (!opened) throw new Error("Xabarni ochib bo'lmadi");
  return encodeUTF8(opened);
}

/** Encrypts arbitrary binary data (e.g. media files) with the conversation's shared symmetric key. */
export function encryptBytes(data: Uint8Array, conversationKey: string): { ciphertext: Uint8Array; nonce: string } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(data, nonce, decodeBase64(conversationKey));
  return { ciphertext, nonce: encodeBase64(nonce) };
}

/** Decrypts binary data (e.g. media files) encrypted with `encryptBytes`. */
export function decryptBytes(ciphertext: Uint8Array, nonce: string, conversationKey: string): Uint8Array {
  const opened = nacl.secretbox.open(ciphertext, decodeBase64(nonce), decodeBase64(conversationKey));
  if (!opened) throw new Error("Faylni ochib bo'lmadi");
  return opened;
}

/**
 * Builds a shareable invite string that bundles the server-issued invite code
 * with the conversation's symmetric key (never sent to the server) so that
 * whoever joins via this link can decrypt the conversation's history.
 */
export function encodeInviteLink(inviteCode: string, conversationKey: string): string {
  return `${inviteCode}.${conversationKey}`;
}

/** Parses an invite string produced by `encodeInviteLink`. Returns null if malformed. */
export function decodeInviteLink(invite: string): { code: string; key: string } | null {
  const trimmed = invite.trim();
  const dot = trimmed.indexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) return null;
  return { code: trimmed.slice(0, dot), key: trimmed.slice(dot + 1) };
}

/**
 * Derives a numeric "security code" from two users' public keys. Both
 * participants in a DIRECT chat can compute this independently and compare
 * it (e.g. by reading it aloud) to verify no one is tampering with their
 * end-to-end encrypted conversation key exchange.
 */
export function getSecurityCode(publicKeyA: string, publicKeyB: string): string {
  const combined = [publicKeyA, publicKeyB].sort().join("");
  const hash = nacl.hash(decodeUTF8(combined));
  const digits = Array.from(hash.slice(0, 30))
    .map((byte) => byte % 10)
    .join("");
  return digits.match(/.{1,5}/g)!.join("  ");
}
