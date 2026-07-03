import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatsApi } from "../../api/chats";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { ActivityStats } from "../../types";
import { getConversationDisplay, formatJoinDate } from "../../utils/conversation";
import { tr } from "../../i18n";

// JS Date#getDay(): 0=Yakshanba..6=Shanba. Reordered to start the week on Monday.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

type Props = NativeStackScreenProps<RootStackParamList, "MyActivity">;

export function MyActivityScreen({ navigation }: Props) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [error, setError] = useState(false);
  const conversations = useChatStore((s) => s.conversations);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const user = useAuthStore((s) => s.user);

  const loadData = useCallback(() => {
    setError(false);
    chatsApi.getMyActivityStats().then(setStats).catch(() => setError(true));
  }, []);

  useFocusEffect(loadData);

  if (error) {
    return <ErrorView message={tr("Faollik ma'lumotlarini yuklab bo'lmadi")} onRetry={loadData} />;
  }

  if (!stats || !user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const maxWeekday = Math.max(...stats.byWeekday, 1);
  const maxTopConversation = stats.topConversations[0]?.count ?? 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsSection}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalSent}</Text>
          <Text style={styles.statLabel}>{tr("📤 Yuborilgan")}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalReceived}</Text>
          <Text style={styles.statLabel}>{tr("📥 Qabul qilingan")}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.conversationCount}</Text>
          <Text style={styles.statLabel}>{tr("💬 Suhbatlar")}</Text>
        </View>
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.media}</Text>
          <Text style={styles.statLabel}>{tr("🖼 Media")}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.voice}</Text>
          <Text style={styles.statLabel}>{tr("🎵 Ovozli")}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.files}</Text>
          <Text style={styles.statLabel}>{tr("📄 Fayl")}</Text>
        </View>
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.activityTitle}>{tr("Haftalik faollik")}</Text>
        <View style={styles.weekdayRow}>
          {WEEKDAY_ORDER.map((dayIndex, i) => {
            const count = stats.byWeekday[dayIndex];
            const heightPercent = (count / maxWeekday) * 100;
            return (
              <View key={i} style={styles.weekdayColumn}>
                <View style={styles.weekdayBarTrack}>
                  <View style={[styles.weekdayBarFill, { height: `${heightPercent}%` }]} />
                </View>
                <Text style={styles.weekdayLabel}>{WEEKDAY_LABELS[i]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {stats.topConversations.length > 0 && (
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>{tr("Eng faol suhbatlar")}</Text>
          {stats.topConversations.map((entry) => {
            const conversation = conversations.find((c) => c.id === entry.conversationId);
            if (!conversation) return null;
            const display = getConversationDisplay(conversation, user.id, contactAliases);
            const percent = maxTopConversation > 0 ? (entry.count / maxTopConversation) * 100 : 0;
            return (
              <TouchableOpacity
                key={entry.conversationId}
                style={styles.activityRow}
                onPress={() => navigation.navigate("ChatRoom", { conversationId: conversation.id, title: display.title })}
              >
                <Avatar
                  uri={display.avatarUrl}
                  name={display.title}
                  size={28}
                  icon={conversation.isSelf ? "📝" : undefined}
                />
                <View style={styles.activityBarContainer}>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {display.title}
                  </Text>
                  <View style={styles.activityBarTrack}>
                    <View style={[styles.activityBarFill, { width: `${percent}%` }]} />
                  </View>
                </View>
                <Text style={styles.activityCount}>{entry.count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.memberSince}>A'zo bo'lgan sana: {formatJoinDate(stats.memberSince)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  statsSection: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  activitySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  activityTitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 10, fontWeight: "600" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  activityBarContainer: { flex: 1 },
  activityName: { fontSize: 13, color: colors.text, marginBottom: 4 },
  activityBarTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
  activityBarFill: { height: "100%", borderRadius: 3, backgroundColor: colors.primary },
  activityCount: { fontSize: 13, color: colors.textSecondary, minWidth: 28, textAlign: "right" },
  weekdayRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 90 },
  weekdayColumn: { flex: 1, alignItems: "center", gap: 6 },
  weekdayBarTrack: {
    width: 16,
    height: 60,
    borderRadius: 4,
    backgroundColor: colors.border,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  weekdayBarFill: { width: "100%", borderRadius: 4, backgroundColor: colors.primary, minHeight: 2 },
  weekdayLabel: { fontSize: 11, color: colors.textSecondary },
  memberSince: { fontSize: 13, color: colors.textSecondary, textAlign: "center", padding: 16 },
});
