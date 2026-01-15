/**
 * @description Quantity input component with increment/decrement buttons
 */

import { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "./themed-text";
import { SymbolView } from "expo-symbols";

export type FormQuantityInputProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function FormQuantityInput({
  label,
  value,
  onChange,
  min,
  max,
}: FormQuantityInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const iconColor = colors.icon;

  const [quantity, setQuantity] = useState(value);

  useEffect(() => {
    setQuantity(value);
  }, [value]);

  const handleDecrement = () => {
    const newValue = quantity - 1;
    if (min === undefined || newValue >= min) {
      const finalValue = Math.max(min ?? 0, newValue);
      setQuantity(finalValue);
      onChange(finalValue);
    }
  };

  const handleIncrement = () => {
    const newValue = quantity + 1;
    if (max === undefined || newValue <= max) {
      const finalValue = Math.min(max ?? Infinity, newValue);
      setQuantity(finalValue);
      onChange(finalValue);
    }
  };

  const canDecrement = min === undefined || quantity > min;
  const canIncrement = max === undefined || quantity < max;

  return (
    <View className="mb-4">
      {label && (
        <ThemedText size="base" weight="semibold" className="mb-2">
          {label}
        </ThemedText>
      )}
      <View
        className="flex-row items-stretch rounded-lg border overflow-hidden"
        style={{
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : colors.background,
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        }}
      >
        <TouchableOpacity
          onPress={handleDecrement}
          disabled={!canDecrement}
          activeOpacity={0.7}
          className="w-12 justify-center items-center py-3"
          style={{
            opacity: canDecrement ? 1 : 0.25,
          }}
        >
          <SymbolView
            name="minus"
            tintColor={canDecrement ? iconColor : colors.icon}
            size={20}
          />
        </TouchableOpacity>

        <View className="flex-1 justify-center items-center py-3">
          <ThemedText size="base" weight="semibold">
            {quantity}
          </ThemedText>
        </View>

        <TouchableOpacity
          onPress={handleIncrement}
          disabled={!canIncrement}
          activeOpacity={0.7}
          className="w-12 justify-center items-center py-3"
          style={{
            opacity: canIncrement ? 1 : 0.25,
          }}
        >
          <SymbolView
            name="plus"
            tintColor={canIncrement ? iconColor : colors.icon}
            size={20}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
