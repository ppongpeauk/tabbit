/**
 * @description Category picker component styled to match FormTextInput
 */

import { useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "./themed-text";
import { SymbolView } from "expo-symbols";
import { CategoryPickerSheet } from "./category-picker-sheet";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { getCategoryName, getCategoryEmoji } from "@/utils/categories";

export type FormCategoryPickerProps = {
  label?: string;
  required?: boolean;
  value?: string; // Category code (e.g., "GENERAL_MERCHANDISE")
  onChange?: (categoryCode: string) => void;
  placeholder?: string;
};

export function FormCategoryPicker({
  label,
  required,
  value,
  onChange,
  placeholder = "Select category",
}: FormCategoryPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const iconColor = colors.icon;

  const [isOpen, setIsOpen] = useState(false);
  const sheetRef = useRef<TrueSheet | null>(null);

  const categoryName = value ? getCategoryName(value) : undefined;
  const categoryEmoji = value ? getCategoryEmoji(value) : undefined;
  const displayValue = categoryName
    ? `${categoryEmoji} ${categoryName}`
    : placeholder;

  const handleSelect = (categoryCode: string) => {
    onChange?.(categoryCode);
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    sheetRef.current?.present();
  };

  const handleClose = () => {
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
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <View style={styles.inputContent}>
          <ThemedText
            style={[
              styles.inputText,
              {
                color: categoryName ? colors.text : colors.icon,
              },
            ]}
          >
            {displayValue}
          </ThemedText>
          <SymbolView
            name="chevron.down"
            tintColor={iconColor}
            style={{ width: 20, height: 20 }}
          />
        </View>
      </TouchableOpacity>

      <CategoryPickerSheet
        bottomSheetRef={sheetRef}
        selectedCategory={value}
        onSelect={handleSelect}
        onClose={handleClose}
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
