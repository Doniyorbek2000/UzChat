import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { Avatar } from "../../components/Avatar";
import { getSocket } from "../../socket/socket";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Call">;

type CallState = "ringing" | "connected" | "ended";

export function CallScreen({ navigation, route }: Props) {
  const { userId, displayName, avatarUrl, callType, isIncoming } = route.params;
  const [state, setState] = useState<CallState>(isIncoming ? "ringing" : "ringing");
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (!isIncoming) {
      socket.emit("call:offer", {
        targetUserId: userId,
        conversationId: "",
        offer: {},
        callType,
      });
    }

    const onAnswer = () => setState("connected");
    const onEnd = () => {
      setState("ended");
      setTimeout(() => navigation.goBack(), 1000);
    };
    const onReject = () => {
      setState("ended");
      setTimeout(() => navigation.goBack(), 1000);
    };
    const onBusy = () => {
      setState("ended");
      setTimeout(() => navigation.goBack(), 1000);
    };

    socket.on("call:answer", onAnswer);
    socket.on("call:end", onEnd);
    socket.on("call:reject", onReject);
    socket.on("call:busy", onBusy);

    return () => {
      socket.off("call:answer", onAnswer);
      socket.off("call:end", onEnd);
      socket.off("call:reject", onReject);
      socket.off("call:busy", onBusy);
    };
  }, [userId, callType, isIncoming, navigation]);

  useEffect(() => {
    if (state !== "connected") return;
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const onAnswer = () => {
    setState("connected");
    getSocket()?.emit("call:answer", { targetUserId: userId, answer: {} });
  };

  const onEnd = () => {
    getSocket()?.emit("call:end", { targetUserId: userId, conversationId: "" });
    setState("ended");
    setTimeout(() => navigation.goBack(), 500);
  };

  const onReject = () => {
    getSocket()?.emit("call:reject", { targetUserId: userId, conversationId: "" });
    setState("ended");
    setTimeout(() => navigation.goBack(), 500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <Avatar uri={avatarUrl} name={displayName} size={100} />
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.callType}>
          {callType === "video" ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"}
        </Text>
        <Text style={styles.status}>
          {state === "ringing" && (isIncoming ? "Kiruvchi qo'ng'iroq..." : "Qo'ng'iroq qilinmoqda...")}
          {state === "connected" && formatDuration(duration)}
          {state === "ended" && "Tugadi"}
        </Text>
      </View>

      <View style={styles.actions}>
        {state === "ringing" && isIncoming && (
          <TouchableOpacity style={[styles.actionBtn, styles.answerBtn]} onPress={onAnswer}>
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionLabel}>Javob berish</Text>
          </TouchableOpacity>
        )}
        {state === "ringing" && isIncoming && (
          <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={onReject}>
            <Text style={styles.actionIcon}>📵</Text>
            <Text style={styles.actionLabel}>Rad etish</Text>
          </TouchableOpacity>
        )}
        {(state === "ringing" && !isIncoming) && (
          <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={onEnd}>
            <Text style={styles.actionIcon}>📵</Text>
            <Text style={styles.actionLabel}>Bekor qilish</Text>
          </TouchableOpacity>
        )}
        {state === "connected" && (
          <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={onEnd}>
            <Text style={styles.actionIcon}>📵</Text>
            <Text style={styles.actionLabel}>Tugatish</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 80,
  },
  userInfo: { alignItems: "center" },
  displayName: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 16 },
  callType: { color: "rgba(255,255,255,0.7)", fontSize: 15, marginTop: 4 },
  status: { color: "rgba(255,255,255,0.6)", fontSize: 16, marginTop: 12 },
  actions: { flexDirection: "row", gap: 40 },
  actionBtn: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: "center", justifyContent: "center",
  },
  answerBtn: { backgroundColor: "#4CAF50" },
  endBtn: { backgroundColor: "#F44336" },
  actionIcon: { fontSize: 28 },
  actionLabel: { color: "#fff", fontSize: 11, marginTop: 4, position: "absolute", bottom: -20 },
});
