export interface ThemeColors {
  primary: string;
  primaryDark: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  bubbleSelf: string;
  bubbleOther: string;
  danger: string;
  online: string;
}

export const lightTheme: ThemeColors = {
  primary: "#07C160",
  primaryDark: "#06AD56",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  border: "#E5E5E5",
  text: "#1A1A1A",
  textSecondary: "#8C8C8C",
  bubbleSelf: "#A0E75A",
  bubbleOther: "#FFFFFF",
  danger: "#FA5151",
  online: "#07C160",
};

export const darkTheme: ThemeColors = {
  primary: "#07C160",
  primaryDark: "#06AD56",
  background: "#111111",
  surface: "#1E1E1E",
  border: "#2C2C2C",
  text: "#E5E5E5",
  textSecondary: "#8C8C8C",
  bubbleSelf: "#2B5F1E",
  bubbleOther: "#2A2A2A",
  danger: "#FA5151",
  online: "#07C160",
};
