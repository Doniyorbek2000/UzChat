import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthStackParamList } from "./types";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { VerifyOtpScreen } from "../screens/auth/VerifyOtpScreen";
import { TwoFactorLoginScreen } from "../screens/auth/TwoFactorLoginScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="VerifyOtp"
        component={VerifyOtpScreen}
        options={{ headerShown: true, title: "Tasdiqlash" }}
      />
      <Stack.Screen
        name="TwoFactorLogin"
        component={TwoFactorLoginScreen}
        options={{ headerShown: true, title: "Ikki bosqichli tekshiruv" }}
      />
    </Stack.Navigator>
  );
}
