/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt edit form component
 */

import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { FormTextInput } from "./form-text-input";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { formatCurrency } from "@/utils/format";
import type { StoredReceipt, ReceiptItem } from "@/utils/storage";

interface ReceiptEditFormProps {
  receipt: StoredReceipt;
  onSave: (updatedReceipt: Partial<StoredReceipt>) => Promise<void>;
  onCancel: () => void;
}

export function ReceiptEditForm({
  receipt,
  onSave,
  onCancel,
}: ReceiptEditFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[colorScheme ?? "light"];

  const [name, setName] = useState(receipt.name || receipt.merchant.name);
  const [merchantName, setMerchantName] = useState(receipt.merchant.name);
  const [items, setItems] = useState<ReceiptItem[]>(receipt.items);
  const [userNotes, setUserNotes] = useState(
    receipt.appData?.userNotes || ""
  );

  const updateItem = useCallback(
    (index: number, updates: Partial<ReceiptItem>) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], ...updates };

      // Recalculate totalPrice if quantity or unitPrice changed
      if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
        const item = newItems[index];
        newItems[index] = {
          ...item,
          totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
        };
      }

      setItems(newItems);
    },
    [items]
  );

  const addItem = useCallback(() => {
    setItems([
      ...items,
      {
        name: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  }, [items]);

  const removeItem = useCallback(
    (index: number) => {
      if (items.length <= 1) {
        Alert.alert("Error", "At least one item is required");
        return;
      }
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    },
    [items]
  );

  const recalculateTotals = useCallback(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0
    );
    const tax = receipt.totals.tax;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [items, receipt.totals.tax]);

  const handleSave = useCallback(async () => {
    try {
      const totals = recalculateTotals();

      const updatedReceipt: Partial<StoredReceipt> = {
        name,
        merchant: {
          ...receipt.merchant,
          name: merchantName,
        },
        items,
        totals: {
          ...receipt.totals,
          subtotal: totals.subtotal,
          total: totals.total,
        },
        appData: {
          ...receipt.appData,
          userNotes: userNotes.trim() || undefined,
        },
      };

      await onSave(updatedReceipt);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to save changes. Please try again."
      );
    }
  }, [
    name,
    merchantName,
    items,
    userNotes,
    receipt,
    recalculateTotals,
    onSave,
  ]);

  const totals = recalculateTotals();
  const currency = receipt.totals.currency;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.form}>
        {/* Receipt Name */}
        <FormTextInput
          label="Receipt Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter receipt name"
        />

        {/* Merchant Name */}
        <FormTextInput
          label="Merchant"
          value={merchantName}
          onChangeText={setMerchantName}
          placeholder="Enter merchant name"
        />

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Items</ThemedText>
            <TouchableOpacity
              onPress={addItem}
              style={[
                styles.addButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.05)",
                },
              ]}
            >
              <SymbolView
                name="plus"
                tintColor={colors.tint}
                size={16}
              />
              <ThemedText style={[styles.addButtonText, { color: colors.tint }]}>
                Add Item
              </ThemedText>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.itemCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <View style={styles.itemHeader}>
                <ThemedText style={styles.itemNumber}>
                  Item {index + 1}
                </ThemedText>
                {items.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeItem(index)}
                    style={styles.deleteButton}
                  >
                    <SymbolView
                      name="trash"
                      tintColor="#FF3B30"
                      size={16}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <FormTextInput
                label="Name"
                value={item.name}
                onChangeText={(text) => updateItem(index, { name: text })}
                placeholder="Item name"
              />

              <View style={styles.itemRow}>
                <View style={styles.itemRowHalf}>
                  <FormTextInput
                    label="Quantity"
                    value={item.quantity.toString()}
                    onChangeText={(text) => {
                      const qty = parseFloat(text) || 0;
                      updateItem(index, { quantity: qty });
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
                <View style={styles.itemRowHalf}>
                  <FormTextInput
                    label="Unit Price"
                    value={item.unitPrice.toString()}
                    onChangeText={(text) => {
                      const price = parseFloat(text) || 0;
                      updateItem(index, { unitPrice: price });
                    }}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                </View>
              </View>

              <View
                style={[
                  styles.itemTotal,
                  {
                    borderTopColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  },
                ]}
              >
                <ThemedText style={styles.itemTotalLabel}>Total:</ThemedText>
                <ThemedText style={styles.itemTotalValue}>
                  {formatCurrency(item.totalPrice, currency)}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Totals Summary */}
        <View
          style={[
            styles.totalsCard,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            },
          ]}
        >
          <ThemedText style={styles.totalsTitle}>Totals</ThemedText>
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Subtotal:</ThemedText>
            <ThemedText style={styles.totalValue}>
              {formatCurrency(totals.subtotal, currency)}
            </ThemedText>
          </View>
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Tax:</ThemedText>
            <ThemedText style={styles.totalValue}>
              {formatCurrency(receipt.totals.tax, currency)}
            </ThemedText>
          </View>
          <View
            style={[
              styles.totalRow,
              styles.totalRowFinal,
              {
                borderTopColor: isDark
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.2)",
              },
            ]}
          >
            <ThemedText style={styles.totalLabelFinal}>Total:</ThemedText>
            <ThemedText style={styles.totalValueFinal}>
              {formatCurrency(totals.total, currency)}
            </ThemedText>
          </View>
        </View>

        {/* User Notes */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : colors.background,
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                color: colors.text,
              },
            ]}
            value={userNotes}
            onChangeText={setUserNotes}
            placeholder="Add notes about this receipt..."
            placeholderTextColor={colors.icon}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onCancel}
            style={[
              styles.cancelButton,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)",
              },
            ]}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
          >
            <ThemedText
              style={[styles.saveButtonText, { color: "#fff" }]}
              lightColor="#fff"
              darkColor="#fff"
            >
              Save Changes
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  form: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts.sans,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Fonts.sans,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Fonts.mono,
    opacity: 0.7,
  },
  deleteButton: {
    padding: 4,
  },
  itemRow: {
    flexDirection: "row",
    gap: 12,
  },
  itemRowHalf: {
    flex: 1,
  },
  itemTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  itemTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Fonts.mono,
  },
  itemTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Fonts.mono,
  },
  totalsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
  },
  totalsTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts.sans,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  totalRowFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Fonts.mono,
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Fonts.mono,
  },
  notesInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    fontFamily: Fonts.sans,
    minHeight: 100,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Fonts.sans,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Fonts.sans,
  },
});

