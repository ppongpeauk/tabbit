/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable toolbar button components with haptics
 */

import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { GlassView } from "expo-glass-effect";

interface ToolbarButtonProps {
  onPress: () => void;
  icon?: SymbolViewProps["name"];
  label?: string;
  variant?: "primary" | "secondary" | "glass" | "danger";
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
    const containerStyle = label ? styles.glassButton : styles.glassIconButton;
    return (
      <View
        style={[
          containerStyle,
          {
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        <GlassView
          glassEffectStyle="regular"
          style={[
            styles.glassLayer,
            {
              borderRadius: 28,
            },
          ]}
        />
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          style={[
            styles.glassButtonInner,
            label && { paddingHorizontal: 20 },
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
      </View>
    );
  }

  if (variant === "secondary") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          label ? styles.secondaryButton : styles.secondaryIconButton,
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

  if (variant === "danger") {
    const containerStyle = label ? styles.dangerButton : styles.dangerIconButton;
    return (
      <View
        style={[
          containerStyle,
          {
            borderColor: isDark
              ? "rgba(239, 68, 68, 0.4)"
              : "rgba(239, 68, 68, 0.3)",
          },
        ]}
      >
        <GlassView
          glassEffectStyle="regular"
          style={[
            styles.glassLayer,
            {
              borderRadius: 28,
            },
          ]}
        />
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          style={[
            styles.dangerButtonInner,
            label && { paddingHorizontal: 20 },
          ]}
        >
          {icon && (
            <SymbolView name={icon} tintColor="#EF4444" style={styles.icon} />
          )}
          {label && (
            <ThemedText
              size="base"
              weight="semibold"
              style={{
                color: "#EF4444",
              }}
            >
              {label}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
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
  secondaryIconButton: {
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
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  glassIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  glassLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  glassButtonInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: "100%",
    position: "relative",
    zIndex: 1,
  },
  dangerButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  dangerIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  dangerButtonInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: "100%",
    position: "relative",
    zIndex: 1,
  },
});
