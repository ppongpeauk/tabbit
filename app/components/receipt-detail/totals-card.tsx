import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency } from "@/utils/format";
import { Colors } from "@/constants/theme";
import type { StoredReceipt } from "@/utils/storage";

interface TotalsCardProps {
  receipt: StoredReceipt;
}

export function TotalsCard({ receipt }: TotalsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Calculate tax percentage for display
  const taxPercentage =
    receipt.totals.subtotal > 0
      ? ((receipt.totals.tax / receipt.totals.subtotal) * 100).toFixed(2)
      : "0";

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <ThemedText
            size="sm"
            style={{
              color: isDark ? Colors.dark.subtle : Colors.light.icon,
            }}
          >
            Subtotal
          </ThemedText>
          <ThemedText size="sm" weight="semibold">
            {formatCurrency(receipt.totals.subtotal, receipt.totals.currency)}
          </ThemedText>
        </View>
        {receipt.totals.taxBreakdown &&
        receipt.totals.taxBreakdown.length > 0 ? (
          receipt.totals.taxBreakdown.map((taxItem, index) => (
            <View key={index} style={styles.totalRow}>
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.subtle : Colors.light.icon,
                }}
              >
                {taxItem.label}
              </ThemedText>
              <ThemedText size="sm" weight="semibold">
                {formatCurrency(taxItem.amount, receipt.totals.currency)}
              </ThemedText>
            </View>
          ))
        ) : receipt.totals.tax > 0 ? (
          <View style={styles.totalRow}>
            <ThemedText
              size="sm"
              style={{
                color: isDark ? Colors.dark.subtle : Colors.light.icon,
              }}
            >
              Tax ({taxPercentage}%)
            </ThemedText>
            <ThemedText size="sm" weight="semibold">
              {formatCurrency(receipt.totals.tax, receipt.totals.currency)}
            </ThemedText>
          </View>
        ) : null}
        <View style={[styles.totalRow, styles.totalRowFinal]}>
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
            {formatCurrency(receipt.totals.total, receipt.totals.currency)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 24,
  },
  totalsSection: {
    flexDirection: "column",
    gap: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalRowFinal: {
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
});
