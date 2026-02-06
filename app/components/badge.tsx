/**
 * @author Composer
 * @description Badge component for displaying status/role indicators
 */

import { View } from "react-native";
import { ThemedText } from "./themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger" | "warning";
}

export function Badge({ children, variant = "primary" }: BadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const getBadgeStyle = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
        };
      case "secondary":
        return {
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        };
      case "success":
        return {
          backgroundColor: "#22c55e",
        };
      case "danger":
        return {
          backgroundColor: "#ef4444",
        };
      case "warning":
        return {
          backgroundColor: "#f59e0b",
        };
      default:
        return {
          backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
        };
    }
  };

  const getTextColor = () => {
    if (variant === "secondary") {
      return isDark ? Colors.dark.text : Colors.light.text;
    }
    return "#ffffff";
  };

  return (
    <View
      className="px-3 py-1 rounded-full"
      style={[getBadgeStyle()]}
    >
      <ThemedText
        size="xs"
        weight="semibold"
        style={{ color: getTextColor() }}
      >
        {children}
      </ThemedText>
    </View>
  );
}
