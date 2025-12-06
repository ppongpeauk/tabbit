/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Shared checkbox button component with animated selection state for contact/item selection
 */

import { useEffect } from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { AnimationConfig } from "@/utils/config";

export interface CheckboxButtonProps {
  id: string;
  label: string;
  subtitle?: string;
  imageUri?: string;
  isSelected: boolean;
  onPress: () => void;
}

export function CheckboxButton({
  id,
  label,
  subtitle,
  imageUri,
  isSelected,
  onPress,
}: CheckboxButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const selectionProgress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selectionProgress.value = withTiming(isSelected ? 1 : 0, {
      duration: AnimationConfig.fast,
    });
  }, [isSelected, selectionProgress]);

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const unselectedBorderColor = isDark
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(0, 0, 0, 0.15)";
    const selectedBorderColor = isDark ? Colors.dark.tint : Colors.light.tint;

    return {
      borderColor: interpolateColor(
        selectionProgress.value,
        [0, 1],
        [unselectedBorderColor, selectedBorderColor]
      ),
    };
  });

  const checkboxBorderAnimatedStyle = useAnimatedStyle(() => {
    const unselectedBorderColor = isDark
      ? "rgba(255, 255, 255, 0.4)"
      : "rgba(0, 0, 0, 0.4)";
    const selectedBorderColor = isDark ? Colors.dark.tint : Colors.light.tint;

    return {
      borderColor: interpolateColor(
        selectionProgress.value,
        [0, 1],
        [unselectedBorderColor, selectedBorderColor]
      ),
    };
  });

  const checkboxBgAnimatedStyle = useAnimatedStyle(() => {
    const unselectedBg = "transparent";
    const selectedBg = isDark ? Colors.dark.tint : Colors.light.tint;

    return {
      backgroundColor: interpolateColor(
        selectionProgress.value,
        [0, 1],
        [unselectedBg, selectedBg]
      ),
    };
  });

  const checkmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: selectionProgress.value,
      transform: [{ scale: selectionProgress.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, borderAnimatedStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressableContent,
          {
            backgroundColor: pressed
              ? isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.04)"
              : isSelected
              ? isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)"
              : "transparent",
          },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          >
            <ThemedText
              size="sm"
              weight="semibold"
              style={{
                color: isDark ? Colors.dark.text : Colors.light.text,
              }}
            >
              {label.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
        <View style={styles.content}>
          <ThemedText
            size="base"
            weight={isSelected ? "semibold" : "normal"}
            style={[
              styles.label,
              isSelected && {
                color: isDark ? Colors.dark.tint : Colors.light.tint,
              },
            ]}
          >
            {label}
          </ThemedText>
          {subtitle && (
            <ThemedText
              size="sm"
              style={[
                styles.subtitle,
                {
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                },
              ]}
            >
              {subtitle}
            </ThemedText>
          )}
        </View>
        <Animated.View
          style={[
            styles.checkbox,
            checkboxBorderAnimatedStyle,
            checkboxBgAnimatedStyle,
          ]}
        >
          <Animated.View style={checkmarkAnimatedStyle}>
            <SymbolView
              name="checkmark"
              tintColor={isDark ? Colors.dark.background : "white"}
              size={14}
            />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  pressableContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.sans,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

