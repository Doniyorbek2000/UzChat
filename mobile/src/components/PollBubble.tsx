import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DecryptedMessage, useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";
import { formatPollTimeRemaining } from "../utils/pollDeadline";

interface Props {
  message: DecryptedMessage;
  conversationId: string;
  onShowVotes?: () => void;
}

export function PollBubble({ message, conversationId, onShowVotes }: Props) {
  const meta = message.pollMeta;
  const userId = useAuthStore((s) => s.user?.id);
  const votePoll = useChatStore((s) => s.votePoll);

  if (!meta) return null;

  const votes = message.pollVotes ?? [];
  const myVote = votes.find((v) => v.userId === userId);
  const myOptionIds = new Set(myVote?.optionIds ?? []);
  const totalVoters = votes.length;
  const closed = !!message.pollClosedAt;
  const isQuiz = !!meta.quizCorrectOptionId;
  const answered = myOptionIds.size > 0;
  const showResults = !isQuiz || answered || closed;
  const answeredCorrectly = isQuiz && answered && myOptionIds.has(meta.quizCorrectOptionId!);

  const onSelect = (optionId: string) => {
    if (closed || (isQuiz && answered)) return;
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
      <Text style={styles.title}>{isQuiz ? "❓ Test" : "📊 So'rovnoma"}</Text>
      <Text style={styles.question}>{meta.question}</Text>
      {meta.options.map((option) => {
        const count = votes.filter((v) => v.optionIds.includes(option.id)).length;
        const percent = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
        const selected = myOptionIds.has(option.id);
        const isCorrectOption = isQuiz && option.id === meta.quizCorrectOptionId;
        const revealCorrect = isQuiz && answered;
        const wrongPick = revealCorrect && selected && !isCorrectOption;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              revealCorrect && isCorrectOption && styles.optionCorrect,
              wrongPick && styles.optionIncorrect,
            ]}
            onPress={() => onSelect(option.id)}
            disabled={closed || (isQuiz && answered)}
          >
            {showResults && <View style={[styles.optionFill, { width: `${percent}%` }]} />}
            <View style={styles.optionRow}>
              <View
                style={[
                  styles.indicator,
                  meta.multipleChoice && styles.indicatorSquare,
                  selected && styles.indicatorSelected,
                  revealCorrect && isCorrectOption && styles.indicatorCorrect,
                  wrongPick && styles.indicatorIncorrect,
                ]}
              >
                {(selected || (revealCorrect && isCorrectOption)) && (
                  <Text style={styles.indicatorCheck}>{wrongPick ? "✗" : "✓"}</Text>
                )}
              </View>
              <Text style={[styles.optionText, revealCorrect && isCorrectOption && styles.optionTextCorrect]}>
                {option.text}
              </Text>
              {showResults && totalVoters > 0 && <Text style={styles.optionPercent}>{percent}%</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.footer}>
        {isQuiz
          ? answered
            ? answeredCorrectly
              ? "✅ To'g'ri javob!"
              : "❌ Noto'g'ri javob"
            : "Javobingizni tanlang"
          : totalVoters === 0
            ? "Hali ovoz yo'q"
            : `${totalVoters} ovoz`}
        {!isQuiz && meta.multipleChoice ? " · Bir nechta javob mumkin" : ""}
        {!isQuiz && meta.anonymous ? " · 🔒 Anonim" : ""}
        {closed ? " · Yopilgan" : ""}
      </Text>
      {!closed && message.pollClosesAt && formatPollTimeRemaining(message.pollClosesAt) && (
        <Text style={styles.deadline}>{formatPollTimeRemaining(message.pollClosesAt)}</Text>
      )}
      {!isQuiz && !meta.anonymous && totalVoters > 0 && onShowVotes && (
        <TouchableOpacity onPress={onShowVotes}>
          <Text style={styles.votesLink}>Ovozlarni ko'rish</Text>
        </TouchableOpacity>
      )}
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
  optionCorrect: { borderColor: colors.primary },
  optionIncorrect: { borderColor: colors.danger },
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
  indicatorCorrect: { borderColor: colors.primary, backgroundColor: colors.primary },
  indicatorIncorrect: { borderColor: colors.danger, backgroundColor: colors.danger },
  indicatorCheck: { color: "#fff", fontSize: 11, fontWeight: "700" },
  optionText: { flex: 1, fontSize: 14, color: colors.text },
  optionTextCorrect: { color: colors.primaryDark, fontWeight: "600" },
  optionPercent: { fontSize: 12, color: colors.textSecondary },
  footer: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  deadline: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  votesLink: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 6 },
});
