/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Form component for manually entering receipt information
 */

import {
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type React from "react";
import { View, ScrollView, Alert, TouchableOpacity } from "react-native";
import { useForm } from "react-hook-form";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { formatCurrency } from "@/utils/format";
import { ItemEditSheet } from "./item-edit-sheet";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type {
  Merchant,
  Transaction,
  Totals,
  ReceiptItem,
  ReturnInfo,
  TaxBreakdownItem,
} from "@/utils/api";
import type { ManualReceiptHeaderFields } from "@/components/manual-receipt-header-fields";
import { BreakdownEditSheet } from "./breakdown-edit-sheet";

interface ManualReceiptFormData {
  name: string;
  merchant: Merchant;
  transaction: Transaction;
  items: ReceiptItem[];
  totals: Totals;
  returnInfo?: ReturnInfo;
  userNotes?: string;
}

interface ManualFormValues {
  items: ReceiptItem[];
  taxBreakdown: TaxBreakdownItem[];
  feesBreakdown: TaxBreakdownItem[];
  subtotal: string;
  tax: string;
  fees: string;
  total: string;
}

interface ManualReceiptFormProps {
  onSave: (data: ManualReceiptFormData) => Promise<void>;
  onFormDataChange?: (hasData: boolean) => void;
  headerFields: ManualReceiptHeaderFields;
  initialItems?: ReceiptItem[];
  initialTotals?: {
    subtotal: number;
    tax: number;
    fees?: number;
    total: number;
    taxBreakdown?: TaxBreakdownItem[];
    feesBreakdown?: TaxBreakdownItem[];
  };
  children?: React.ReactNode;
}

export interface ManualReceiptFormRef {
  save: () => Promise<void>;
}

export const ManualReceiptForm = forwardRef<
  ManualReceiptFormRef,
  ManualReceiptFormProps
>(
  (
    {
      onSave,
      onFormDataChange,
      headerFields,
      initialItems,
      initialTotals,
      children,
    },
    ref
  ) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const {
      handleSubmit,
      watch,
      setValue,
      formState: { isDirty },
    } = useForm<ManualFormValues>({
      defaultValues: {
        items: initialItems || [],
        taxBreakdown: initialTotals?.taxBreakdown || [],
        feesBreakdown: initialTotals?.feesBreakdown || [],
        subtotal: initialTotals ? initialTotals.subtotal.toFixed(2) : "",
        tax: initialTotals ? initialTotals.tax.toFixed(2) : "",
        fees: initialTotals?.fees ? initialTotals.fees.toFixed(2) : "",
        total: initialTotals ? initialTotals.total.toFixed(2) : "",
      },
    });

    const watchedItems = watch("items");
    const watchedTaxBreakdown = watch("taxBreakdown");
    const watchedFeesBreakdown = watch("feesBreakdown");
    const watchedSubtotal = watch("subtotal");
    const watchedTax = watch("tax");
    const watchedFees = watch("fees");
    const watchedTotal = watch("total");

    const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const itemSheetRef = useRef<TrueSheet | null>(null);

    const [editingBreakdown, setEditingBreakdown] = useState<{
      type: "tax" | "fee";
      item: TaxBreakdownItem | null;
      index: number | null;
    } | null>(null);

    const breakdownSheetRef = useRef<TrueSheet | null>(null);

    const recalculateTotals = useCallback(() => {
      const itemsSubtotal = watchedItems.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0
      );
      const taxAmount = watchedTaxBreakdown.reduce((sum, item) => sum + item.amount, 0);
      const feesAmount = watchedFeesBreakdown.reduce((sum, item) => sum + item.amount, 0);
      const calculatedTotal = itemsSubtotal + taxAmount + feesAmount;

      // Update subtotal, tax, fees and total if they're empty or if things changed
      if (!watchedSubtotal || Math.abs(parseFloat(watchedSubtotal) - itemsSubtotal) > 0.01) {
        setValue("subtotal", itemsSubtotal.toFixed(2));
      }
      if (!watchedTax || Math.abs(parseFloat(watchedTax) - taxAmount) > 0.01) {
        setValue("tax", taxAmount.toFixed(2));
      }
      if (!watchedFees || Math.abs(parseFloat(watchedFees) - feesAmount) > 0.01) {
        setValue("fees", feesAmount.toFixed(2));
      }
      if (!watchedTotal || Math.abs(parseFloat(watchedTotal) - calculatedTotal) > 0.01) {
        setValue("total", calculatedTotal.toFixed(2));
      }

      return {
        subtotal: itemsSubtotal,
        tax: taxAmount,
        fees: feesAmount,
        total: calculatedTotal,
      };
    }, [watchedItems, watchedTaxBreakdown, watchedFeesBreakdown, watchedSubtotal, watchedTax, watchedFees, watchedTotal, setValue]);

    // Track if form has data for dirty checking
    useEffect(() => {
      onFormDataChange?.(isDirty);
    }, [isDirty, onFormDataChange]);

    const handleAddItem = useCallback(() => {
      setEditingItem(null);
      setEditingIndex(null);
      itemSheetRef.current?.present();
    }, []);

    const handleEditItem = useCallback(
      (index: number) => {
        setEditingItem(watchedItems[index]);
        setEditingIndex(index);
        itemSheetRef.current?.present();
      },
      [watchedItems]
    );

    const handleItemSave = useCallback(
      (item: ReceiptItem) => {
        if (editingIndex !== null) {
          const newItems = [...watchedItems];
          newItems[editingIndex] = item;
          setValue("items", newItems, { shouldDirty: true });
        } else {
          setValue("items", [...watchedItems, item], { shouldDirty: true });
        }
        setEditingItem(null);
        setEditingIndex(null);
      },
      [watchedItems, editingIndex, setValue]
    );

    const handleItemSheetClose = useCallback(() => {
      setEditingItem(null);
      setEditingIndex(null);
    }, []);

    const removeItem = useCallback(
      (index: number) => {
        Alert.alert(
          "Delete Item",
          "Are you sure you want to delete this item?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                const newItems = watchedItems.filter((_, i) => i !== index);
                setValue("items", newItems, { shouldDirty: true });
              },
            },
          ]
        );
      },
      [watchedItems, setValue]
    );

    const handleAddBreakdown = useCallback((type: "tax" | "fee") => {
      setEditingBreakdown({ type, item: null, index: null });
      breakdownSheetRef.current?.present();
    }, []);

    const handleEditBreakdown = useCallback(
      (type: "tax" | "fee", index: number) => {
        const item = type === "tax" ? watchedTaxBreakdown[index] : watchedFeesBreakdown[index];
        setEditingBreakdown({ type, item, index });
        breakdownSheetRef.current?.present();
      },
      [watchedTaxBreakdown, watchedFeesBreakdown]
    );

    const handleBreakdownSave = useCallback(
      (item: TaxBreakdownItem) => {
        if (!editingBreakdown) return;

        if (editingBreakdown.type === "tax") {
          const newBreakdown = [...watchedTaxBreakdown];
          if (editingBreakdown.index !== null) {
            newBreakdown[editingBreakdown.index] = item;
          } else {
            newBreakdown.push(item);
          }
          setValue("taxBreakdown", newBreakdown, { shouldDirty: true });
        } else {
          const newBreakdown = [...watchedFeesBreakdown];
          if (editingBreakdown.index !== null) {
            newBreakdown[editingBreakdown.index] = item;
          } else {
            newBreakdown.push(item);
          }
          setValue("feesBreakdown", newBreakdown, { shouldDirty: true });
        }
      },
      [editingBreakdown, watchedTaxBreakdown, watchedFeesBreakdown, setValue]
    );

    const handleBreakdownSheetClose = useCallback(() => {
      setEditingBreakdown(null);
    }, []);

    const removeBreakdown = useCallback(
      (type: "tax" | "fee", index: number) => {
        Alert.alert(
          `Delete ${type === "tax" ? "Tax" : "Fee"}`,
          "Are you sure you want to delete this?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                if (type === "tax") {
                  setValue("taxBreakdown", watchedTaxBreakdown.filter((_, i) => i !== index), { shouldDirty: true });
                } else {
                  setValue("feesBreakdown", watchedFeesBreakdown.filter((_, i) => i !== index), { shouldDirty: true });
                }
              },
            },
          ]
        );
      },
      [watchedTaxBreakdown, watchedFeesBreakdown, setValue]
    );

    const handleSave = handleSubmit(async (data) => {
      // Validation
      if (!headerFields.merchantName.trim()) {
        Alert.alert("Validation Error", "Merchant name is required");
        return;
      }

      if (data.items.some((item) => !item.name.trim())) {
        Alert.alert("Validation Error", "All items must have a name");
        return;
      }

      const totals = recalculateTotals();
      const subtotalValue = parseFloat(data.subtotal) || totals.subtotal;
      const taxValue = parseFloat(data.tax) || totals.tax;
      const feesValue = parseFloat(data.fees) || totals.fees;
      const totalValue = parseFloat(data.total) || totals.total;

      // Build datetime string
      const datetime =
        headerFields.transactionDate && headerFields.transactionTime
          ? `${headerFields.transactionDate}T${headerFields.transactionTime}:00`
          : new Date().toISOString();

      // Build address object with all fields, only including non-empty values
      const addressParts: {
        line1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      } = {};

      if (headerFields.merchantAddressLine1?.trim()) {
        addressParts.line1 = headerFields.merchantAddressLine1.trim();
      }
      if (headerFields.merchantCity?.trim()) {
        addressParts.city = headerFields.merchantCity.trim();
      }
      if (headerFields.merchantState?.trim()) {
        addressParts.state = headerFields.merchantState.trim();
      }
      if (headerFields.merchantPostalCode?.trim()) {
        addressParts.postalCode = headerFields.merchantPostalCode.trim();
      }
      if (headerFields.merchantCountry?.trim()) {
        addressParts.country = headerFields.merchantCountry.trim();
      }

      const address = Object.keys(addressParts).length > 0 ? addressParts : undefined;

      const formData: ManualReceiptFormData = {
        name: headerFields.name.trim() || "Untitled",
        merchant: {
          name: headerFields.merchantName.trim(),
          address,
          phone: headerFields.merchantPhone || undefined,
          category: headerFields.category ? [headerFields.category] : undefined,
        },
        transaction: {
          datetime,
        },
        items: data.items.filter((item) => item.name.trim()),
        totals: {
          currency: headerFields.currency,
          subtotal: subtotalValue,
          tax: taxValue,
          taxBreakdown: data.taxBreakdown.length > 0 ? data.taxBreakdown : undefined,
          fees: feesValue,
          feesBreakdown: data.feesBreakdown.length > 0 ? data.feesBreakdown : undefined,
          total: totalValue,
        },
      };

      try {
        await onSave(formData);
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to save receipt. Please try again."
        );
        throw error; // Re-throw so parent can handle it
      }
    });

    // Expose save method via ref
    useImperativeHandle(ref, () => ({
      save: handleSave,
    }));

    const totalsResult = recalculateTotals();
    const displaySubtotal = parseFloat(watchedSubtotal) || totalsResult.subtotal;
    const displayTax = parseFloat(watchedTax) || totalsResult.tax;
    const displayFees = parseFloat(watchedFees) || totalsResult.fees;
    const displayTotal = parseFloat(watchedTotal) || totalsResult.total;

    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-[100px]"
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView className="px-4 py-4">
          {/* Items Section */}
          <View>
            <ThemedText size="lg" weight="semibold" className="mb-3">
              Items
            </ThemedText>

            {watchedItems.map((item, index) => (
              <View
                key={index}
                className="mb-3 rounded-xl p-4 border"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <ThemedText size="base" weight="semibold" family="sans">
                    {item.name}
                  </ThemedText>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleEditItem(index)}
                      activeOpacity={0.7}
                      className="p-2"
                    >
                      <SymbolView
                        name="square.and.pencil"
                        tintColor={
                          isDark ? Colors.dark.tint : Colors.light.tint
                        }
                        size={18}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeItem(index)}
                      activeOpacity={0.7}
                      className="p-2"
                    >
                      <SymbolView name="trash" tintColor="#FF3B30" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex-row justify-between items-center">
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.subtle : Colors.light.icon,
                    }}
                  >
                    {item.quantity} ×{" "}
                    {formatCurrency(item.unitPrice, headerFields.currency)}
                  </ThemedText>
                  <ThemedText size="base" weight="semibold" family="sans">
                    {formatCurrency(item.totalPrice, headerFields.currency)}
                  </ThemedText>
                </View>
              </View>
            ))}

            {/* Add Item Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAddItem}
              className={`rounded-xl p-4 gap-1 ${isDark ? "bg-[#1A1D1E]" : "bg-white"
                }`}
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.2)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <SymbolView
                    name="plus"
                    tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                    style={{ width: 24, height: 24 }}
                  />
                </View>
                <View className="flex-1">
                  <ThemedText size="base" weight="semibold">
                    Add Item
                  </ThemedText>
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.subtle : Colors.light.icon,
                    }}
                  >
                    Tap to add a new item to the transaction
                  </ThemedText>
                </View>
                <SymbolView
                  name="chevron.right"
                  tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
                  style={{ width: 16, height: 16 }}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Taxes Section */}
          <View className="mt-6">
            <ThemedText size="lg" weight="semibold" className="mb-3">
              Taxes
            </ThemedText>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAddBreakdown("tax")}
              className={`rounded-xl p-4 mb-4 ${isDark ? "bg-[#1A1D1E]" : "bg-white"}`}
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.2)",
              }}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <SymbolView
                    name="plus"
                    tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                    size={18}
                  />
                </View>
                <View className="flex-1">
                  <ThemedText size="base" weight="semibold">
                    Add Tax
                  </ThemedText>
                </View>
                <SymbolView
                  name="chevron.right"
                  tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
                  size={14}
                />
              </View>
            </TouchableOpacity>

            {watchedTaxBreakdown.map((item, index) => (
              <View
                key={index}
                className="mb-3 rounded-xl p-4 border flex-row items-center justify-between"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <View className="flex-1">
                  <ThemedText size="base" weight="semibold">
                    {item.label}
                  </ThemedText>
                </View>
                <View className="flex-row items-center gap-3">
                  <ThemedText size="base" weight="semibold" family="sans">
                    {formatCurrency(item.amount, headerFields.currency)}
                  </ThemedText>
                  <View className="flex-row gap-1">
                    <TouchableOpacity
                      onPress={() => handleEditBreakdown("tax", index)}
                      className="p-2"
                    >
                      <SymbolView
                        name="square.and.pencil"
                        size={16}
                        tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeBreakdown("tax", index)}
                      className="p-2"
                    >
                      <SymbolView name="trash" size={16} tintColor="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Fees Section */}
          <View className="mt-6">
            <ThemedText size="lg" weight="semibold" className="mb-3">
              Fees
            </ThemedText>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAddBreakdown("fee")}
              className={`rounded-xl p-4 mb-4 ${isDark ? "bg-[#1A1D1E]" : "bg-white"}`}
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.2)",
              }}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <SymbolView
                    name="plus"
                    tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                    size={18}
                  />
                </View>
                <View className="flex-1">
                  <ThemedText size="base" weight="semibold">
                    Add Fee
                  </ThemedText>
                </View>
                <SymbolView
                  name="chevron.right"
                  tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
                  size={14}
                />
              </View>
            </TouchableOpacity>

            {watchedFeesBreakdown.map((item, index) => (
              <View
                key={index}
                className="mb-3 rounded-xl p-4 border flex-row items-center justify-between"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <View className="flex-1">
                  <ThemedText size="base" weight="semibold">
                    {item.label}
                  </ThemedText>
                </View>
                <View className="flex-row items-center gap-3">
                  <ThemedText size="base" weight="semibold" family="sans">
                    {formatCurrency(item.amount, headerFields.currency)}
                  </ThemedText>
                  <View className="flex-row gap-1">
                    <TouchableOpacity
                      onPress={() => handleEditBreakdown("fee", index)}
                      className="p-2"
                    >
                      <SymbolView
                        name="square.and.pencil"
                        size={16}
                        tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeBreakdown("fee", index)}
                      className="p-2"
                    >
                      <SymbolView name="trash" size={16} tintColor="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className="mt-6">
            <ThemedText size="lg" weight="semibold" className="mb-3">
              Totals Summary
            </ThemedText>
            <View className="flex-col gap-3 mt-3">
              <View className="flex-row justify-between items-center">
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.subtle : Colors.light.icon,
                  }}
                >
                  Subtotal
                </ThemedText>
                <ThemedText size="sm" weight="semibold">
                  {formatCurrency(displaySubtotal, headerFields.currency)}
                </ThemedText>
              </View>
              {displayTax > 0 ? (
                <View className="flex-row justify-between items-center">
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.subtle : Colors.light.icon,
                    }}
                  >
                    Tax
                  </ThemedText>
                  <ThemedText size="sm" weight="semibold">
                    {formatCurrency(displayTax, headerFields.currency)}
                  </ThemedText>
                </View>
              ) : null}
              {displayFees > 0 ? (
                <View className="flex-row justify-between items-center">
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.subtle : Colors.light.icon,
                    }}
                  >
                    Fees
                  </ThemedText>
                  <ThemedText size="sm" weight="semibold">
                    {formatCurrency(displayFees, headerFields.currency)}
                  </ThemedText>
                </View>
              ) : null}
              <View className="flex-row justify-between items-center pt-4 mt-2 border-t border-white/10">
                <ThemedText size="lg" weight="semibold">
                  Total
                </ThemedText>
                <ThemedText
                  size="2xl"
                  weight="bold"
                  style={{
                    color: isDark ? "#FFFFFF" : Colors.light.text,
                  }}
                >
                  {formatCurrency(displayTotal, headerFields.currency)}
                </ThemedText>
              </View>
            </View>
          </View>
          {children}
        </ThemedView>

        <ItemEditSheet
          bottomSheetRef={itemSheetRef}
          item={editingItem}
          onSave={handleItemSave}
          onClose={handleItemSheetClose}
        />

        <BreakdownEditSheet
          bottomSheetRef={breakdownSheetRef}
          type={editingBreakdown?.type || "tax"}
          item={editingBreakdown?.item}
          onSave={handleBreakdownSave}
          onClose={handleBreakdownSheetClose}
        />
      </ScrollView>
    );
  }
);

ManualReceiptForm.displayName = "ManualReceiptForm";
