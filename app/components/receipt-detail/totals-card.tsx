import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency } from "@/utils/format";
import { getCardStyle } from "./utils";
import type { StoredReceipt } from "@/utils/storage";

interface TotalsCardProps {
  receipt: StoredReceipt;
}

export function TotalsCard({ receipt }: TotalsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View>
      <ThemedText size="xl" weight="bold" style={{ marginBottom: 4 }}>
        Totals
      </ThemedText>
      <View style={styles.totalRow}>
        <ThemedText size="base" weight="semibold" style={{ opacity: 0.7 }}>
          Subtotal
        </ThemedText>
        <ThemedText size="base" weight="semibold">
          {formatCurrency(receipt.totals.subtotal, receipt.totals.currency)}
        </ThemedText>
      </View>
      {receipt.totals.taxBreakdown && receipt.totals.taxBreakdown.length > 0 ? (
        receipt.totals.taxBreakdown.map((taxItem, index) => (
          <View key={index} style={styles.totalRow}>
            <ThemedText size="base" weight="semibold" style={{ opacity: 0.7 }}>
              {taxItem.label}
            </ThemedText>
            <ThemedText size="base" weight="semibold">
              {formatCurrency(taxItem.amount, receipt.totals.currency)}
            </ThemedText>
          </View>
        ))
      ) : (
        <View style={styles.totalRow}>
          <ThemedText size="base" weight="semibold" style={{ opacity: 0.7 }}>
            Tax
          </ThemedText>
          <ThemedText size="base" weight="semibold">
            {formatCurrency(receipt.totals.tax, receipt.totals.currency)}
          </ThemedText>
        </View>
      )}
      <View
        style={[
          styles.totalRow,
          styles.totalRowFinal,
          {
            borderTopWidth: 1,
            borderTopColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        <ThemedText size="base" weight="bold">
          Total
        </ThemedText>
        <ThemedText size="base" weight="bold">
          {formatCurrency(receipt.totals.total, receipt.totals.currency)}
        </ThemedText>
      </View>
      {receipt.totals.amountPaid !== undefined && (
        <View style={styles.totalRow}>
          <ThemedText size="base" weight="semibold" style={{ opacity: 0.7 }}>
            Amount Paid
          </ThemedText>
          <ThemedText size="base" weight="semibold">
            {formatCurrency(receipt.totals.amountPaid, receipt.totals.currency)}
          </ThemedText>
        </View>
      )}
      {receipt.totals.changeDue !== undefined &&
        receipt.totals.changeDue > 0 && (
          <View style={styles.totalRow}>
            <ThemedText size="base" weight="semibold" style={{ opacity: 0.7 }}>
              Change
            </ThemedText>
            <ThemedText size="base" weight="semibold">
              {formatCurrency(
                receipt.totals.changeDue,
                receipt.totals.currency
              )}
            </ThemedText>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalRowFinal: {
    marginTop: 8,
    paddingTop: 12,
  },
});
