import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { gamesApi } from "../../api/games";

type Props = NativeStackScreenProps<RootStackParamList, "GameView">;

export function GameViewScreen({ route }: Props) {
  const { gameId, url } = route.params;

  React.useEffect(() => {
    gamesApi.play(gameId).catch(() => {});
  }, [gameId]);

  return (
    <View style={styles.container}>
      <WebView source={{ uri: url }} style={styles.webview} javaScriptEnabled domStorageEnabled />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1 },
});
