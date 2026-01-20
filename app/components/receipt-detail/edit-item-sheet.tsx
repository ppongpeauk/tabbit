/**
 * @description Bottom sheet for editing a single receipt item
 */

import { useCallback, useEffect } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { FormQuantityInput } from "@/components/form-quantity-input";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type { ReceiptItem } from "@/utils/storage";

interface EditItemFormData {
  name: string;
  quantity: number;
  unitPrice: string;
}

interface EditItemSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  item: ReceiptItem | null;
  currency: string;
  onSave: (updatedItem: ReceiptItem) => void;
  onClose: () => void;
}

export function EditItemSheet({
  bottomSheetRef,
  item,
  currency,
  onSave,
  onClose,
}: EditItemSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<EditItemFormData>({
    defaultValues: {
      name: "",
      quantity: 1,
      unitPrice: "0",
    },
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      });
    }
  }, [item, reset]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
    onClose();
  }, [bottomSheetRef, onClose]);

  const handleSave = handleSubmit((data) => {
    const price = parseFloat(data.unitPrice) || 0;

    const updatedItem: ReceiptItem = {
      ...item!,
      name: data.name.trim(),
      quantity: data.quantity,
      unitPrice: price,
      totalPrice: data.quantity * price,
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(updatedItem);
    bottomSheetRef.current?.dismiss();
  });

  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;

  return (
    <TrueSheet
      ref={bottomSheetRef}
      detents={["auto"]}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      scrollable
    >
      <ScrollView
        contentContainerClassName="px-6 py-8"
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between mb-6">
          <ThemedText size="xl" weight="bold">
            Edit Item
          </ThemedText>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SymbolView
              name="xmark.circle.fill"
              tintColor={iconColor}
              size={28}
            />
          </TouchableOpacity>
        </View>

        <Controller
          control={control}
          name="name"
          rules={{ required: true }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextInput
              label="Item Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Enter item name"
            />
          )}
        />

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Controller
              control={control}
              name="quantity"
              render={({ field: { onChange, value } }) => (
                <FormQuantityInput
                  label="Quantity"
                  value={value}
                  onChange={onChange}
                  min={1}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="unitPrice"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label={`Price (${currency})`}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  numericOnly
                  min={0}
                  placeholder="0.00"
                />
              )}
            />
          </View>
        </View>

        <View className="flex-row gap-4 mt-6">
          <Button variant="secondary" onPress={handleClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="primary" onPress={handleSave} style={{ flex: 1 }}>
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </TrueSheet>
  );
}
