/**
 * @description Rounded search input component
 */

import { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";

export type SearchBarProps = {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onReset?: () => void;
  autoReset?: boolean;
};

export function SearchBar({
  placeholder = "Search...",
  value: controlledValue,
  onChange,
  onReset,
  autoReset = true,
}: SearchBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const iconColor = colors.icon;

  const [internalValue, setInternalValue] = useState("");

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleClear = () => {
    handleChange("");
    onReset?.();
  };

  const hasValue = value.length > 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.05)",
          },
        ]}
      >
        <SymbolView
          name="magnifyingglass"
          tintColor={iconColor}
          style={{ width: 18, height: 18 }}
        />
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={
            isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)"
          }
          value={value}
          onChangeText={handleChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {hasValue && (
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
            <View
              style={[
                styles.clearButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <SymbolView
                name="xmark"
                tintColor={iconColor}
                style={{ width: 12, height: 12 }}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
