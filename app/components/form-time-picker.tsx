/**
 * @description Time picker component styled to match FormTextInput
 */

import { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import DatePicker from "react-native-date-picker";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "./themed-text";
import { SymbolView } from "expo-symbols";

export type FormTimePickerProps = {
  label?: string;
  required?: boolean;
  value?: string; // HH:MM format
  onChange?: (time: string) => void; // Returns HH:MM format
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function FormTimePicker({
  label,
  required,
  value,
  onChange,
  placeholder = "Select time",
  minimumDate,
  maximumDate,
}: FormTimePickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const iconColor = colors.icon;

  const [isOpen, setIsOpen] = useState(false);

  // Parse the value string (HH:MM) to Date object
  const timeValue = (() => {
    if (!value) return new Date();
    try {
      const [hours, minutes] = value.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) return new Date();
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch {
      return new Date();
    }
  })();

  // Format time for display
  const formatDisplayTime = (timeStr?: string): string => {
    if (!timeStr) return "";
    try {
      const [hours, minutes] = timeStr.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) return "";
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const displayValue = formatDisplayTime(value);

  const handleConfirm = (date: Date) => {
    // Format as HH:MM
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const timeString = `${hours}:${minutes}`;
    onChange?.(timeString);
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
            name="clock"
            tintColor={iconColor}
            style={{ width: 20, height: 20 }}
          />
        </View>
      </TouchableOpacity>

      <DatePicker
        modal
        open={isOpen}
        mode="time"
        date={timeValue}
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
