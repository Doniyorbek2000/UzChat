import { Alert } from "react-native";

interface ApiError {
  error?: { message?: string; code?: string };
  message?: string;
}

export function showError(err: unknown, fallbackMessage = "Xatolik yuz berdi") {
  let message = fallbackMessage;

  if (err && typeof err === "object") {
    const apiErr = err as ApiError;
    if (apiErr.error?.message) {
      message = apiErr.error.message;
    } else if (apiErr.message) {
      message = apiErr.message;
    }
  } else if (typeof err === "string") {
    message = err;
  }

  Alert.alert("Xatolik", message);
}

export function getErrorMessage(err: unknown, fallback = "Xatolik yuz berdi"): string {
  if (err && typeof err === "object") {
    const apiErr = err as ApiError;
    if (apiErr.error?.message) return apiErr.error.message;
    if (apiErr.message) return apiErr.message;
  }
  if (typeof err === "string") return err;
  return fallback;
}
