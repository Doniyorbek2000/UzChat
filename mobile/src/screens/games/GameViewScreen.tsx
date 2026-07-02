import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { gamesApi } from "../../api/games";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "GameView">;

export function GameViewScreen({ route, navigation }: Props) {
  const { gameId, url, title } = route.params;
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    navigation.setOptions({ title: title || "O'yin" });
    gamesApi.play(gameId).catch(() => {});
  }, [gameId, title, navigation]);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{tr("O'yinni yuklab bo'lmadi")}</Text>
        <Text style={styles.errorHint}>{tr("Internet aloqangizni tekshiring")}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => setHasError(false)}>
          <Text style={styles.retryText}>{tr("Qayta urinish")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{tr("Ortga")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {progress < 1 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yuklanmoqda... {Math.round(progress * 100)}%</Text>
        </View>
      )}
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        onError={() => setHasError(true)}
        onHttpError={() => setHasError(true)}
        startInLoadingState={false}
        allowsInlineMediaPlayback
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#fff", marginTop: 12, fontSize: 14 },
  errorContainer: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 32 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 18, fontWeight: "700", color: colors.text },
  errorHint: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: "center" },
  retryBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  backBtn: { marginTop: 12 },
  backText: { color: colors.textSecondary, fontSize: 14 },
});
