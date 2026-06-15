export type ReportReason = "SPAM" | "HARASSMENT" | "VIOLENCE" | "ILLEGAL_CONTENT" | "IMPERSONATION" | "OTHER";
export type LastSeenPrivacy = "EVERYONE" | "CONTACTS" | "NOBODY";
export type GroupAddPrivacy = "EVERYONE" | "CONTACTS" | "NOBODY";
export type MessagePrivacy = "EVERYONE" | "CONTACTS" | "NOBODY";
// "1h"/"2h"/"8h"/"1d"/"2d"/"1w": mute for that duration; "forever": mute indefinitely; "off": unmute.
export type MuteDuration = "1h" | "2h" | "8h" | "1d" | "2d" | "1w" | "forever" | "off";
// "1h"/"1d"/"1w": restrict for that duration; "forever": restrict indefinitely; "off": lift restriction.
export type RestrictDuration = "1h" | "1d" | "1w" | "forever" | "off";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  customStatus?: string | null;
  // When set, customStatus is automatically cleared at this time.
  customStatusExpiresAt?: string | null;
  publicKey: string;
  lastSeenAt?: string | null;
  birthdayDay?: number | null;
  birthdayMonth?: number | null;
  notifyOnlineRequested?: boolean;
}

export interface AuthUser extends User {
  phone: string;
  // Set when the username was last changed; used to show the change cooldown.
  usernameChangedAt?: string | null;
  lastSeenPrivacy: LastSeenPrivacy;
  avatarPrivacy: LastSeenPrivacy;
  bioPrivacy: LastSeenPrivacy;
  birthdayPrivacy: LastSeenPrivacy;
  groupAddPrivacy: GroupAddPrivacy;
  messagePrivacy: MessagePrivacy;
  phoneNumberPrivacy: LastSeenPrivacy;
  // Who can see this user's name as the original sender when their messages are forwarded.
  forwardedMessagePrivacy: LastSeenPrivacy;
  readReceiptsEnabled: boolean;
  typingIndicatorsEnabled: boolean;
  notifyPrivateChats: boolean;
  notifyGroupChats: boolean;
  notifyReactions: boolean;
  notifyMentions: boolean;
  hideNotificationContent: boolean;
  // Whether muted chats still count toward the app icon's unread badge and the
  // chat list's folder unread counters.
  includeMutedInBadge: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  quietHoursTimezoneOffset: number | null;
  // Global "Do not disturb": when true, or notificationsPausedUntil is in the
  // future, all message/reaction push notifications are suppressed.
  notificationsPaused: boolean;
  notificationsPausedUntil: string | null;
  defaultDisappearingSeconds: number | null;
  // Days of inactivity after which the account is automatically deleted.
  selfDestructDays: 30 | 90 | 180 | 365;
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
  lastDeliveredAt: string | null;
  restrictedUntil: string | null;
  customTitle: string | null;
  joinedAt: string;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

/** A user's vote on a POLL message: which opaque option IDs they picked.
 * userId is null for other participants' votes on an anonymous poll. */
export interface PollVote {
  userId: string | null;
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
  // When set, this pin is automatically removed once this time passes.
  expiresAt: string | null;
  pinnedBy: string;
}

// A pending "remind me later" entry for a message, returned by /conversations/reminders/messages.
export interface MessageReminderInfo {
  message: Message;
  remindAt: string;
  conversationId: string;
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
  forwardedFromUserId: string | null;
  // Number of hops this message has been forwarded along its chain (0 = not forwarded).
  forwardCount: number;
  isStarred: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  // ISO timestamp; if set, this message hasn't been delivered yet and is only
  // visible to its sender in the "Scheduled Messages" list.
  scheduledFor: string | null;
  // DIRECT only: when true, this pending message is delivered as soon as the
  // recipient comes online, instead of at a fixed scheduledFor time.
  sendWhenOnline: boolean;
  // "View once" media (IMAGE/AUDIO only): the media is deleted server-side
  // after the recipient views/plays it once.
  viewOnce: boolean;
  viewedAt: string | null;
  // Media (IMAGE/VIDEO) sent with a blur overlay; tap to reveal.
  isSpoiler: boolean;
  // POLL only: when set, the poll creator has closed voting.
  pollClosedAt: string | null;
  // POLL only: when set, the poll auto-closes at this time.
  pollClosesAt: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  // GROUP only: sent as a SYSTEM message to new members when they join; null disables it.
  welcomeMessage: string | null;
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
  // Per-conversation override of the global "hide notification content" setting:
  // DEFAULT follows the global setting, SHOW always includes the preview, HIDE
  // always shows a generic "new message" notification for this chat.
  notificationPreview: "DEFAULT" | "SHOW" | "HIDE";
  // Per-conversation override of the global "read receipts" setting: DEFAULT
  // follows the global setting, ON always sends read receipts in this chat,
  // OFF never sends them in this chat.
  readReceiptsOverride: "DEFAULT" | "ON" | "OFF";
  // GROUP only: userIds of other participants whose messages don't trigger
  // notifications for the current user in this conversation.
  mutedSenderIds: string[];
  // When set, this chat is auto-removed from the current user's chat list once
  // this many seconds pass with no new message; null disables it.
  autoDeleteAfterSeconds: number | null;
  isBlocked: boolean;
  // The current group's invite code (only visible to OWNER/ADMIN), or null.
  inviteCode: string | null;
  // When set, the invite code stops working after this time (OWNER/ADMIN only).
  inviteCodeExpiresAt: string | null;
  // When set, the invite code stops working after this many joins (OWNER/ADMIN only).
  inviteCodeMaxUses: number | null;
  // Number of times the current invite code has been used to join (OWNER/ADMIN only).
  inviteCodeUseCount: number | null;
  // New messages auto-delete this many seconds after being sent; null disables it.
  disappearingSeconds: number | null;
  // GROUP only: when true, only the owner and admins may send messages.
  onlyAdminsCanSend: boolean;
  // GROUP only: minimum seconds a member must wait between their messages; 0 disables it.
  slowModeSeconds: number;
  // GROUP only: when true, MEMBERs can't forward, copy, or export messages from this group.
  noForwards: boolean;
  // GROUP only: when true, joining via invite link creates a pending request
  // that an owner/admin must approve.
  requireAdminApproval: boolean;
  // GROUP only: when true, regular members (not just owner/admins) can add new participants.
  membersCanAddMembers: boolean;
  // GROUP only: when true, regular members (not just owner/admins) can pin/unpin messages.
  membersCanPinMessages: boolean;
  // GROUP only: when true, regular members (not just owner/admins) can edit the
  // group's title, photo, and description.
  membersCanChangeInfo: boolean;
  // GROUP only: when false, regular members can only send TEXT messages.
  membersCanSendMedia: boolean;
  // GROUP only: when false, regular members can't create polls (independent of membersCanSendMedia).
  membersCanSendPolls: boolean;
  // GROUP only: when true, members who join after this is enabled only see
  // messages sent after they joined.
  hideHistoryForNewMembers: boolean;
  // GROUP only: when true, regular members can't view the full member list
  // (only owner/admin can). Members still see the total member count.
  hideMembersList: boolean;
  // GROUP only: when false, no one (including admins) can react to messages in this group.
  reactionsEnabled: boolean;
  // DIRECT only: a "Saved Messages" conversation with only the current user as its participant.
  isSelf: boolean;
  // Pinned messages, most-recently-pinned first.
  pinnedMessages: PinnedMessageInfo[];
  participants: ConversationParticipant[];
  lastMessage?: Message | null;
  // True if any unread message in this conversation @-mentions the current user.
  hasUnreadMention?: boolean;
}

// A pending request to join a GROUP via invite link, awaiting owner/admin approval.
export interface GroupJoinRequest {
  id: string;
  user: User;
  createdAt: string;
}

// A user removed-and-banned from a GROUP by an owner/admin; can't rejoin or
// be re-added until unbanned.
export interface BannedGroupMember {
  user: User;
  createdAt: string;
}

export type GroupAuditAction =
  | "MEMBER_REMOVED"
  | "ROLE_CHANGED"
  | "MEMBER_RESTRICTED"
  | "MEMBER_UNRESTRICTED"
  | "MESSAGE_DELETED"
  | "MEMBER_BANNED"
  | "MEMBER_UNBANNED"
  | "MEMBER_ADDED";

// An entry in a GROUP's "Recent actions" moderation log.
export interface GroupAuditLogEntry {
  id: string;
  action: GroupAuditAction;
  details: string | null;
  createdAt: string;
  actor: { id: string; displayName: string; avatarUrl: string | null } | null;
  target: { id: string; displayName: string; avatarUrl: string | null } | null;
}

// A GROUP conversation that both the current user and another user are members of.
export interface CommonGroup {
  id: string;
  title: string | null;
  avatarUrl: string | null;
  memberCount: number;
}

export interface Contact {
  id: string;
  alias: string | null;
  isFavorite: boolean;
  // Private free-text note the current user keeps about this contact; never
  // shared with the contact or anyone else.
  note: string | null;
  user: User;
}

export interface ContactRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "BLOCKED";
  owner: User;
  createdAt: string;
  // Number of contacts the current user and the requester both have accepted.
  mutualCount: number;
}

export interface BlockedUser {
  id: string;
  user: User;
}

// A suggested contact ("people you may know"), with the number of mutual
// (accepted) contacts shared with the current user.
export interface ContactSuggestion {
  user: User;
  mutualCount: number;
}

// An accepted contact whose birthday falls within the next 30 days, sorted
// soonest-first. daysUntil is 0 for "today", 1 for "tomorrow", etc.
export interface UpcomingBirthday {
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "birthdayDay" | "birthdayMonth">;
  daysUntil: number;
}

// A per-user override of the current user's lastSeenPrivacy setting: ALLOW
// always shows lastSeenAt to this user, DENY always hides it from them,
// regardless of the global setting.
export interface LastSeenException {
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  mode: "ALLOW" | "DENY";
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
  // When true, other participants' identities are hidden from pollVotes.
  anonymous: boolean;
  // Quiz mode: the id of the correct option, revealed to a participant after they vote.
  quizCorrectOptionId?: string;
  // Quiz mode: optional explanation shown to a participant after they answer.
  quizExplanation?: string;
}

/** A user-defined chat list tab (Telegram-style folder) grouping a subset of conversations. */
export interface ChatFolder {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  conversationIds: string[];
  // Smart filters: auto-include conversations matching these criteria, in addition to conversationIds.
  includeUnread: boolean;
  includeGroups: boolean;
  includeDirect: boolean;
  excludeMuted: boolean;
}

/** A saved list of recipients; sending a message to it delivers individual
 * direct messages to each member's 1:1 conversation with the owner. */
export interface BroadcastList {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** A previous username the current user has changed away from. */
export interface UsernameHistoryEntry {
  oldUsername: string;
  changedAt: string;
}

/** A logged-in device/client, backed by a refresh token on the server. */
export interface Session {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

/** Account-wide activity summary for the current user, across all their conversations. */
export interface ActivityStats {
  totalSent: number;
  totalReceived: number;
  media: number;
  voice: number;
  files: number;
  conversationCount: number;
  memberSince: string;
  byWeekday: number[];
  topConversations: { conversationId: string; count: number }[];
}
