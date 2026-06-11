export type LastSeenPrivacy = "EVERYONE" | "CONTACTS" | "NOBODY";
export type GroupAddPrivacy = "EVERYONE" | "CONTACTS" | "NOBODY";
// "1h"/"8h"/"1d"/"1w": mute for that duration; "forever": mute indefinitely; "off": unmute.
export type MuteDuration = "1h" | "8h" | "1d" | "1w" | "forever" | "off";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  publicKey: string;
  lastSeenAt?: string | null;
}

export interface AuthUser extends User {
  phone: string;
  lastSeenPrivacy: LastSeenPrivacy;
  groupAddPrivacy: GroupAddPrivacy;
  readReceiptsEnabled: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type ConversationType = "DIRECT" | "GROUP";
export type ParticipantRole = "OWNER" | "ADMIN" | "MEMBER";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM";

export interface ConversationParticipant {
  userId: string;
  role: ParticipantRole;
  user: User;
  lastReadAt: string | null;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface ReplyToSnapshot {
  id: string;
  senderId: string;
  type: MessageType;
  ciphertext: string;
  nonce: string;
  mediaUrl: string | null;
  deletedAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  ciphertext: string;
  nonce: string;
  mediaUrl: string | null;
  replyToId: string | null;
  replyTo?: ReplyToSnapshot | null;
  reactions: MessageReaction[];
  mentions: string[];
  forwardedFromName: string | null;
  isStarred: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  avatarUrl: string | null;
  updatedAt: string;
  // base64 NaCl box: this conversation's symmetric key, encrypted for the current user
  wrappedKey: string;
  wrappedKeyNonce: string;
  keySenderPublicKey: string;
  lastReadAt: string | null;
  isPinned: boolean;
  isMuted: boolean;
  // When isMuted is due to a timed mute (not "forever"), the ISO timestamp it expires at.
  mutedUntil: string | null;
  isArchived: boolean;
  markedUnread: boolean;
  isBlocked: boolean;
  // The current group's invite code (only visible to OWNER/ADMIN), or null.
  inviteCode: string | null;
  // New messages auto-delete this many seconds after being sent; null disables it.
  disappearingSeconds: number | null;
  // GROUP only: when true, only the owner and admins may send messages.
  onlyAdminsCanSend: boolean;
  pinnedMessage: ReplyToSnapshot | null;
  participants: ConversationParticipant[];
  lastMessage?: Message | null;
}

export interface Contact {
  id: string;
  alias: string | null;
  user: User;
}

export interface ContactRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "BLOCKED";
  owner: User;
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  user: User;
}

export interface InvitePreview {
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
}

/** Encrypted alongside the message ciphertext for IMAGE/VIDEO/AUDIO/FILE messages. */
export interface MediaMeta {
  name: string;
  mimeType: string;
  size: number;
  fileNonce: string;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
}

/** A locally picked file/image ready to be encrypted and sent. */
export interface MediaAsset {
  uri: string;
  name: string;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}
