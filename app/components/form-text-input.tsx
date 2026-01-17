import { TextInput, TextInputProps, StyleSheet, View } from "react-native";
import {
  ReactNode,
  ReactElement,
  cloneElement,
  isValidElement,
  forwardRef,
  useCallback,
} from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "./themed-text";

export type FormTextInputProps = TextInputProps & {
  label?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  numericOnly?: boolean;
  min?: number;
  max?: number;
};

export const FormTextInput = forwardRef<TextInput, FormTextInputProps>(
  function FormTextInput(
    {
      label,
      style,
      leftIcon,
      rightIcon,
      numericOnly,
      min,
      max,
      onChangeText,
      value,
      keyboardType,
      onBlur,
      ...textInputProps
    },
    ref
  ) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? "light"];
    const isDark = colorScheme === "dark";
    const iconColor = colors.icon;

    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon;
    const isMultiline = textInputProps.multiline === true;
    const hasCustomHeight =
      isMultiline ||
      (style && "minHeight" in style) ||
      (style && "height" in style);

    const renderIcon = (icon: ReactNode) => {
      if (!icon) return null;
      if (isValidElement(icon)) {
        return cloneElement(icon as ReactElement<{ color?: string }>, {
          color: iconColor,
        });
      }
      return icon;
    };

    const handleChangeText = useCallback(
      (text: string) => {
        if (!numericOnly) {
          onChangeText?.(text);
          return;
        }

        // Allow empty string - user can clear the input
        if (text === "") {
          onChangeText?.("");
          return;
        }

        // Only filter non-numeric characters during typing
        // Don't enforce min/max here - allow free typing
        let cleaned = text.replace(/[^0-9.-]/g, "");

        // Only allow one decimal point
        const parts = cleaned.split(".");
        if (parts.length > 2) {
          cleaned = parts[0] + "." + parts.slice(1).join("");
        }

        // Only allow negative sign at the start
        if (cleaned.startsWith("-")) {
          cleaned = "-" + cleaned.substring(1).replace(/-/g, "");
        } else {
          cleaned = cleaned.replace(/-/g, "");
        }

        // Allow any numeric input while typing - validation happens on blur
        onChangeText?.(cleaned);
      },
      [numericOnly, onChangeText]
    );

    const handleBlur = useCallback(
      (e: any) => {
        // Validate min/max only on blur
        if (numericOnly && value !== undefined && value !== "") {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            let validatedValue = numValue;

            // Clamp to min if provided
            if (min !== undefined && numValue < min) {
              validatedValue = min;
            }

            // Clamp to max if provided
            if (max !== undefined && numValue > max) {
              validatedValue = max;
            }

            // Update value if it was clamped
            if (validatedValue !== numValue) {
              onChangeText?.(validatedValue.toString());
            }
          }
        }

        // Call original onBlur if provided
        onBlur?.(e);
      },
      [numericOnly, value, min, max, onChangeText, onBlur]
    );

    // Set keyboardType to decimal-pad if numericOnly is true and not already set
    const finalKeyboardType = numericOnly
      ? keyboardType || "decimal-pad"
      : keyboardType;

    return (
      <View style={styles.container}>
        {label && (
          <ThemedText size="base" weight="semibold" style={styles.label}>
            {label}
          </ThemedText>
        )}
        <View style={styles.inputContainer}>
          {hasLeftIcon && (
            <View
              style={[
                styles.leftIconContainer,
                hasCustomHeight && styles.leftIconContainerTopAligned,
              ]}
            >
              {renderIcon(leftIcon)}
            </View>
          )}
          <TextInput
            ref={ref}
            {...textInputProps}
            value={value}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            keyboardType={finalKeyboardType}
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
);

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
  leftIconContainerTopAligned: {
    justifyContent: "flex-start",
    paddingTop: 12,
  },
  rightIconContainer: {
    position: "absolute",
    right: 16,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
