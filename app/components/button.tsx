import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { ReactNode, ReactElement, cloneElement, isValidElement } from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "./themed-text";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "base" | "lg";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  /** Button text content */
  children: ReactNode;
  /** Button variant style */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Show loading spinner */
  loading?: boolean;
  /** Icon to display on the left side */
  leftIcon?: ReactNode;
  /** Icon to display on the right side */
  rightIcon?: ReactNode;
  /** Custom style for the button container */
  style?: ViewStyle;
  /** Whether button should take full width */
  fullWidth?: boolean;
}

/**
 * Flexible button component with multiple variants, sizes, and dark mode support
 */
export function Button({
  children,
  variant = "primary",
  size = "base",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  fullWidth = false,
  ...pressableProps
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[colorScheme ?? "light"];

  const isDisabled = disabled || loading;

  // Get variant-specific styles
  const getVariantStyles = (): {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    pressedBackgroundColor: string;
  } => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: isDark ? "#FFFFFF" : "#000000",
          borderColor: "transparent",
          textColor: isDark ? "#000000" : "#FFFFFF",
          pressedBackgroundColor: isDark
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(0, 0, 0, 0.9)",
        };
      case "secondary":
        return {
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.05)",
          borderColor: "transparent",
          textColor: colors.text,
          pressedBackgroundColor: isDark
            ? "rgba(255, 255, 255, 0.15)"
            : "rgba(0, 0, 0, 0.1)",
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(0, 0, 0, 0.2)",
          textColor: colors.text,
          pressedBackgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.05)",
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          textColor: colors.tint,
          pressedBackgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.05)",
        };
      case "destructive":
        return {
          backgroundColor: "#FF3B30",
          borderColor: "transparent",
          textColor: "#FFFFFF",
          pressedBackgroundColor: "rgba(255, 59, 48, 0.9)",
        };
      default:
        return {
          backgroundColor: isDark ? "#FFFFFF" : "#000000",
          borderColor: "transparent",
          textColor: isDark ? "#000000" : "#FFFFFF",
          pressedBackgroundColor: isDark
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(0, 0, 0, 0.9)",
        };
    }
  };

  // Get size-specific styles
  const getSizeStyles = (): {
    paddingVertical: number;
    paddingHorizontal: number;
    fontSize: number;
    iconSize: number;
  } => {
    switch (size) {
      case "sm":
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          fontSize: 14,
          iconSize: 16,
        };
      case "lg":
        return {
          paddingVertical: 18,
          paddingHorizontal: 24,
          fontSize: 18,
          iconSize: 20,
        };
      default: // base
        return {
          paddingVertical: 14,
          paddingHorizontal: 20,
          fontSize: 16,
          iconSize: 18,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const renderIcon = (icon: ReactNode, position: "left" | "right") => {
    if (!icon) return null;
    if (isValidElement(icon)) {
      // Handle SymbolView and other icon components
      const iconProps: { color?: string; tintColor?: string; size?: number } = {};

      // Check if icon already has tintColor prop (SymbolView) or color prop
      const hasTintColor = icon.props && "tintColor" in icon.props;
      const iconTypeName = icon.type && typeof icon.type === "function" ? icon.type.name : "";

      // SymbolView uses tintColor, regular icons use color
      if (hasTintColor || iconTypeName === "SymbolView") {
        iconProps.tintColor = variantStyles.textColor;
        iconProps.size = sizeStyles.iconSize;
      } else {
        iconProps.color = variantStyles.textColor;
        iconProps.size = sizeStyles.iconSize;
      }

      return cloneElement(icon as ReactElement, iconProps);
    }
    return icon;
  };

  return (
    <Pressable
      {...pressableProps}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled
            ? isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)"
            : pressed
            ? variantStyles.pressedBackgroundColor
            : variantStyles.backgroundColor,
          borderColor:
            variant === "outline"
              ? isDisabled
                ? isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)"
                : variantStyles.borderColor
              : variantStyles.borderColor,
          borderWidth: variant === "outline" ? 1 : 0,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          opacity: isDisabled ? 0.6 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variantStyles.textColor}
            style={styles.loader}
          />
        ) : (
          <>
            {leftIcon && (
              <View style={styles.leftIcon}>{renderIcon(leftIcon, "left")}</View>
            )}
            {typeof children === "string" ? (
              <ThemedText
                weight="semibold"
                size={
                  sizeStyles.fontSize === 14
                    ? "sm"
                    : sizeStyles.fontSize === 18
                    ? "lg"
                    : "base"
                }
                style={[
                  styles.text,
                  {
                    color: isDisabled
                      ? isDark
                        ? "rgba(255, 255, 255, 0.4)"
                        : "rgba(0, 0, 0, 0.4)"
                      : variantStyles.textColor,
                  },
                ]}
              >
                {children}
              </ThemedText>
            ) : (
              children
            )}
            {rightIcon && (
              <View style={styles.rightIcon}>{renderIcon(rightIcon, "right")}</View>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    textAlign: "center",
  },
  leftIcon: {
    marginRight: -4,
  },
  rightIcon: {
    marginLeft: -4,
  },
  loader: {
    marginHorizontal: 4,
  },
});

