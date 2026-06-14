import { Alert } from "react-native";
import { Conversation } from "../types";

const PREVIEW_LABELS: Record<Conversation["notificationPreview"], string> = {
  DEFAULT: "Standart",
  SHOW: "Ko'rsatish",
  HIDE: "Yashirish",
};

const READ_RECEIPT_LABELS: Record<Conversation["readReceiptsOverride"], string> = {
  DEFAULT: "Standart",
  ON: "Yoqilgan",
  OFF: "O'chirilgan",
};

/** Opens a menu for this conversation's per-chat notification preview and read-receipt overrides. */
export function showChatNotificationSettings(
  conversation: Conversation,
  setNotificationPreview: (conversationId: string, value: Conversation["notificationPreview"]) => Promise<void>,
  setReadReceiptsOverride: (conversationId: string, value: Conversation["readReceiptsOverride"]) => Promise<void>
) {
  Alert.alert("Bildirishnoma sozlamalari", undefined, [
    {
      text: `Bildirishnomada matn: ${PREVIEW_LABELS[conversation.notificationPreview]}`,
      onPress: () => {
        Alert.alert(
          "Bildirishnomada matn",
          "Bu suhbat uchun bildirishnomada xabar matni va yuboruvchi ko'rsatilsinmi?",
          (["DEFAULT", "SHOW", "HIDE"] as const).map((value) => ({
            text: PREVIEW_LABELS[value],
            onPress: () => setNotificationPreview(conversation.id, value).catch(() => {}),
          }))
        );
      },
    },
    {
      text: `O'qilgan xabar belgisi: ${READ_RECEIPT_LABELS[conversation.readReceiptsOverride]}`,
      onPress: () => {
        Alert.alert(
          "O'qilgan xabar belgisi",
          "Bu suhbatda o'qilgan xabar belgisi yuborilsinmi?",
          (["DEFAULT", "ON", "OFF"] as const).map((value) => ({
            text: READ_RECEIPT_LABELS[value],
            onPress: () => setReadReceiptsOverride(conversation.id, value).catch(() => {}),
          }))
        );
      },
    },
    { text: "Bekor qilish", style: "cancel" },
  ]);
}
