import { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MediaStream, RTCView } from "react-native-webrtc";
import { RootStackParamList } from "../../navigation/types";
import { Avatar } from "../../components/Avatar";
import { getSocket } from "../../socket/socket";
import {
  addRemoteIceCandidate,
  answerIncomingCall,
  applyRemoteAnswer,
  endCallSession,
  setMuted,
  setVideoEnabled,
  startOutgoingCall,
  takePendingOffer,
} from "../../webrtc/callSession";

type Props = NativeStackScreenProps<RootStackParamList, "Call">;

type CallState = "ringing" | "connected" | "ended";

export function CallScreen({ navigation, route }: Props) {
  const { userId, displayName, avatarUrl, callType, isIncoming } = route.params;
  const [state, setState] = useState<CallState>("ringing");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The incoming offer is stashed by the global socket listener before this
  // screen mounts; keep it until the user answers.
  const incomingOfferRef = useRef(isIncoming ? takePendingOffer() : null);

  useEffect(() => {
    if (isIncoming) {
      Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
    }
    return () => Vibration.cancel();
  }, [isIncoming]);

  // Teardown on unmount, whatever path led there.
  useEffect(() => {
    return () => {
      endCallSession();
      Vibration.cancel();
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const sessionCallbacks = {
      onLocalStream: setLocalStream,
      onRemoteStream: setRemoteStream,
      onConnected: () => setState("connected"),
      onEnded: () => finishCall(),
    };

    if (!isIncoming) {
      startOutgoingCall(userId, "", callType, sessionCallbacks).catch(() => {
        Alert.alert("Xatolik", "Kamera/mikrofonga ruxsat berilmadi yoki qo'ng'iroqni boshlab bo'lmadi");
        finishCall();
      });
    }

    const onAnswer = (data: { answer: any }) => {
      Vibration.cancel();
      setState("connected");
      applyRemoteAnswer(data.answer).catch(() => {});
    };
    const onIceCandidate = (data: { candidate: any }) => {
      addRemoteIceCandidate(data.candidate).catch(() => {});
    };
    const handleEnd = () => {
      Vibration.cancel();
      endCallSession();
      setState("ended");
      endTimeoutRef.current = setTimeout(() => navigation.goBack(), 1000);
    };
    const onUnavailable = () => {
      Vibration.cancel();
      endCallSession();
      setState("ended");
      Alert.alert("", "Foydalanuvchi hozirda mavjud emas");
      endTimeoutRef.current = setTimeout(() => navigation.goBack(), 1500);
    };

    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:end", handleEnd);
    socket.on("call:reject", handleEnd);
    socket.on("call:busy", handleEnd);
    socket.on("call:timeout", handleEnd);
    socket.on("call:unavailable", onUnavailable);

    return () => {
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:end", handleEnd);
      socket.off("call:reject", handleEnd);
      socket.off("call:busy", handleEnd);
      socket.off("call:timeout", handleEnd);
      socket.off("call:unavailable", onUnavailable);
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, callType, isIncoming, navigation]);

  useEffect(() => {
    if (state !== "ringing") return;
    const timeout = setTimeout(() => {
      if (!isIncoming) {
        getSocket()?.emit("call:end", { targetUserId: userId, conversationId: "" });
      }
      finishCall();
    }, 60000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isIncoming, userId]);

  useEffect(() => {
    if (state !== "connected") return;
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  const finishCall = () => {
    Vibration.cancel();
    endCallSession();
    setState("ended");
    endTimeoutRef.current = setTimeout(() => navigation.goBack(), 800);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const onAnswer = () => {
    Vibration.cancel();
    const offer = incomingOfferRef.current;
    if (!offer) {
      Alert.alert("Xatolik", "Qo'ng'iroq ma'lumotlari topilmadi");
      finishCall();
      return;
    }
    answerIncomingCall(userId, callType, offer, {
      onLocalStream: setLocalStream,
      onRemoteStream: setRemoteStream,
      onConnected: () => setState("connected"),
      onEnded: () => finishCall(),
    }).catch(() => {
      Alert.alert("Xatolik", "Kamera/mikrofonga ruxsat berilmadi yoki javob berib bo'lmadi");
      getSocket()?.emit("call:reject", { targetUserId: userId, conversationId: "" });
      finishCall();
    });
    setState("connected");
  };

  const onEnd = () => {
    getSocket()?.emit("call:end", { targetUserId: userId, conversationId: "" });
    finishCall();
  };

  const onReject = () => {
    getSocket()?.emit("call:reject", { targetUserId: userId, conversationId: "" });
    finishCall();
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setMuted(next);
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    setVideoEnabled(!next);
  };

  const statusText = () => {
    if (state === "ringing") return isIncoming ? "Kiruvchi qo'ng'iroq..." : "Qo'ng'iroq qilinmoqda...";
    if (state === "connected") return remoteStream ? formatDuration(duration) : "Ulanmoqda...";
    return "Tugadi";
  };

  const showRemoteVideo = callType === "video" && remoteStream && state === "connected";
  const showLocalVideo = callType === "video" && localStream && !isVideoOff;

  return (
    <View style={styles.container}>
      {showRemoteVideo && (
        <RTCView streamURL={remoteStream!.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
      )}
      {showLocalVideo && (
        <RTCView streamURL={localStream!.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} mirror />
      )}

      {!showRemoteVideo && (
        <View style={styles.userInfo}>
          <Avatar uri={avatarUrl} name={displayName} size={100} />
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.callTypeLabel}>
            {callType === "video" ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"}
          </Text>
          <Text style={styles.status}>{statusText()}</Text>
        </View>
      )}
      {showRemoteVideo && (
        <View style={styles.videoStatusBar}>
          <Text style={styles.videoStatusName}>{displayName}</Text>
          <Text style={styles.videoStatusTime}>{formatDuration(duration)}</Text>
        </View>
      )}

      {state === "connected" && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={toggleMute}
          >
            <Text style={styles.controlIcon}>{isMuted ? "🔇" : "🎤"}</Text>
            <Text style={styles.controlLabel}>{isMuted ? "Ovoz yoq" : "Mikrofon"}</Text>
          </TouchableOpacity>

          {callType === "video" && (
            <TouchableOpacity
              style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
              onPress={toggleVideo}
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
  localVideo: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoStatusBar: { alignItems: "center" },
  videoStatusName: { color: "#fff", fontSize: 18, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 },
  videoStatusTime: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 2, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 },
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
