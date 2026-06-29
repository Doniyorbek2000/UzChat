import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";
import { deriveSharedSecret, PreKeyBundle } from "./e2ee";
import { secureStorage } from "../storage/secureStorage";
import { keyManager } from "./keyManager";

interface RatchetState {
  rootKey: string;
  sendChainKey: string;
  receiveChainKey: string;
  sendRatchetKey: string;
  sendRatchetPrivate: string;
  receiveRatchetKey: string;
  sendMessageNumber: number;
  receiveMessageNumber: number;
  previousSendCount: number;
}

const sessionCache = new Map<string, RatchetState>();

function sessionKey(peerUserId: string, peerDeviceId: string): string {
  return `${peerUserId}:${peerDeviceId}`;
}

function hkdfExpand(key: Uint8Array, info: Uint8Array, length: number): Uint8Array {
  const hash = nacl.hash(new Uint8Array([...key, ...info]));
  return hash.slice(0, length);
}

function deriveChainKeys(chainKey: string): { messageKey: string; nextChainKey: string } {
  const ck = decodeBase64(chainKey);
  const messageKey = encodeBase64(hkdfExpand(ck, new Uint8Array([0x01]), 32));
  const nextChainKey = encodeBase64(hkdfExpand(ck, new Uint8Array([0x02]), 32));
  return { messageKey, nextChainKey };
}

function ratchetRootKey(rootKey: string, dhOutput: string): { newRootKey: string; chainKey: string } {
  const rk = decodeBase64(rootKey);
  const dh = decodeBase64(dhOutput);
  const combined = new Uint8Array([...rk, ...dh]);
  const expanded = nacl.hash(combined);
  return {
    newRootKey: encodeBase64(expanded.slice(0, 32)),
    chainKey: encodeBase64(expanded.slice(32, 64)),
  };
}

export const sessionManager = {
  async initSessionFromBundle(
    peerUserId: string,
    bundle: PreKeyBundle
  ): Promise<RatchetState> {
    const keyPair = await secureStorage.getKeyPair();
    if (!keyPair) throw new Error("No identity key pair");

    const ephemeral = nacl.box.keyPair();
    const ephemeralPublic = encodeBase64(ephemeral.publicKey);
    const ephemeralPrivate = encodeBase64(ephemeral.secretKey);

    const dh1 = deriveSharedSecret(keyPair.privateKey, bundle.identityKey);
    const dh2 = bundle.signedPreKey
      ? deriveSharedSecret(keyPair.privateKey, bundle.signedPreKey.publicKey)
      : dh1;
    const dh3 = deriveSharedSecret(ephemeralPrivate, bundle.identityKey);
    const dh4 = bundle.preKey
      ? deriveSharedSecret(ephemeralPrivate, bundle.preKey.publicKey)
      : dh3;

    const masterSecret = nacl.hash(
      new Uint8Array([
        ...decodeBase64(dh1),
        ...decodeBase64(dh2),
        ...decodeBase64(dh3),
        ...decodeBase64(dh4),
      ])
    );

    const rootKey = encodeBase64(masterSecret.slice(0, 32));
    const sendChainKey = encodeBase64(masterSecret.slice(32, 64));

    const state: RatchetState = {
      rootKey,
      sendChainKey,
      receiveChainKey: sendChainKey,
      sendRatchetKey: ephemeralPublic,
      sendRatchetPrivate: ephemeralPrivate,
      receiveRatchetKey: bundle.signedPreKey?.publicKey ?? bundle.identityKey,
      sendMessageNumber: 0,
      receiveMessageNumber: 0,
      previousSendCount: 0,
    };

    const key = sessionKey(peerUserId, bundle.deviceId);
    sessionCache.set(key, state);

    return state;
  },

  async getSession(peerUserId: string, peerDeviceId: string): Promise<RatchetState | null> {
    return sessionCache.get(sessionKey(peerUserId, peerDeviceId)) ?? null;
  },

  async ratchetEncrypt(
    peerUserId: string,
    peerDeviceId: string,
    plaintext: string
  ): Promise<{ ciphertext: string; nonce: string; header: { ratchetKey: string; messageNumber: number; previousCount: number } }> {
    const key = sessionKey(peerUserId, peerDeviceId);
    const state = sessionCache.get(key);
    if (!state) throw new Error("No session established");

    const { messageKey, nextChainKey } = deriveChainKeys(state.sendChainKey);

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encrypted = nacl.secretbox(
      new TextEncoder().encode(plaintext),
      nonce,
      decodeBase64(messageKey)
    );

    const header = {
      ratchetKey: state.sendRatchetKey,
      messageNumber: state.sendMessageNumber,
      previousCount: state.previousSendCount,
    };

    state.sendChainKey = nextChainKey;
    state.sendMessageNumber++;
    sessionCache.set(key, state);

    return {
      ciphertext: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      header,
    };
  },

  async ratchetDecrypt(
    peerUserId: string,
    peerDeviceId: string,
    ciphertext: string,
    nonce: string,
    header: { ratchetKey: string; messageNumber: number; previousCount: number }
  ): Promise<string> {
    const key = sessionKey(peerUserId, peerDeviceId);
    const state = sessionCache.get(key);
    if (!state) throw new Error("No session established");

    if (header.ratchetKey !== state.receiveRatchetKey) {
      state.previousSendCount = state.sendMessageNumber;
      state.sendMessageNumber = 0;
      state.receiveRatchetKey = header.ratchetKey;

      const dhOutput = deriveSharedSecret(state.sendRatchetPrivate, header.ratchetKey);
      const { newRootKey, chainKey } = ratchetRootKey(state.rootKey, dhOutput);
      state.rootKey = newRootKey;
      state.receiveChainKey = chainKey;

      const newRatchet = nacl.box.keyPair();
      state.sendRatchetKey = encodeBase64(newRatchet.publicKey);
      state.sendRatchetPrivate = encodeBase64(newRatchet.secretKey);

      const dhOutput2 = deriveSharedSecret(encodeBase64(newRatchet.secretKey), header.ratchetKey);
      const { newRootKey: rk2, chainKey: ck2 } = ratchetRootKey(state.rootKey, dhOutput2);
      state.rootKey = rk2;
      state.sendChainKey = ck2;
    }

    let receiveChainKey = state.receiveChainKey;
    let messageKey = "";
    for (let i = state.receiveMessageNumber; i <= header.messageNumber; i++) {
      const derived = deriveChainKeys(receiveChainKey);
      messageKey = derived.messageKey;
      receiveChainKey = derived.nextChainKey;
    }

    state.receiveChainKey = receiveChainKey;
    state.receiveMessageNumber = header.messageNumber + 1;
    sessionCache.set(key, state);

    const decrypted = nacl.secretbox.open(
      decodeBase64(ciphertext),
      decodeBase64(nonce),
      decodeBase64(messageKey)
    );
    if (!decrypted) throw new Error("Xabarni ochib bo'lmadi");

    return new TextDecoder().decode(decrypted);
  },

  hasSession(peerUserId: string, peerDeviceId: string): boolean {
    return sessionCache.has(sessionKey(peerUserId, peerDeviceId));
  },

  removeSession(peerUserId: string, peerDeviceId: string): void {
    sessionCache.delete(sessionKey(peerUserId, peerDeviceId));
  },

  clearAllSessions(): void {
    sessionCache.clear();
  },
};
