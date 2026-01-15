/**
 * @description Currency picker component styled to match FormTextInput
 */

import { useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "./themed-text";
import { SymbolView } from "expo-symbols";
import { CurrencyPickerSheet } from "./currency-picker-sheet";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { getCurrencyByCode } from "@/utils/currencies";

export type FormCurrencyPickerProps = {
  label?: string;
  value?: string; // Currency code (e.g., "USD")
  onChange?: (currencyCode: string) => void;
  placeholder?: string;
};

export function FormCurrencyPicker({
  label,
  value,
  onChange,
  placeholder = "Select currency",
}: FormCurrencyPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const iconColor = colors.icon;

  const [isOpen, setIsOpen] = useState(false);
  const sheetRef = useRef<TrueSheet | null>(null);

  const currency = value ? getCurrencyByCode(value) : undefined;
  const displayValue = currency
    ? `${currency.code} - ${currency.name}`
    : placeholder;

  const handleSelect = (currencyCode: string) => {
    onChange?.(currencyCode);
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
                color: currency ? colors.text : colors.icon,
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

      <CurrencyPickerSheet
        bottomSheetRef={sheetRef}
        selectedCurrency={value}
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
