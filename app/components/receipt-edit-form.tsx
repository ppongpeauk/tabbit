import { useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { FormTextInput } from "./form-text-input";
import { Button } from "./button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { formatCurrency } from "@/utils/format";
import type { StoredReceipt, ReceiptItem } from "@/utils/storage";

interface ReceiptEditFormData {
  name: string;
  merchantName: string;
  items: ReceiptItem[];
  userNotes: string;
}

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

  const {
    control,
    handleSubmit,
    watch,
  } = useForm<ReceiptEditFormData>({
    defaultValues: {
      name: receipt.name || receipt.merchant.name,
      merchantName: receipt.merchant.name,
      items: receipt.items.map(item => ({
        ...item,
        // Ensure string for inputs but keep numeric fields for calculations
      })),
      userNotes: receipt.appData?.userNotes || "",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  const recalculateTotals = useCallback(() => {
    const subtotal = watchedItems.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0
    );
    const tax = receipt.totals.tax;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [watchedItems, receipt.totals.tax]);

  const handleSave = handleSubmit(async (data) => {
    try {
      const totals = recalculateTotals();

      const updatedReceipt: Partial<StoredReceipt> = {
        name: data.name,
        merchant: {
          ...receipt.merchant,
          name: data.merchantName,
        },
        items: data.items,
        totals: {
          ...receipt.totals,
          subtotal: totals.subtotal,
          total: totals.total,
        },
        appData: {
          ...receipt.appData,
          userNotes: data.userNotes.trim() || undefined,
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
  });

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
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextInput
              label="Receipt Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Enter receipt name"
            />
          )}
        />

        {/* Merchant Name */}
        <Controller
          control={control}
          name="merchantName"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextInput
              label="Merchant"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Enter merchant name"
            />
          )}
        />

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Items</ThemedText>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => append({
                name: "",
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
              })}
              leftIcon={<SymbolView name="plus" />}
            >
              Add Item
            </Button>
          </View>

          {fields.map((field, index) => (
            <View
              key={field.id}
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
                {fields.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => remove(index)}
                    style={styles.deleteButton}
                  >
                    <SymbolView name="trash" tintColor="#FF3B30" size={16} />
                  </Button>
                )}
              </View>

              <Controller
                control={control}
                name={`items.${index}.name`}
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormTextInput
                    label="Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Item name"
                  />
                )}
              />

              <View style={styles.itemRow}>
                <View style={styles.itemRowHalf}>
                  <Controller
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormTextInput
                        label="Quantity"
                        value={value.toString()}
                        onChangeText={(text) => {
                          const qty = parseFloat(text) || 0;
                          onChange(qty);
                          const unitPrice = watchedItems[index]?.unitPrice || 0;
                          update(index, {
                            ...watchedItems[index],
                            quantity: qty,
                            totalPrice: qty * unitPrice,
                          });
                        }}
                        onBlur={onBlur}
                        numericOnly
                        min={0}
                        placeholder="1"
                      />
                    )}
                  />
                </View>
                <View style={styles.itemRowHalf}>
                  <Controller
                    control={control}
                    name={`items.${index}.unitPrice`}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormTextInput
                        label="Unit Price"
                        value={value.toString()}
                        onChangeText={(text) => {
                          const price = parseFloat(text) || 0;
                          onChange(price);
                          const quantity = watchedItems[index]?.quantity || 0;
                          update(index, {
                            ...watchedItems[index],
                            unitPrice: price,
                            totalPrice: quantity * price,
                          });
                        }}
                        onBlur={onBlur}
                        numericOnly
                        min={0}
                        placeholder="0.00"
                      />
                    )}
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
                  {formatCurrency(watchedItems[index]?.totalPrice || 0, currency)}
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
          <Controller
            control={control}
            name="userNotes"
            render={({ field: { onChange, onBlur, value } }) => (
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
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Add notes about this receipt..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button variant="secondary" onPress={onCancel} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="primary" onPress={handleSave} style={{ flex: 1 }}>
            Save Changes
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
});

