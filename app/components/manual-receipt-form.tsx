/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Form component for manually entering receipt information
 */

import {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import type React from "react";
import { View, ScrollView, Alert, TouchableOpacity } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { FormTextInput } from "./form-text-input";
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
} from "@/utils/api";
import type { ManualReceiptHeaderFields } from "@/components/manual-receipt-header-fields";

interface ManualReceiptFormData {
  name: string;
  merchant: Merchant;
  transaction: Transaction;
  items: ReceiptItem[];
  totals: Totals;
  returnInfo?: ReturnInfo;
  userNotes?: string;
}

interface ManualReceiptFormProps {
  onSave: (data: ManualReceiptFormData) => Promise<void>;
  onFormDataChange?: (hasData: boolean) => void;
  headerFields: ManualReceiptHeaderFields;
  initialItems?: ReceiptItem[];
  initialTotals?: {
    subtotal: number;
    tax: number;
    total: number;
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

    // Items
    const [items, setItems] = useState<ReceiptItem[]>(() => initialItems || []);
    const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const itemSheetRef = useRef<TrueSheet | null>(null);

    // Totals
    const [subtotal, setSubtotal] = useState(
      initialTotals ? initialTotals.subtotal.toFixed(2) : ""
    );
    const [tax, setTax] = useState(
      initialTotals ? initialTotals.tax.toFixed(2) : ""
    );
    const [total, setTotal] = useState(
      initialTotals ? initialTotals.total.toFixed(2) : ""
    );

    const initialSnapshotRef = useRef({
      items: initialItems || [],
      totals: {
        subtotal: initialTotals?.subtotal ?? 0,
        tax: initialTotals?.tax ?? 0,
        total: initialTotals?.total ?? 0,
      },
    });

    const areItemsEqual = useCallback(
      (current: ReceiptItem[], initial: ReceiptItem[]) => {
        if (current.length !== initial.length) return false;
        return current.every((item, index) => {
          const original = initial[index];
          return (
            item.name === original.name &&
            item.quantity === original.quantity &&
            item.unitPrice === original.unitPrice &&
            item.totalPrice === original.totalPrice
          );
        });
      },
      []
    );

    // Track if form has data for dirty checking
    useEffect(() => {
      const initialTotalsSnapshot = initialSnapshotRef.current.totals;
      const currentTotals = {
        subtotal: parseFloat(subtotal) || 0,
        tax: parseFloat(tax) || 0,
        total: parseFloat(total) || 0,
      };
      const totalsDirty =
        Math.abs(currentTotals.subtotal - initialTotalsSnapshot.subtotal) >
          0.01 ||
        Math.abs(currentTotals.tax - initialTotalsSnapshot.tax) > 0.01 ||
        Math.abs(currentTotals.total - initialTotalsSnapshot.total) > 0.01;
      const itemsDirty = !areItemsEqual(
        items,
        initialSnapshotRef.current.items
      );

      onFormDataChange?.(totalsDirty || itemsDirty);
    }, [items, subtotal, tax, total, onFormDataChange, areItemsEqual]);

    const handleAddItem = useCallback(() => {
      setEditingItem(null);
      setEditingIndex(null);
      itemSheetRef.current?.present();
      // Small delay to ensure sheet is opening, then focus will happen in ItemEditSheet
    }, []);

    const handleEditItem = useCallback(
      (index: number) => {
        setEditingItem(items[index]);
        setEditingIndex(index);
        itemSheetRef.current?.present();
      },
      [items]
    );

    const handleItemSave = useCallback(
      (item: ReceiptItem) => {
        if (editingIndex !== null) {
          // Editing existing item
          const newItems = [...items];
          newItems[editingIndex] = item;
          setItems(newItems);
        } else {
          // Adding new item
          setItems([...items, item]);
        }
        setEditingItem(null);
        setEditingIndex(null);
      },
      [items, editingIndex]
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
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                const newItems = items.filter((_, i) => i !== index);
                setItems(newItems);
              },
            },
          ],
          { cancelable: true }
        );
      },
      [items]
    );

    const recalculateTotals = useCallback(() => {
      const itemsSubtotal = items.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0
      );
      const taxAmount = parseFloat(tax) || 0;
      const calculatedTotal = itemsSubtotal + taxAmount;

      // Update subtotal and total if they're empty or if items changed
      if (!subtotal || Math.abs(parseFloat(subtotal) - itemsSubtotal) > 0.01) {
        setSubtotal(itemsSubtotal.toFixed(2));
      }
      if (!total || Math.abs(parseFloat(total) - calculatedTotal) > 0.01) {
        setTotal(calculatedTotal.toFixed(2));
      }

      return {
        subtotal: itemsSubtotal,
        tax: taxAmount,
        total: calculatedTotal,
      };
    }, [items, tax, subtotal, total]);

    const handleSave = useCallback(async () => {
      // Validation
      if (!headerFields.merchantName.trim()) {
        Alert.alert("Validation Error", "Merchant name is required");
        return;
      }

      if (items.some((item) => !item.name.trim())) {
        Alert.alert("Validation Error", "All items must have a name");
        return;
      }

      const totals = recalculateTotals();
      const subtotalValue = parseFloat(subtotal) || totals.subtotal;
      const taxValue = parseFloat(tax) || 0;
      const totalValue = parseFloat(total) || totals.total;

      // Build datetime string
      const datetime =
        headerFields.transactionDate && headerFields.transactionTime
          ? `${headerFields.transactionDate}T${headerFields.transactionTime}:00`
          : new Date().toISOString();

      const formData: ManualReceiptFormData = {
        name: headerFields.name.trim() || "Untitled",
        merchant: {
          name: headerFields.merchantName.trim(),
          address: headerFields.merchantAddressLine1
            ? {
                line1: headerFields.merchantAddressLine1,
              }
            : undefined,
          phone: headerFields.merchantPhone || undefined,
        },
        transaction: {
          datetime,
        },
        items: items.filter((item) => item.name.trim()),
        totals: {
          currency: headerFields.currency,
          subtotal: subtotalValue,
          tax: taxValue,
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
    }, [headerFields, items, subtotal, tax, total, recalculateTotals, onSave]);

    // Expose save method via ref
    useImperativeHandle(ref, () => ({
      save: handleSave,
    }));

    const totals = recalculateTotals();
    const displaySubtotal = parseFloat(subtotal) || totals.subtotal;
    const displayTax = parseFloat(tax) || 0;
    const displayTotal = parseFloat(total) || totals.total;

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

            {items.map((item, index) => (
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
                        name="pencil"
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
                  <ThemedText size="base" weight="semibold" family="mono">
                    {formatCurrency(item.totalPrice, headerFields.currency)}
                  </ThemedText>
                </View>
              </View>
            ))}

            {/* Add Item Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAddItem}
              className={`rounded-xl p-4 gap-1 ${
                isDark ? "bg-[#1A1D1E]" : "bg-white"
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

          <View className="mt-6">
            <ThemedText size="lg" weight="semibold" className="mb-3">
              Totals
            </ThemedText>
            <FormTextInput
              label="Subtotal"
              value={subtotal}
              onChangeText={setSubtotal}
              numericOnly
              min={0}
              placeholder="0.00"
            />
            <FormTextInput
              label="Tax"
              value={tax}
              onChangeText={setTax}
              numericOnly
              min={0}
              placeholder="0.00"
            />
            <FormTextInput
              label="Total"
              value={total}
              onChangeText={setTotal}
              numericOnly
              min={0}
              placeholder="0.00"
            />
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
      </ScrollView>
    );
  }
);

ManualReceiptForm.displayName = "ManualReceiptForm";
