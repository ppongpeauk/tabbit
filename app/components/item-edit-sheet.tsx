/**
 * @description Bottom sheet for adding/editing receipt items
 */

import { useEffect, useCallback, useRef } from "react";
import { ScrollView, View, TouchableOpacity, TextInput } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { FormQuantityInput } from "@/components/form-quantity-input";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import type React from "react";
import type { ReceiptItem } from "@/utils/storage";

interface ItemFormData {
  name: string;
  price: string;
  quantity: number;
}

interface ItemEditSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  item?: ReceiptItem | null; // null for new item, ReceiptItem for editing
  onSave: (item: ReceiptItem) => void;
  onClose: () => void;
}

export function ItemEditSheet({
  bottomSheetRef,
  item,
  onSave,
  onClose,
}: ItemEditSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const nameInputRef = useRef<TextInput>(null);
  const shouldAutoFocus = useRef(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<ItemFormData>({
    defaultValues: {
      name: "",
      price: "",
      quantity: 1,
    },
    mode: "onChange",
  });

  const isEditing = item !== null && item !== undefined;

  useEffect(() => {
    if (item) {
      reset({
        name: item.name || "",
        price: item.unitPrice?.toFixed(2) || "",
        quantity: item.quantity || 1,
      });
      shouldAutoFocus.current = false;
    } else {
      reset({
        name: "",
        price: "",
        quantity: 1,
      });
      shouldAutoFocus.current = true;
    }
  }, [item, reset]);

  const handleNameInputLayout = useCallback(() => {
    if (shouldAutoFocus.current && nameInputRef.current) {
      shouldAutoFocus.current = false;
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, []);

  const handleSave = handleSubmit((data) => {
    const priceNum = parseFloat(data.price) || 0;
    const totalPrice = data.quantity * priceNum;

    const newItem: ReceiptItem = {
      name: data.name.trim(),
      quantity: data.quantity,
      unitPrice: priceNum,
      totalPrice,
    };

    onSave(newItem);
    bottomSheetRef.current?.dismiss();
    onClose();
  });

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
        nestedScrollEnabled
      >
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <ThemedText size="lg" weight="semibold">
              {isEditing ? "Edit Item" : "Add Item"}
            </ThemedText>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!isValid}
            activeOpacity={0.7}
            className="px-4 py-2 rounded-lg"
            style={{
              backgroundColor: isValid
                ? isDark
                  ? Colors.dark.tint
                  : Colors.light.tint
                : isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              opacity: isValid ? 1 : 0.5,
            }}
          >
            <ThemedText
              size="base"
              weight="semibold"
              style={{
                color: isValid
                  ? isDark
                    ? "#000000"
                    : "#FFFFFF"
                  : isDark
                    ? "rgba(255, 255, 255, 0.5)"
                    : "rgba(0, 0, 0, 0.5)",
              }}
            >
              Save
            </ThemedText>
          </TouchableOpacity>
        </View>

        <Controller
          control={control}
          name="name"
          rules={{ required: true }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextInput
              ref={nameInputRef}
              label="Item Name"
              required
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Enter item name"
              onLayout={handleNameInputLayout}
            />
          )}
        />

        <View className="flex-row gap-3">
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
              name="price"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label="Price"
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
      </ScrollView>
    </TrueSheet>
  );
}
