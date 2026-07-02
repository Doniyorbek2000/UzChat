import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
} from "react-native-webrtc";

// Shape of SDP/ICE payloads carried over the socket.
export interface SdpInit {
  type: string;
  sdp: string;
}
export interface IceCandidateInit {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}
import { getSocket } from "../socket/socket";

// Single active 1:1 call session. Signaling rides the existing socket events
// (call:offer / call:answer / call:ice-candidate); this module owns the
// RTCPeerConnection and media streams.

const ICE_SERVERS: { urls: string; username?: string; credential?: string }[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
// Optional TURN relay for symmetric-NAT users. Configure in .env:
// EXPO_PUBLIC_TURN_URL / EXPO_PUBLIC_TURN_USERNAME / EXPO_PUBLIC_TURN_CREDENTIAL
const TURN_URL = process.env.EXPO_PUBLIC_TURN_URL;
if (TURN_URL) {
  ICE_SERVERS.push({
    urls: TURN_URL,
    username: process.env.EXPO_PUBLIC_TURN_USERNAME,
    credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
  });
}

export interface SessionCallbacks {
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnected: () => void;
  onEnded: () => void;
}

interface Session {
  pc: RTCPeerConnection;
  localStream: MediaStream;
  remoteUserId: string;
  pendingCandidates: IceCandidateInit[];
  remoteDescriptionSet: boolean;
}

let session: Session | null = null;

// The incoming offer arrives on the global socket listener before CallScreen
// mounts, so it's stashed here for the screen to pick up.
let pendingOffer: SdpInit | null = null;

export function setPendingOffer(offer: SdpInit | null) {
  pendingOffer = offer;
}

export function takePendingOffer(): SdpInit | null {
  const offer = pendingOffer;
  pendingOffer = null;
  return offer;
}

async function getLocalStream(callType: "audio" | "video"): Promise<MediaStream> {
  return mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video" ? { facingMode: "user" } : false,
  });
}

function createPeerConnection(remoteUserId: string, callbacks: SessionCallbacks): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const events = pc as any;

  events.addEventListener("icecandidate", (event: any) => {
    if (event.candidate) {
      getSocket()?.emit("call:ice-candidate", {
        targetUserId: remoteUserId,
        candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
      });
    }
  });

  events.addEventListener("track", (event: any) => {
    if (event.streams && event.streams[0]) {
      callbacks.onRemoteStream(event.streams[0]);
    }
  });

  events.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "connected") callbacks.onConnected();
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") callbacks.onEnded();
  });

  return pc;
}

/** Caller side: capture media, send a real SDP offer over the socket. */
export async function startOutgoingCall(
  targetUserId: string,
  conversationId: string,
  callType: "audio" | "video",
  callbacks: SessionCallbacks
): Promise<void> {
  endCallSession();

  const localStream = await getLocalStream(callType);
  callbacks.onLocalStream(localStream);

  const pc = createPeerConnection(targetUserId, callbacks);
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  session = { pc, localStream, remoteUserId: targetUserId, pendingCandidates: [], remoteDescriptionSet: false };

  const offer = await pc.createOffer({});
  await pc.setLocalDescription(offer);

  getSocket()?.emit("call:offer", {
    targetUserId,
    conversationId,
    offer: { type: offer.type, sdp: offer.sdp },
    callType,
  });
}

/** Callee side: apply the caller's offer, send back a real SDP answer. */
export async function answerIncomingCall(
  callerId: string,
  callType: "audio" | "video",
  offer: SdpInit,
  callbacks: SessionCallbacks
): Promise<void> {
  endCallSession();

  const localStream = await getLocalStream(callType);
  callbacks.onLocalStream(localStream);

  const pc = createPeerConnection(callerId, callbacks);
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  session = { pc, localStream, remoteUserId: callerId, pendingCandidates: [], remoteDescriptionSet: false };

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  session.remoteDescriptionSet = true;
  await flushPendingCandidates();

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  getSocket()?.emit("call:answer", {
    targetUserId: callerId,
    answer: { type: answer.type, sdp: answer.sdp },
  });
}

/** Caller side: the callee accepted — apply their answer. */
export async function applyRemoteAnswer(answer: SdpInit): Promise<void> {
  if (!session) return;
  await session.pc.setRemoteDescription(new RTCSessionDescription({ type: answer.type, sdp: answer.sdp }));
  session.remoteDescriptionSet = true;
  await flushPendingCandidates();
}

/** Candidates can trickle in before the remote description is set — queue them. */
export async function addRemoteIceCandidate(candidate: IceCandidateInit): Promise<void> {
  if (!session || !candidate) return;
  if (!session.remoteDescriptionSet) {
    session.pendingCandidates.push(candidate);
    return;
  }
  try {
    await session.pc.addIceCandidate(new RTCIceCandidate(candidate as any));
  } catch {
    // stale candidate after renegotiation/teardown — safe to drop
  }
}

async function flushPendingCandidates(): Promise<void> {
  if (!session) return;
  const queued = session.pendingCandidates.splice(0);
  for (const candidate of queued) {
    try {
      await session.pc.addIceCandidate(new RTCIceCandidate(candidate as any));
    } catch {}
  }
}

export function setMuted(muted: boolean): void {
  session?.localStream.getAudioTracks().forEach((t) => {
    t.enabled = !muted;
  });
}

export function setVideoEnabled(enabled: boolean): void {
  session?.localStream.getVideoTracks().forEach((t) => {
    t.enabled = enabled;
  });
}

export function endCallSession(): void {
  if (!session) return;
  try {
    session.localStream.getTracks().forEach((t) => t.stop());
  } catch {}
  try {
    session.pc.close();
  } catch {}
  session = null;
}
