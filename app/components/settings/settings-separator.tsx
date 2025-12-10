/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable settings item separator component
 */

import { View, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function SettingsSeparator() {
  const colorScheme = useColorScheme();
  const separatorColor =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";

  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: separatorColor },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
});






