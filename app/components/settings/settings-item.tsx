/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable settings menu item component
 */

import { ReactNode } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";

export interface SettingsItemProps {
  label: string;
  onPress: () => void;
  value?: string;
  showChevron?: boolean;
  variant?: "default" | "destructive";
  disabled?: boolean;
  rightContent?: ReactNode;
}

export function SettingsItem({
  label,
  onPress,
  value,
  showChevron = false,
  variant = "default",
  disabled = false,
  rightContent,
}: SettingsItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const pressedBg = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const isDestructive = variant === "destructive";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: pressed ? pressedBg : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.label,
          isDestructive && { color: "#FF3B30" },
        ]}
      >
        {label}
      </ThemedText>
      <View style={styles.rightContent}>
        {rightContent || (
          <>
            {value && (
              <ThemedText
                style={[
                  styles.value,
                  {
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  },
                ]}
              >
                {value}
              </ThemedText>
            )}
            {showChevron && (
              <SymbolView
                name="chevron.right"
                size={18}
                tintColor={
                  isDark ? Colors.dark.icon : Colors.light.icon
                }
              />
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  value: {
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
});

