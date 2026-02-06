/**
 * @description Bottom sheet for selecting a currency
 */

import { useCallback, useState, useMemo } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { CURRENCIES, type Currency } from "@/utils/currencies";
import { SearchBar } from "@/components/ui/search-bar";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) {
      return CURRENCIES;
    }
    const query = searchQuery.toLowerCase();
    return CURRENCIES.filter(
      (currency) =>
        currency.name.toLowerCase().includes(query) ||
        currency.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = useCallback(
    (currency: Currency) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSearchQuery("");
      onSelect(currency.code);
      bottomSheetRef.current?.dismiss();
    },
    [onSelect, bottomSheetRef]
  );

  const handleSheetDismiss = useCallback(() => {
    setSearchQuery("");
    onClose();
  }, [onClose]);

  return (
    <TrueSheet
      ref={bottomSheetRef}
      onDidDismiss={handleSheetDismiss}
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

        <SearchBar
          placeholder="Search currencies..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <View className="gap-0 mt-2">
          {filteredCurrencies.map((currency) => {
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
          {filteredCurrencies.length === 0 && (
            <View className="py-8 items-center">
              <ThemedText
                size="base"
                style={{
                  color: isDark ? Colors.dark.subtle : Colors.light.icon,
                }}
              >
                No currencies found
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </TrueSheet>
  );
}
