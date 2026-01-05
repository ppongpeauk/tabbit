/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable toolbar button components with haptics
 */

import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { SymbolView, SymbolName } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";

interface ToolbarButtonProps {
  onPress: () => void;
  icon?: SymbolName;
  label?: string;
  variant?: "primary" | "secondary" | "glass";
}

export function ToolbarButton({
  onPress,
  icon,
  label,
  variant = "primary",
}: ToolbarButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (variant === "glass") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          label ? styles.glassButton : styles.glassIconButton,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.05)",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        {icon && (
          <SymbolView
            name={icon}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
            style={styles.icon}
          />
        )}
        {label && (
          <ThemedText
            size="base"
            weight="semibold"
            style={{
              color: isDark ? Colors.dark.text : Colors.light.text,
            }}
          >
            {label}
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === "secondary") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.secondaryButton,
          {
            backgroundColor: isDark ? Colors.dark.surface : "#F5F5F5",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        {icon && (
          <SymbolView
            name={icon}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
            style={styles.icon}
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.primaryButton,
        {
          backgroundColor: isDark ? "#FFFFFF" : Colors.light.text,
        },
      ]}
    >
      {icon && (
        <SymbolView
          name={icon}
          tintColor={isDark ? Colors.dark.background : "#FFFFFF"}
          style={styles.icon}
        />
      )}
      {label && (
        <ThemedText
          size="base"
          weight="bold"
          style={{
            color: isDark ? Colors.dark.background : "#FFFFFF",
          }}
        >
          {label}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
  },
  icon: {
    width: 24,
    height: 24,
  },
  glassButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  glassIconButton: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
  },
});

