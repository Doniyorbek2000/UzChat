import { Linking, StyleProp, Text, TextStyle } from "react-native";
import { colors } from "../theme/colors";

const URL_PATTERN = /(https?:\/\/[^\s<>"]+)/g;

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
}

export function Linkify({ text, style, linkStyle }: Props) {
  const parts = text.split(URL_PATTERN);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <Text key={i} style={linkStyle ?? styles.link} onPress={() => Linking.openURL(part)}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

const styles = {
  link: { color: colors.primary, textDecorationLine: "underline" as const },
};
