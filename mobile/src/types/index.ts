export type ReportReason = "SPAM" | "HARASSMENT" | "VIOLENCE" | "ILLEGAL_CONTENT" | "IMPERSONATION" | "OTHER";
export type LastSeenPrivacy = "EVERYONE" | "CONTACTS" | "NOBODY";
export type GroupAddPrivacy = "EVERYONE" | "CONTACTS" | "NOBODY";
export type MessagePrivacy = "EVERYONE" | "CONTACTS" | "NOBODY";
// "1h"/"8h"/"1d"/"1w": mute for that duration; "forever": mute indefinitely; "off": unmute.
export type MuteDuration = "1h" | "8h" | "1d" | "1w" | "forever" | "off";
// "1h"/"1d"/"1w": restrict for that duration; "forever": restrict indefinitely; "off": lift restriction.
export type RestrictDuration = "1h" | "1d" | "1w" | "forever" | "off";

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
  messagePrivacy: MessagePrivacy;
  readReceiptsEnabled: boolean;
  typingIndicatorsEnabled: boolean;
  twoFactorEnabled: boolean;
  twoFactorHint: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type LoginResult = ({ requires2FA?: false } & { user: AuthUser } & AuthTokens) | { requires2FA: true; pendingToken: string; hint: string | null };

export type ConversationType = "DIRECT" | "GROUP";
export type ParticipantRole = "OWNER" | "ADMIN" | "MEMBER";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "CONTACT" | "POLL" | "SYSTEM";

export interface ConversationParticipant {
  userId: string;
  role: ParticipantRole;
  user: User;
  lastReadAt: string | null;
  restrictedUntil: string | null;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

/** A user's vote on a POLL message: which opaque option IDs they picked. */
export interface PollVote {
  userId: string;
  optionIds: string[];
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

export interface PinnedMessageInfo extends ReplyToSnapshot {
  pinnedAt: string;
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
  pollVotes: PollVote[];
  mentions: string[];
  forwardedFromName: string | null;
  isStarred: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  // ISO timestamp; if set, this message hasn't been delivered yet and is only
  // visible to its sender in the "Scheduled Messages" list.
  scheduledFor: string | null;
  // "View once" media (IMAGE only): the media is deleted server-side after
  // the recipient views it once.
  viewOnce: boolean;
  viewedAt: string | null;
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
  // GROUP only: minimum seconds a member must wait between their messages; 0 disables it.
  slowModeSeconds: number;
  // DIRECT only: a "Saved Messages" conversation with only the current user as its participant.
  isSelf: boolean;
  // Pinned messages, most-recently-pinned first.
  pinnedMessages: PinnedMessageInfo[];
  participants: ConversationParticipant[];
  lastMessage?: Message | null;
}

export interface Contact {
  id: string;
  alias: string | null;
  isFavorite: boolean;
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

/** Encrypted alongside the message ciphertext for CONTACT messages: a shared contact card. */
export interface ContactCardMeta {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Encrypted alongside the message ciphertext for POLL messages: question + options. */
export interface PollMeta {
  question: string;
  options: { id: string; text: string }[];
  multipleChoice: boolean;
}

/** A user-defined chat list tab (Telegram-style folder) grouping a subset of conversations. */
export interface ChatFolder {
  id: string;
  name: string;
  order: number;
  conversationIds: string[];
}

/** A logged-in device/client, backed by a refresh token on the server. */
export interface Session {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}
