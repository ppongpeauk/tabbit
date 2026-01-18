/**
 * @description Bottom sheet for editing manual receipt header details
 */

import { useCallback } from "react";
import { ScrollView, View } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { FormDatePicker } from "@/components/form-date-picker";
import { FormTimePicker } from "@/components/form-time-picker";
import { FormCurrencyPicker } from "@/components/form-currency-picker";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import type React from "react";
import type { ManualReceiptHeaderFields } from "@/components/manual-receipt-header-fields";

interface ManualReceiptHeaderSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  headerFields: ManualReceiptHeaderFields;
  onHeaderFieldsChange: (updates: Partial<ManualReceiptHeaderFields>) => void;
}

export function ManualReceiptHeaderSheet({
  bottomSheetRef,
  headerFields,
  onHeaderFieldsChange,
}: ManualReceiptHeaderSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

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
        <View>
          <FormTextInput
            label="Name"
            value={headerFields.name}
            onChangeText={(value) => onHeaderFieldsChange({ name: value })}
            placeholder="Untitled"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormDatePicker
                label="Date"
                value={headerFields.transactionDate}
                onChange={(value) =>
                  onHeaderFieldsChange({ transactionDate: value })
                }
                placeholder="Select date"
                mode="date"
              />
            </View>
            <View className="flex-1">
              <FormTimePicker
                label="Time"
                value={headerFields.transactionTime}
                onChange={(value) =>
                  onHeaderFieldsChange({ transactionTime: value })
                }
                placeholder="Select time"
              />
            </View>
          </View>
          <FormCurrencyPicker
            label="Currency"
            value={headerFields.currency}
            onChange={(value) => onHeaderFieldsChange({ currency: value })}
            placeholder="Select currency"
          />
        </View>

        <View>
          <FormTextInput
            label="Merchant Name *"
            value={headerFields.merchantName}
            onChangeText={(value) =>
              onHeaderFieldsChange({ merchantName: value })
            }
            placeholder="Enter merchant name"
          />
          <FormTextInput
            label="Address"
            value={headerFields.merchantAddressLine1}
            onChangeText={(value) =>
              onHeaderFieldsChange({ merchantAddressLine1: value })
            }
            placeholder="Enter address"
            multiline
            numberOfLines={2}
          />
          <FormTextInput
            label="Phone"
            value={headerFields.merchantPhone}
            onChangeText={(value) =>
              onHeaderFieldsChange({ merchantPhone: value })
            }
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
        </View>

        <Button onPress={handleClose} variant="primary" className="mt-2">
          Done
        </Button>
      </ScrollView>
    </TrueSheet>
  );
}
