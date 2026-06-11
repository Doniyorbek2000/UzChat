import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAppLockStore } from "../../store/appLockStore";
import { PinPad } from "../../components/PinPad";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "AppLockSettings">;

type Step = "setNew1" | "setNew2" | "disableConfirm" | "changeOld" | "changeNew1" | "changeNew2";

const STEP_TITLES: Record<Step, string> = {
  setNew1: "Yangi PIN kod o'rnating",
  setNew2: "PIN kodni tasdiqlang",
  disableConfirm: "Joriy PIN kodni kiriting",
  changeOld: "Joriy PIN kodni kiriting",
  changeNew1: "Yangi PIN kod o'rnating",
  changeNew2: "Yangi PIN kodni tasdiqlang",
};

export function AppLockSettingsScreen({}: Props) {
  const isEnabled = useAppLockStore((s) => s.isEnabled);
  const verifyPin = useAppLockStore((s) => s.verifyPin);
  const setPin = useAppLockStore((s) => s.setPin);
  const removePin = useAppLockStore((s) => s.removePin);

  const [step, setStep] = useState<Step | null>(null);
  const [pendingPin, setPendingPin] = useState("");
  const [error, setError] = useState("");
  const [resetKey, setResetKey] = useState(0);

  const cancel = () => {
    setStep(null);
    setPendingPin("");
    setError("");
  };

  const onComplete = async (pin: string) => {
    switch (step) {
      case "setNew1":
      case "changeNew1":
        setPendingPin(pin);
        setError("");
        setResetKey((k) => k + 1);
        setStep(step === "setNew1" ? "setNew2" : "changeNew2");
        break;

      case "setNew2":
      case "changeNew2":
        if (pin !== pendingPin) {
          setError("PIN kodlar mos kelmadi, qaytadan urining");
          setPendingPin("");
          setResetKey((k) => k + 1);
          setStep(step === "setNew2" ? "setNew1" : "changeNew1");
        } else {
          await setPin(pin);
          cancel();
        }
        break;

      case "disableConfirm":
        if (await verifyPin(pin)) {
          await removePin();
          cancel();
        } else {
          setError("Noto'g'ri PIN kod");
          setResetKey((k) => k + 1);
        }
        break;

      case "changeOld":
        if (await verifyPin(pin)) {
          setError("");
          setResetKey((k) => k + 1);
          setStep("changeNew1");
        } else {
          setError("Noto'g'ri PIN kod");
          setResetKey((k) => k + 1);
        }
        break;
    }
  };

  if (step) {
    return (
      <View style={styles.container}>
        <PinPad title={STEP_TITLES[step]} error={error} resetKey={resetKey} onComplete={onComplete} />
        <TouchableOpacity style={styles.cancelButton} onPress={cancel}>
          <Text style={styles.cancelText}>Bekor qilish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>PIN kod bilan qulflash</Text>
        <Switch
          value={isEnabled}
          onValueChange={(value) => setStep(value ? "setNew1" : "disableConfirm")}
          trackColor={{ true: colors.primary }}
        />
      </View>
      {isEnabled && (
        <TouchableOpacity style={styles.row} onPress={() => setStep("changeOld")}>
          <Text style={styles.rowLabel}>PIN kodni o'zgartirish</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.description}>
        Yoqilganda, ilova fonga o'tib qaytarilganda yoki qayta ochilganda 4 xonali PIN kod so'raladi.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  rowLabel: { fontSize: 16, color: colors.text },
  rowArrow: { fontSize: 18, color: colors.textSecondary },
  description: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  cancelButton: { alignItems: "center", marginTop: 32 },
  cancelText: { fontSize: 15, color: colors.textSecondary },
});
