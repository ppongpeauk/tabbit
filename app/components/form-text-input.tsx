/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable form text input component with label and theme support
 */

import { TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { ReactNode, ReactElement, cloneElement, isValidElement } from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "./themed-text";

export type FormTextInputProps = TextInputProps & {
  label?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function FormTextInput({
  label,
  style,
  leftIcon,
  rightIcon,
  ...textInputProps
}: FormTextInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const iconColor = colors.icon;

  const hasLeftIcon = !!leftIcon;
  const hasRightIcon = !!rightIcon;

  const renderIcon = (icon: ReactNode) => {
    if (!icon) return null;
    if (isValidElement(icon)) {
      // Clone the icon element and apply the tint color
      return cloneElement(icon as ReactElement<{ color?: string }>, {
        color: iconColor,
      });
    }
    return icon;
  };

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText size="base" weight="semibold" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <View style={styles.inputContainer}>
        {hasLeftIcon && (
          <View style={styles.leftIconContainer}>{renderIcon(leftIcon)}</View>
        )}
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : colors.background,
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
              color: colors.text,
              paddingLeft: hasLeftIcon ? 48 : 16,
              paddingRight: hasRightIcon ? 48 : 16,
            },
            style,
          ]}
          placeholderTextColor={colors.icon}
        />
        {hasRightIcon && (
          <View style={styles.rightIconContainer}>{renderIcon(rightIcon)}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    textAlign: "left",
  },
  inputContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    fontFamily: Fonts.sans,
  },
  leftIconContainer: {
    position: "absolute",
    left: 16,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rightIconContainer: {
    position: "absolute",
    right: 16,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
