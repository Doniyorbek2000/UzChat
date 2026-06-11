import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DecryptedMessage, useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

interface Props {
  message: DecryptedMessage;
  conversationId: string;
}

export function PollBubble({ message, conversationId }: Props) {
  const meta = message.pollMeta;
  const userId = useAuthStore((s) => s.user?.id);
  const votePoll = useChatStore((s) => s.votePoll);

  if (!meta) return null;

  const votes = message.pollVotes ?? [];
  const myVote = votes.find((v) => v.userId === userId);
  const myOptionIds = new Set(myVote?.optionIds ?? []);
  const totalVoters = votes.length;

  const onSelect = (optionId: string) => {
    if (meta.multipleChoice) {
      const next = new Set(myOptionIds);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      votePoll(conversationId, message.id, [...next]).catch(() => {});
      return;
    }

    if (myOptionIds.has(optionId)) {
      votePoll(conversationId, message.id, []).catch(() => {});
    } else {
      votePoll(conversationId, message.id, [optionId]).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 So'rovnoma</Text>
      <Text style={styles.question}>{meta.question}</Text>
      {meta.options.map((option) => {
        const count = votes.filter((v) => v.optionIds.includes(option.id)).length;
        const percent = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
        const selected = myOptionIds.has(option.id);
        return (
          <TouchableOpacity key={option.id} style={styles.option} onPress={() => onSelect(option.id)}>
            <View style={[styles.optionFill, { width: `${percent}%` }]} />
            <View style={styles.optionRow}>
              <View style={[styles.indicator, meta.multipleChoice && styles.indicatorSquare, selected && styles.indicatorSelected]}>
                {selected && <Text style={styles.indicatorCheck}>✓</Text>}
              </View>
              <Text style={styles.optionText}>{option.text}</Text>
              {totalVoters > 0 && <Text style={styles.optionPercent}>{percent}%</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.footer}>
        {totalVoters === 0 ? "Hali ovoz yo'q" : `${totalVoters} ovoz`}
        {meta.multipleChoice ? " · Bir nechta javob mumkin" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minWidth: 220, maxWidth: 260 },
  title: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  question: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 10 },
  option: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    overflow: "hidden",
  },
  optionFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  optionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  indicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorSquare: { borderRadius: 4 },
  indicatorSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  indicatorCheck: { color: "#fff", fontSize: 11, fontWeight: "700" },
  optionText: { flex: 1, fontSize: 14, color: colors.text },
  optionPercent: { fontSize: 12, color: colors.textSecondary },
  footer: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
