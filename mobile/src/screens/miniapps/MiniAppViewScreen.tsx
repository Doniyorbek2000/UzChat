import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Share, Alert, Linking } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { useAuthStore } from "../../store/authStore";
import { miniAppsApi, MiniApp } from "../../api/miniapps";
import { paymentsApi } from "../../api/payments";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WebView } = require("react-native-webview");

type Props = NativeStackScreenProps<RootStackParamList, "MiniAppView">;

// Mini-app SDK: pages loaded inside UzChat get a `window.UzChat` object with
// a promise-based RPC bridge. Sensitive calls (profile, payments) always go
// through a native confirmation dialog — the page can ask, the user decides.
//
//   const user = await UzChat.getUser();
//   const res  = await UzChat.requestPayment({ amount: 15000, note: "Taksi" });
//   UzChat.close(); UzChat.openLink(url); UzChat.share(text);
//   UzChat.theme — the host theme's colors for seamless styling.
function buildInjectedSdk(themeJson: string) {
  return `
(function () {
  if (window.UzChat) return;
  var seq = 0;
  var pending = {};
  window.UzChat = {
    version: "1.0",
    platform: "uzchat",
    theme: ${themeJson},
    _resolve: function (id, ok, payload) {
      var p = pending[id];
      if (!p) return;
      delete pending[id];
      if (ok) p.resolve(payload); else p.reject(new Error(payload && payload.message ? payload.message : "rejected"));
    },
    _call: function (method, params) {
      return new Promise(function (resolve, reject) {
        var id = "m" + (++seq);
        pending[id] = { resolve: resolve, reject: reject };
        window.ReactNativeWebView.postMessage(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    },
    getUser: function () { return this._call("getUser"); },
    requestPayment: function (opts) { return this._call("requestPayment", opts); },
    share: function (text) { return this._call("share", { text: text }); },
    openLink: function (url) { return this._call("openLink", { url: url }); },
    close: function () { return this._call("close"); },
    ready: function () { return this._call("ready"); }
  };
  window.dispatchEvent(new Event("uzchat-ready"));
})();
true;`;
}

const MAX_PAYMENT_UZS = 10_000_000;

export function MiniAppViewScreen({ route, navigation }: Props) {
  const { id, name, url } = route.params;
  const webViewRef = useRef<{ goBack: () => void; reload: () => void; injectJavaScript: (js: string) => void } | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [app, setApp] = useState<MiniApp | null>(null);
  const user = useAuthStore((s) => s.user);
  // The user grants profile access once per mini-app session.
  const profileGrantedRef = useRef(false);
  const paymentInFlightRef = useRef(false);

  useEffect(() => {
    miniAppsApi.getById(id).then(setApp).catch(() => {});
  }, [id]);

  const respond = (msgId: string, ok: boolean, payload: unknown) => {
    const js = `window.UzChat && window.UzChat._resolve(${JSON.stringify(msgId)}, ${ok}, ${JSON.stringify(payload)}); true;`;
    webViewRef.current?.injectJavaScript(js);
  };

  const confirmDialog = (title: string, message: string, confirmLabel: string) =>
    new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        { text: "Bekor qilish", style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, onPress: () => resolve(true) },
      ]);
    });

  const onBridgeMessage = async (event: { nativeEvent: { data: string; url?: string } }) => {
    let msg: { id: string; method: string; params: Record<string, unknown> };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!msg || typeof msg.id !== "string" || typeof msg.method !== "string") return;

    // Sensitive calls only from the mini-app's own origin (no third-party iframes/redirects).
    const sensitive = msg.method === "getUser" || msg.method === "requestPayment";
    if (sensitive) {
      try {
        const appOrigin = new URL(url).origin;
        const frameOrigin = event.nativeEvent.url ? new URL(event.nativeEvent.url).origin : null;
        if (frameOrigin !== appOrigin) {
          respond(msg.id, false, { message: "FORBIDDEN_ORIGIN" });
          return;
        }
      } catch {
        respond(msg.id, false, { message: "FORBIDDEN_ORIGIN" });
        return;
      }
    }

    switch (msg.method) {
      case "ready": {
        respond(msg.id, true, { platform: "uzchat" });
        break;
      }
      case "close": {
        respond(msg.id, true, null);
        navigation.goBack();
        break;
      }
      case "openLink": {
        const link = String(msg.params?.url ?? "");
        if (/^https?:\/\//i.test(link)) {
          Linking.openURL(link).catch(() => {});
          respond(msg.id, true, null);
        } else {
          respond(msg.id, false, { message: "INVALID_URL" });
        }
        break;
      }
      case "share": {
        const text = String(msg.params?.text ?? "").slice(0, 1000);
        if (!text) {
          respond(msg.id, false, { message: "EMPTY_TEXT" });
          break;
        }
        try {
          await Share.share({ message: text });
          respond(msg.id, true, null);
        } catch {
          respond(msg.id, false, { message: "CANCELLED" });
        }
        break;
      }
      case "getUser": {
        if (!user) {
          respond(msg.id, false, { message: "NOT_AUTHENTICATED" });
          break;
        }
        if (!profileGrantedRef.current) {
          const ok = await confirmDialog(
            name,
            `"${name}" mini-dasturi profilingizni (ism, username) so'rayapti. Ruxsat berasizmi?`,
            "Ruxsat berish"
          );
          if (!ok) {
            respond(msg.id, false, { message: "USER_DENIED" });
            break;
          }
          profileGrantedRef.current = true;
        }
        respond(msg.id, true, { id: user.id, displayName: user.displayName, username: user.username });
        break;
      }
      case "requestPayment": {
        const amount = Math.floor(Number(msg.params?.amount));
        const note = typeof msg.params?.note === "string" ? msg.params.note.slice(0, 200) : undefined;
        if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PAYMENT_UZS) {
          respond(msg.id, false, { message: "INVALID_AMOUNT" });
          break;
        }
        if (!app) {
          respond(msg.id, false, { message: "APP_NOT_READY" });
          break;
        }
        if (paymentInFlightRef.current) {
          respond(msg.id, false, { message: "PAYMENT_IN_PROGRESS" });
          break;
        }
        paymentInFlightRef.current = true;
        try {
          const ok = await confirmDialog(
            "To'lovni tasdiqlang",
            `${amount.toLocaleString()} so'm — "${app.name}" (@${app.creator.username}) hisobiga UzChat hamyonidan yechiladi.${note ? `\n\nIzoh: ${note}` : ""}`,
            "To'lash"
          );
          if (!ok) {
            respond(msg.id, false, { message: "USER_DENIED" });
            break;
          }
          const payment = await paymentsApi.send(app.creator.id, amount, note ?? `Mini-app: ${app.name}`);
          respond(msg.id, true, { paymentId: payment.id, status: payment.status, amount: payment.amount });
        } catch (err: any) {
          const message = err?.response?.data?.error?.message ?? "PAYMENT_FAILED";
          Alert.alert("To'lov amalga oshmadi", String(message));
          respond(msg.id, false, { message: String(message) });
        } finally {
          paymentInFlightRef.current = false;
        }
        break;
      }
      default:
        respond(msg.id, false, { message: "UNKNOWN_METHOD" });
    }
  };

  const onShare = () => {
    Share.share({ message: `${name} mini-dasturini UzChat'da ochish: ${url}` }).catch(() => {});
  };

  const themeJson = JSON.stringify({
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    textSecondary: colors.textSecondary,
  });

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolbarBtn} activeOpacity={0.6}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.toolbarCenter}>
          <Text style={styles.toolbarTitle} numberOfLines={1}>{name}</Text>
          {loading ? (
            <Text style={styles.toolbarSubtitle}>Yuklanmoqda...</Text>
          ) : app ? (
            <Text style={styles.toolbarSubtitle}>@{app.creator.username}</Text>
          ) : null}
        </View>
        <View style={styles.toolbarRight}>
          {canGoBack && (
            <TouchableOpacity onPress={() => webViewRef.current?.goBack()} style={styles.toolbarBtn} activeOpacity={0.6}>
              <Text style={styles.actionIcon}>←</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.toolbarBtn} activeOpacity={0.6}>
            <Text style={styles.actionIcon}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.toolbarBtn} activeOpacity={0.6}>
            <Text style={styles.shareIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading && progress < 1 && (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.max(progress * 100, 5)}%` }]} />
        </View>
      )}
      {loading && progress === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => { setLoading(true); setProgress(0); }}
        onLoadEnd={() => { setLoading(false); setProgress(1); }}
        onLoadProgress={({ nativeEvent }: { nativeEvent: { progress: number } }) => setProgress(nativeEvent.progress)}
        onNavigationStateChange={(navState: { canGoBack: boolean }) => setCanGoBack(navState.canGoBack)}
        onMessage={onBridgeMessage}
        injectedJavaScriptBeforeContentLoaded={buildInjectedSdk(themeJson)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsInlineMediaPlayback
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 4,
  },
  toolbarBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  closeBtnText: { fontSize: 18, color: colors.textSecondary, fontWeight: "500" },
  toolbarCenter: { flex: 1, alignItems: "center" },
  toolbarTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  toolbarSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  toolbarRight: { flexDirection: "row", alignItems: "center" },
  actionIcon: { fontSize: 20, color: colors.primary, fontWeight: "600" },
  shareIcon: { fontSize: 16 },
  progressBarBg: {
    height: 2,
    backgroundColor: colors.border,
  },
  progressBarFill: {
    height: 2,
    backgroundColor: colors.primary,
  },
  webview: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
