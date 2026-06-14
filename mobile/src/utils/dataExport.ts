import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { contactsApi } from "../api/contacts";
import { AuthUser, Conversation } from "../types";

/** Gathers the current user's profile, settings, contacts and conversation list as
 * a single JSON file and shares it. Message contents are never included here, since
 * they're end-to-end encrypted - use the per-chat "Suhbatni eksport qilish" option instead. */
export async function exportAccountData(user: AuthUser, conversations: Conversation[]): Promise<void> {
  const [contacts, blockedUsers] = await Promise.all([contactsApi.list(), contactsApi.listBlocked()]);

  const data = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      phone: user.phone,
      bio: user.bio ?? null,
      customStatus: user.customStatus ?? null,
      customStatusExpiresAt: user.customStatusExpiresAt ?? null,
      avatarUrl: user.avatarUrl,
      birthdayDay: user.birthdayDay ?? null,
      birthdayMonth: user.birthdayMonth ?? null,
    },
    privacySettings: {
      lastSeenPrivacy: user.lastSeenPrivacy,
      avatarPrivacy: user.avatarPrivacy,
      birthdayPrivacy: user.birthdayPrivacy,
      phoneNumberPrivacy: user.phoneNumberPrivacy,
      groupAddPrivacy: user.groupAddPrivacy,
      messagePrivacy: user.messagePrivacy,
      readReceiptsEnabled: user.readReceiptsEnabled,
      typingIndicatorsEnabled: user.typingIndicatorsEnabled,
    },
    notificationSettings: {
      notifyPrivateChats: user.notifyPrivateChats,
      notifyGroupChats: user.notifyGroupChats,
      notifyReactions: user.notifyReactions,
      notifyMentions: user.notifyMentions,
      hideNotificationContent: user.hideNotificationContent,
      quietHoursEnabled: user.quietHoursEnabled,
      quietHoursStart: user.quietHoursStart,
      quietHoursEnd: user.quietHoursEnd,
    },
    security: {
      twoFactorEnabled: user.twoFactorEnabled,
    },
    contacts: contacts.map((c) => ({
      username: c.user.username,
      displayName: c.user.displayName,
      alias: c.alias,
      isFavorite: c.isFavorite,
    })),
    blockedUsers: blockedUsers.map((b) => ({
      username: b.user.username,
      displayName: b.user.displayName,
    })),
    conversations: conversations.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      isSelf: c.isSelf,
      isPinned: c.isPinned,
      isMuted: c.isMuted,
      isArchived: c.isArchived,
      participants: c.participants.map((p) => ({
        username: p.user.username,
        displayName: p.user.displayName,
        role: p.role,
        customTitle: p.customTitle,
      })),
    })),
  };

  const fileUri = `${FileSystem.cacheDirectory}uzchat-export-account-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: "application/json", dialogTitle: "Mening ma'lumotlarim" });
  }
}
