/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable settings modal footer component
 */

import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

export interface SettingsModalFooterProps {
  children: ReactNode;
}

export function SettingsModalFooter({
  children,
}: SettingsModalFooterProps) {
  const colorScheme = useColorScheme();
  const separatorColor = colorScheme === "dark"
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.1)";

  return (
    <View
      style={[
        styles.footer,
        {
          borderTopColor: separatorColor,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
});



