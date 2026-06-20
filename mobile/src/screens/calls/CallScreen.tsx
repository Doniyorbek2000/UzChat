import { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { Avatar } from "../../components/Avatar";
import { getSocket } from "../../socket/socket";

type Props = NativeStackScreenProps<RootStackParamList, "Call">;

type CallState = "ringing" | "connected" | "ended";

export function CallScreen({ navigation, route }: Props) {
  const { userId, displayName, avatarUrl, callType, isIncoming } = route.params;
  const [state, setState] = useState<CallState>("ringing");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isIncoming) {
      Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
    }
    return () => Vibration.cancel();
  }, [isIncoming]);

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

    const onAnswer = () => {
      Vibration.cancel();
      setState("connected");
    };
    const handleEnd = () => {
      Vibration.cancel();
      setState("ended");
      endTimeoutRef.current = setTimeout(() => navigation.goBack(), 1000);
    };

    socket.on("call:answer", onAnswer);
    socket.on("call:end", handleEnd);
    socket.on("call:reject", handleEnd);
    socket.on("call:busy", handleEnd);

    return () => {
      socket.off("call:answer", onAnswer);
      socket.off("call:end", handleEnd);
      socket.off("call:reject", handleEnd);
      socket.off("call:busy", handleEnd);
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
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
    Vibration.cancel();
    setState("connected");
    getSocket()?.emit("call:answer", { targetUserId: userId, answer: {} });
  };

  const onEnd = () => {
    Vibration.cancel();
    getSocket()?.emit("call:end", { targetUserId: userId, conversationId: "" });
    setState("ended");
    endTimeoutRef.current = setTimeout(() => navigation.goBack(), 500);
  };

  const onReject = () => {
    Vibration.cancel();
    getSocket()?.emit("call:reject", { targetUserId: userId, conversationId: "" });
    setState("ended");
    endTimeoutRef.current = setTimeout(() => navigation.goBack(), 500);
  };

  const statusText = () => {
    if (state === "ringing") return isIncoming ? "Kiruvchi qo'ng'iroq..." : "Qo'ng'iroq qilinmoqda...";
    if (state === "connected") return formatDuration(duration);
    return "Tugadi";
  };

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <Avatar uri={avatarUrl} name={displayName} size={100} />
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.callTypeLabel}>
          {callType === "video" ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"}
        </Text>
        <Text style={styles.status}>{statusText()}</Text>
      </View>

      {state === "connected" && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Text style={styles.controlIcon}>{isMuted ? "🔇" : "🎤"}</Text>
            <Text style={styles.controlLabel}>{isMuted ? "Ovoz yoq" : "Mikrofon"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
            onPress={() => setIsSpeaker(!isSpeaker)}
          >
            <Text style={styles.controlIcon}>{isSpeaker ? "🔊" : "🔈"}</Text>
            <Text style={styles.controlLabel}>{isSpeaker ? "Karnay" : "Quloq"}</Text>
          </TouchableOpacity>

          {callType === "video" && (
            <TouchableOpacity
              style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
              onPress={() => setIsVideoOff(!isVideoOff)}
            >
              <Text style={styles.controlIcon}>{isVideoOff ? "📷" : "📹"}</Text>
              <Text style={styles.controlLabel}>{isVideoOff ? "Video yoq" : "Video"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.actions}>
        {state === "ringing" && isIncoming && (
          <>
            <TouchableOpacity style={[styles.actionBtn, styles.answerBtn]} onPress={onAnswer}>
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionLabelBelow}>Javob berish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={onReject}>
              <Text style={styles.actionIcon}>📵</Text>
              <Text style={styles.actionLabelBelow}>Rad etish</Text>
            </TouchableOpacity>
          </>
        )}
        {state === "ringing" && !isIncoming && (
          <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={onEnd}>
            <Text style={styles.actionIcon}>📵</Text>
            <Text style={styles.actionLabelBelow}>Bekor qilish</Text>
          </TouchableOpacity>
        )}
        {state === "connected" && (
          <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={onEnd}>
            <Text style={styles.actionIcon}>📵</Text>
            <Text style={styles.actionLabelBelow}>Tugatish</Text>
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
  callTypeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 15, marginTop: 4 },
  status: { color: "rgba(255,255,255,0.6)", fontSize: 16, marginTop: 12 },
  controls: { flexDirection: "row", gap: 24 },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnActive: { backgroundColor: "rgba(255,255,255,0.35)" },
  controlIcon: { fontSize: 22 },
  controlLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 },
  actions: { flexDirection: "row", gap: 40 },
  actionBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  answerBtn: { backgroundColor: "#4CAF50" },
  endBtn: { backgroundColor: "#F44336" },
  actionIcon: { fontSize: 28 },
  actionLabelBelow: { color: "#fff", fontSize: 11, marginTop: 4, position: "absolute", bottom: -20 },
});
