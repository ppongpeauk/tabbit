/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable settings modal header component
 */

import { ReactNode } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";

export interface SettingsModalHeaderProps {
  title: string;
  onClose: () => void;
  rightAction?: ReactNode;
}

export function SettingsModalHeader({
  title,
  onClose,
  rightAction,
}: SettingsModalHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const separatorColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.1)";

  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: separatorColor,
        },
      ]}
    >
      <ThemedText size="xl" weight="bold">
        {title}
      </ThemedText>
      <View style={styles.rightActions}>
        {rightAction}
        <Pressable onPress={onClose}>
          <SymbolView
            name="xmark"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
});







