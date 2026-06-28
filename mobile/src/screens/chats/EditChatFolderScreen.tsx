import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Switch } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Conversation } from "../../types";
import { getConversationDisplay } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "EditChatFolder">;

export function EditChatFolderScreen({ route, navigation }: Props) {
  const { folderId } = route.params;
  const conversations = useChatStore((s) => s.conversations);
  const folders = useChatStore((s) => s.folders);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const setFolderConversations = useChatStore((s) => s.setFolderConversations);
  const setFolderFilters = useChatStore((s) => s.setFolderFilters);
  const user = useAuthStore((s) => s.user);
  const folder = folders.find((f) => f.id === folderId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(folder?.conversationIds ?? []));
  const [includeUnread, setIncludeUnread] = useState(folder?.includeUnread ?? false);
  const [includeGroups, setIncludeGroups] = useState(folder?.includeGroups ?? false);
  const [includeDirect, setIncludeDirect] = useState(folder?.includeDirect ?? false);
  const [excludeMuted, setExcludeMuted] = useState(folder?.excludeMuted ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!folder) navigation.goBack();
  }, [folder, navigation]);

  const toggleSelect = (target: Conversation) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(target.id)) next.delete(target.id);
      else next.add(target.id);
      return next;
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await setFolderConversations(folderId, [...selectedIds]);
      await setFolderFilters(folderId, { includeUnread, includeGroups, includeDirect, excludeMuted });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        saving ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <TouchableOpacity onPress={onSave} hitSlop={8}>
            <Text style={styles.saveButton}>Saqlash</Text>
          </TouchableOpacity>
        ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, saving, selectedIds, includeUnread, includeGroups, includeDirect, excludeMuted]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const display = getConversationDisplay(item, user!.id, contactAliases);
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity style={styles.row} onPress={() => toggleSelect(item)}>
        <Avatar uri={display.avatarUrl} name={display.title} icon={item.isSelf ? "📝" : undefined} />
        <Text style={styles.title} numberOfLines={1}>
          {display.title}
        </Text>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkboxIcon}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.filtersSection}>
            <Text style={styles.filtersTitle}>Avtomatik qo'shish</Text>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>O'qilmagan suhbatlar</Text>
              <Switch value={includeUnread} onValueChange={setIncludeUnread} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Guruhlar</Text>
              <Switch value={includeGroups} onValueChange={setIncludeGroups} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Shaxsiy suhbatlar</Text>
              <Switch value={includeDirect} onValueChange={setIncludeDirect} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Ovozsizlarni chiqarib tashlash</Text>
              <Switch value={excludeMuted} onValueChange={setExcludeMuted} trackColor={{ true: colors.primary }} />
            </View>
            <Text style={[styles.filtersTitle, styles.chatsTitle]}>Suhbatlar</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Suhbatlar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  title: { fontSize: 16, color: colors.text, flex: 1 },
  filtersSection: { paddingHorizontal: 12, paddingTop: 12 },
  filtersTitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  chatsTitle: { marginTop: 16, marginBottom: 0 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  filterLabel: { fontSize: 15, color: colors.text },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxIcon: { color: "#fff", fontSize: 14, fontWeight: "700" },
  saveButton: { color: colors.primary, fontSize: 16, fontWeight: "600" },
});
