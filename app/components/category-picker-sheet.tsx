/**
 * @description Bottom sheet for selecting a purchase category
 */

import { useCallback } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import {
  getCategoryName,
  getCategoryEmoji,
  CATEGORIES,
  type Category,
} from "@/utils/categories";
import type React from "react";

interface CategoryPickerSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  selectedCategory?: string;
  onSelect: (categoryCode: string) => void;
  onClose: () => void;
}

export function CategoryPickerSheet({
  bottomSheetRef,
  selectedCategory,
  onSelect,
  onClose,
}: CategoryPickerSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleSelect = useCallback(
    (category: Category) => {
      onSelect(category.code);
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
            Select a category
          </ThemedText>
        </View>

        <View className="gap-0">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.code;
            const categoryName = getCategoryName(category.code);
            const categoryEmoji = getCategoryEmoji(category.code);

            return (
              <TouchableOpacity
                key={category.code}
                className="flex-row items-center justify-between py-2.5 px-4 rounded-lg"
                style={{
                  backgroundColor: isSelected
                    ? isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)"
                    : "transparent",
                }}
                onPress={() => handleSelect(category)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1 gap-3">
                  <ThemedText size="lg">{categoryEmoji}</ThemedText>
                  <View className="flex-1">
                    <ThemedText
                      size="base"
                      weight={isSelected ? "semibold" : "normal"}
                    >
                      {categoryName}
                    </ThemedText>
                  </View>
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
