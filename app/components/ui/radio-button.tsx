/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Shared radio button component with icon support and animated selection state
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { AnimationConfig } from "@/utils/config";

export interface RadioButtonOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface RadioButtonProps {
  value: string;
  label: string;
  icon?: string;
  description?: string;
  example?: React.ReactNode;
  isSelected: boolean;
  onPress: () => void;
}

export function RadioButton({
  value,
  label,
  icon,
  description,
  example,
  isSelected,
  onPress,
}: RadioButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const selectionProgress = useSharedValue(isSelected ? 1 : 0);
  const expandProgress = useSharedValue(isSelected ? 1 : 0);
  const prevSelectedRef = useRef(isSelected);
  const isInitialMount = useRef(true);
  const baseHeight = useSharedValue(0);
  const descriptionHeight = useSharedValue(0);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      selectionProgress.value = isSelected ? 1 : 0;
      expandProgress.value = isSelected ? 1 : 0;
      return;
    }

    if (prevSelectedRef.current !== isSelected) {
      prevSelectedRef.current = isSelected;
      selectionProgress.value = withTiming(isSelected ? 1 : 0, {
        duration: AnimationConfig.fast,
        easing: Easing.out(Easing.ease),
      });
      // Use consistent timing for both expand and collapse to prevent layout shifts
      expandProgress.value = withTiming(isSelected ? 1 : 0, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isSelected, selectionProgress, expandProgress]);

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

  const radioBorderAnimatedStyle = useAnimatedStyle(() => {
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

  const radioBgAnimatedStyle = useAnimatedStyle(() => {
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

  const radioInnerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: selectionProgress.value,
      transform: [{ scale: selectionProgress.value }],
    };
  });

  const buttonContainerStyle = useAnimatedStyle(() => {
    const progress = expandProgress.value;
    const base = baseHeight.value > 0 ? baseHeight.value : 56;
    const desc = descriptionHeight.value > 0 ? descriptionHeight.value : 0;

    // Use maxHeight with a small buffer to prevent clipping while maintaining smooth animation
    const totalHeight = description ? base + progress * desc : base;
    return {
      maxHeight: totalHeight,
      minHeight: base,
    };
  });

  const descriptionContainerStyle = useAnimatedStyle(() => {
    const progress = expandProgress.value;
    return {
      opacity: progress,
      transform: [
        {
          translateY: (1 - progress) * -4,
        },
      ],
      pointerEvents: progress > 0.01 ? "auto" : "none",
    };
  });

  return (
    <>
      {description && (
        <View
          style={styles.hiddenMeasureView}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            if (height > 0) {
              descriptionHeight.value = height;
            }
          }}
        >
          <ThemedText
            size="sm"
            style={[
              styles.descriptionText,
              {
                color: isDark
                  ? "rgba(255, 255, 255, 0.7)"
                  : "rgba(0, 0, 0, 0.7)",
              },
            ]}
          >
            {description}
          </ThemedText>
          {example && <View style={styles.exampleContainer}>{example}</View>}
        </View>
      )}
      <Animated.View
        style={[
          styles.optionButton,
          borderAnimatedStyle,
          buttonContainerStyle,
        ]}
      >
        <Pressable
          cssInterop={false}
          onPress={onPress}
          style={({ pressed }) => [
            styles.pressableContainer,
            {
              backgroundColor: pressed
                ? isDark
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.04)"
                : "transparent",
            },
          ]}
        >
          <View
            style={styles.pressableContent}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              if (height > 0) {
                // Always update to ensure consistency, especially when content changes
                baseHeight.value = height;
              }
            }}
          >
            <View style={styles.optionContent}>
              {icon && (
                <SymbolView
                  name={icon as SymbolViewProps["name"]}
                  tintColor={
                    isSelected
                      ? isDark
                        ? Colors.dark.tint
                        : Colors.light.tint
                      : isDark
                        ? Colors.dark.text
                        : Colors.light.text
                  }
                  size={24}
                />
              )}
              <ThemedText
                size="base"
                weight={isSelected ? "semibold" : "normal"}
                style={[
                  styles.optionLabel,
                  isSelected && {
                    color: isDark ? Colors.dark.tint : Colors.light.tint,
                  },
                ]}
              >
                {label}
              </ThemedText>
            </View>
            <Animated.View
              style={[
                styles.radioButton,
                radioBorderAnimatedStyle,
                radioBgAnimatedStyle,
              ]}
            >
              <Animated.View
                style={[
                  styles.radioButtonInner,
                  radioInnerAnimatedStyle,
                  {
                    backgroundColor: isDark ? Colors.dark.background : "white",
                  },
                ]}
              />
            </Animated.View>
          </View>
          {description && (
            <Animated.View
              style={[styles.descriptionContainer, descriptionContainerStyle]}
            >
              <ThemedText
                size="sm"
                style={[
                  styles.descriptionText,
                  {
                    color: isDark
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                  },
                ]}
              >
                {description}
              </ThemedText>
              {example && (
                <View style={styles.exampleContainer}>{example}</View>
              )}
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  optionButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: "transparent",
    minHeight: 56,
  },
  pressableContainer: {
    width: "100%",
  },
  pressableContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionLabel: {
    fontFamily: Fonts.sans,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hiddenMeasureView: {
    position: "absolute",
    opacity: 0,
    zIndex: -1,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  descriptionContainer: {
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  descriptionText: {},
  exampleContainer: {
    marginTop: 8,
  },
});
