import "react-native-gesture-handler";
import "react-native-get-random-values";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
