/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable settings section container component
 */

import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

export interface SettingsSectionProps {
  children: ReactNode;
}

export function SettingsSection({ children }: SettingsSectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(255, 255, 255, 1)",
          borderWidth: colorScheme === "light" ? 1 : 0,
          borderColor:
            colorScheme === "light"
              ? "rgba(0, 0, 0, 0.1)"
              : "transparent",
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
  },
});






