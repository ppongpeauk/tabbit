/**
 * @description Bottom sheet for selecting a currency
 */

import { useCallback } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { CURRENCIES, type Currency } from "@/utils/currencies";
import type React from "react";

interface CurrencyPickerSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  selectedCurrency?: string;
  onSelect: (currencyCode: string) => void;
  onClose: () => void;
}

export function CurrencyPickerSheet({
  bottomSheetRef,
  selectedCurrency,
  onSelect,
  onClose,
}: CurrencyPickerSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleSelect = useCallback(
    (currency: Currency) => {
      onSelect(currency.code);
      bottomSheetRef.current?.dismiss();
      onClose();
    },
    [onSelect, bottomSheetRef, onClose]
  );

  return (
    <TrueSheet
      ref={bottomSheetRef}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }

      scrollable
    >
      <ScrollView
        contentContainerClassName="px-6 py-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
      >
        <View className="mb-4">
          <ThemedText size="lg" weight="semibold">
            Select a currency
          </ThemedText>
        </View>

        <View className="gap-0">
          {CURRENCIES.map((currency) => {
            const isSelected = selectedCurrency === currency.code;
            return (
              <TouchableOpacity
                key={currency.code}
                className="flex-row items-center justify-between py-2.5 px-4 rounded-lg"
                style={{
                  backgroundColor: isSelected
                    ? isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)"
                    : "transparent",
                }}
                onPress={() => handleSelect(currency)}
                activeOpacity={0.7}
              >
                <View className="flex-1">
                  <ThemedText
                    size="base"
                    weight={isSelected ? "semibold" : "normal"}
                  >
                    {currency.name}
                  </ThemedText>
                  <ThemedText
                    size="base"
                    family="mono"
                    style={{
                      color: isDark ? Colors.dark.subtle : Colors.light.icon,
                    }}
                  >
                    {currency.code}
                  </ThemedText>
                </View>
                {isSelected && (
                  <ThemedText
                    size="base"
                    weight="semibold"
                    style={{
                      color: isDark ? Colors.dark.tint : Colors.light.tint,
                    }}
                  >
                    ✓
                  </ThemedText>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </TrueSheet>
  );
}
