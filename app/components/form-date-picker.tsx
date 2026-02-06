/**
 * @description Date picker component styled to match FormTextInput
 */

import { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import DatePicker from "react-native-date-picker";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "./themed-text";
import { SymbolView } from "expo-symbols";

export type FormDatePickerProps = {
  label?: string;
  required?: boolean;
  value?: string; // YYYY-MM-DD format
  onChange?: (date: string) => void; // Returns YYYY-MM-DD format
  placeholder?: string;
  mode?: "date" | "time" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
};

export function FormDatePicker({
  label,
  required,
  value,
  onChange,
  placeholder = "Select date",
  mode = "date",
  minimumDate,
  maximumDate,
}: FormDatePickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const iconColor = colors.icon;

  const [isOpen, setIsOpen] = useState(false);

  // Parse the value string (YYYY-MM-DD) to Date object
  const dateValue = value
    ? new Date(value + (mode === "date" ? "T00:00:00" : ""))
    : new Date();

  // Format date for display
  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr + "T00:00:00");
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const displayValue = formatDisplayDate(value);

  const handleConfirm = (date: Date) => {
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;
    onChange?.(dateString);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText size="base" weight="semibold" style={styles.label}>
          {label}
          {required && (
            <ThemedText size="base" weight="semibold" style={{ color: "#EF4444" }}>
              {" *"}
            </ThemedText>
          )}
        </ThemedText>
      )}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : colors.background,
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.inputContent}>
          <ThemedText
            style={[
              styles.inputText,
              {
                color: displayValue ? colors.text : colors.icon,
              },
            ]}
          >
            {displayValue || placeholder}
          </ThemedText>
          <SymbolView
            name="calendar"
            tintColor={iconColor}
            style={{ width: 20, height: 20 }}
          />
        </View>
      </TouchableOpacity>

      <DatePicker
        modal
        open={isOpen}
        mode={mode}
        date={dateValue}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        theme={isDark ? "dark" : "light"}
        textColor={colors.text}
        locale="en"
      />
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
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  inputContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    flex: 1,
  },
});
