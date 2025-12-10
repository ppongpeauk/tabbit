/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Form component for manually entering receipt information
 */

import { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { FormTextInput } from "./form-text-input";
import { Button } from "./button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { formatCurrency } from "@/utils/format";
import type {
  Merchant,
  Transaction,
  Totals,
  ReceiptItem,
  ReturnInfo,
} from "@/utils/api";

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
  onCancel: () => void;
  onFormDataChange?: (hasData: boolean) => void;
}

export function ManualReceiptForm({
  onSave,
  onCancel,
  onFormDataChange,
}: ManualReceiptFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[colorScheme ?? "light"];

  // Receipt name
  const [name, setName] = useState("");

  // Merchant info
  const [merchantName, setMerchantName] = useState("");
  const [merchantAddressLine1, setMerchantAddressLine1] = useState("");
  const [merchantCity, setMerchantCity] = useState("");
  const [merchantState, setMerchantState] = useState("");
  const [merchantPostalCode, setMerchantPostalCode] = useState("");
  const [merchantCountry, setMerchantCountry] = useState("");
  const [merchantPhone, setMerchantPhone] = useState("");
  const [merchantReceiptNumber, setMerchantReceiptNumber] = useState("");

  // Transaction info
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transactionTime, setTransactionTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [transactionId, setTransactionId] = useState("");
  const [registerId, setRegisterId] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  // Items
  const [items, setItems] = useState<ReceiptItem[]>([
    {
      name: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    },
  ]);

  // Totals
  const [currency, setCurrency] = useState("USD");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [total, setTotal] = useState("");

  // Return info
  const [returnBarcode, setReturnBarcode] = useState("");
  const [returnPolicyText, setReturnPolicyText] = useState("");

  // Notes
  const [userNotes, setUserNotes] = useState("");

  // Track if form has data for dirty checking
  useEffect(() => {
    const hasData =
      name.trim() !== "" ||
      merchantName.trim() !== "" ||
      items.some((item) => item.name.trim() !== "") ||
      subtotal !== "" ||
      tax !== "" ||
      total !== "";
    onFormDataChange?.(hasData);
  }, [name, merchantName, items, subtotal, tax, total, onFormDataChange]);

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

    return { subtotal: itemsSubtotal, tax: taxAmount, total: calculatedTotal };
  }, [items, tax, subtotal, total]);

  const handleSave = useCallback(async () => {
    // Validation
    if (!merchantName.trim()) {
      Alert.alert("Validation Error", "Merchant name is required");
      return;
    }

    if (items.length === 0 || items.some((item) => !item.name.trim())) {
      Alert.alert(
        "Validation Error",
        "At least one item with a name is required"
      );
      return;
    }

    const totals = recalculateTotals();
    const subtotalValue = parseFloat(subtotal) || totals.subtotal;
    const taxValue = parseFloat(tax) || 0;
    const totalValue = parseFloat(total) || totals.total;

    // Build datetime string
    const datetime =
      transactionDate && transactionTime
        ? `${transactionDate}T${transactionTime}:00`
        : new Date().toISOString();

    const formData: ManualReceiptFormData = {
      name: name.trim() || merchantName.trim(),
      merchant: {
        name: merchantName.trim(),
        address:
          merchantAddressLine1 ||
          merchantCity ||
          merchantState ||
          merchantPostalCode ||
          merchantCountry
            ? {
                line1: merchantAddressLine1 || undefined,
                city: merchantCity || undefined,
                state: merchantState || undefined,
                postalCode: merchantPostalCode || undefined,
                country: merchantCountry || undefined,
              }
            : undefined,
        phone: merchantPhone || undefined,
        receiptNumber: merchantReceiptNumber || undefined,
      },
      transaction: {
        datetime,
        transactionId: transactionId || undefined,
        registerId: registerId || undefined,
        cashierId: cashierId || undefined,
        paymentMethod: paymentMethod || undefined,
      },
      items: items.filter((item) => item.name.trim()),
      totals: {
        currency,
        subtotal: subtotalValue,
        tax: taxValue,
        total: totalValue,
      },
      returnInfo:
        returnBarcode || returnPolicyText
          ? {
              returnBarcode: returnBarcode || undefined,
              hasReturnBarcode: !!returnBarcode,
              returnPolicyText: returnPolicyText
                ? [returnPolicyText]
                : undefined,
            }
          : undefined,
      userNotes: userNotes.trim() || undefined,
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
    }
  }, [
    name,
    merchantName,
    merchantAddressLine1,
    merchantCity,
    merchantState,
    merchantPostalCode,
    merchantCountry,
    merchantPhone,
    merchantReceiptNumber,
    transactionDate,
    transactionTime,
    transactionId,
    registerId,
    cashierId,
    paymentMethod,
    items,
    currency,
    subtotal,
    tax,
    total,
    returnBarcode,
    returnPolicyText,
    userNotes,
    recalculateTotals,
    onSave,
  ]);

  const totals = recalculateTotals();
  const displaySubtotal = parseFloat(subtotal) || totals.subtotal;
  const displayTax = parseFloat(tax) || 0;
  const displayTotal = parseFloat(total) || totals.total;

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
          placeholder="Enter receipt name (optional)"
        />

        {/* Merchant Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Merchant Information
          </ThemedText>
          <FormTextInput
            label="Merchant Name *"
            value={merchantName}
            onChangeText={setMerchantName}
            placeholder="Enter merchant name"
          />
          <FormTextInput
            label="Address Line 1"
            value={merchantAddressLine1}
            onChangeText={setMerchantAddressLine1}
            placeholder="Street address"
          />
          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <FormTextInput
                label="City"
                value={merchantCity}
                onChangeText={setMerchantCity}
                placeholder="City"
              />
            </View>
            <View style={styles.rowHalf}>
              <FormTextInput
                label="State"
                value={merchantState}
                onChangeText={setMerchantState}
                placeholder="State"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <FormTextInput
                label="Postal Code"
                value={merchantPostalCode}
                onChangeText={setMerchantPostalCode}
                placeholder="ZIP code"
              />
            </View>
            <View style={styles.rowHalf}>
              <FormTextInput
                label="Country"
                value={merchantCountry}
                onChangeText={setMerchantCountry}
                placeholder="Country"
              />
            </View>
          </View>
          <FormTextInput
            label="Phone"
            value={merchantPhone}
            onChangeText={setMerchantPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
          <FormTextInput
            label="Receipt Number"
            value={merchantReceiptNumber}
            onChangeText={setMerchantReceiptNumber}
            placeholder="Receipt number"
          />
        </View>

        {/* Transaction Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Transaction Details
          </ThemedText>
          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <FormTextInput
                label="Date"
                value={transactionDate}
                onChangeText={setTransactionDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.rowHalf}>
              <FormTextInput
                label="Time"
                value={transactionTime}
                onChangeText={setTransactionTime}
                placeholder="HH:MM"
              />
            </View>
          </View>
          <FormTextInput
            label="Transaction ID"
            value={transactionId}
            onChangeText={setTransactionId}
            placeholder="Transaction ID"
          />
          <FormTextInput
            label="Register ID"
            value={registerId}
            onChangeText={setRegisterId}
            placeholder="Register ID"
          />
          <FormTextInput
            label="Cashier ID"
            value={cashierId}
            onChangeText={setCashierId}
            placeholder="Cashier ID"
          />
          <FormTextInput
            label="Payment Method"
            value={paymentMethod}
            onChangeText={setPaymentMethod}
            placeholder="e.g., Cash, Credit Card, etc."
          />
        </View>

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Items</ThemedText>
            <Button
              variant="secondary"
              size="sm"
              onPress={addItem}
              leftIcon={<SymbolView name="plus" />}
            >
              Add Item
            </Button>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => removeItem(index)}
                    style={styles.deleteButton}
                  >
                    <SymbolView name="trash" tintColor="#FF3B30" size={16} />
                  </Button>
                )}
              </View>

              <FormTextInput
                label="Name *"
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

        {/* Totals Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Totals</ThemedText>
          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <FormTextInput
                label="Currency"
                value={currency}
                onChangeText={setCurrency}
                placeholder="USD"
              />
            </View>
            <View style={styles.rowHalf}>
              <FormTextInput
                label="Subtotal"
                value={subtotal}
                onChangeText={setSubtotal}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>
          </View>
          <FormTextInput
            label="Tax"
            value={tax}
            onChangeText={setTax}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <FormTextInput
            label="Total"
            value={total}
            onChangeText={setTotal}
            keyboardType="numeric"
            placeholder="0.00"
          />
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
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Subtotal:</ThemedText>
              <ThemedText style={styles.totalValue}>
                {formatCurrency(displaySubtotal, currency)}
              </ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Tax:</ThemedText>
              <ThemedText style={styles.totalValue}>
                {formatCurrency(displayTax, currency)}
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
                {formatCurrency(displayTotal, currency)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Return Info Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Return Information (Optional)
          </ThemedText>
          <FormTextInput
            label="Return Barcode"
            value={returnBarcode}
            onChangeText={setReturnBarcode}
            placeholder="Barcode or QR code"
          />
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
            value={returnPolicyText}
            onChangeText={setReturnPolicyText}
            placeholder="Return policy text..."
            placeholderTextColor={colors.icon}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Notes Section */}
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
          <Button variant="secondary" onPress={onCancel} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="primary" onPress={handleSave} style={{ flex: 1 }}>
            Save Receipt
          </Button>
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
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowHalf: {
    flex: 1,
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
    marginTop: 12,
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
    minHeight: 80,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
});
