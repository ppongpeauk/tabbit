import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDate } from "@/utils/format";
import { getCardStyle } from "./utils";
import type { StoredReceipt } from "@/utils/storage";

interface TransactionDetailsCardProps {
  receipt: StoredReceipt;
}

export function TransactionDetailsCard({
  receipt,
}: TransactionDetailsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View style={[styles.card, getCardStyle(isDark)]}>
      <ThemedText size="xl" weight="bold" style={{ marginBottom: 4 }}>
        Transaction Details
      </ThemedText>
      <View style={styles.detailRow}>
        <ThemedText size={15} style={{ opacity: 0.7 }}>
          Date & Time
        </ThemedText>
        <ThemedText size={15} weight="semibold">
          {formatDate(receipt.transaction.datetime)}
        </ThemedText>
      </View>
      {receipt.merchant.receiptNumber && (
        <View style={styles.detailRow}>
          <ThemedText size={15} style={{ opacity: 0.7 }}>
            Receipt #
          </ThemedText>
          <ThemedText size={15} weight="semibold">
            {receipt.merchant.receiptNumber}
          </ThemedText>
        </View>
      )}
      {receipt.transaction.transactionId && (
        <View style={styles.detailRow}>
          <ThemedText size={15} style={{ opacity: 0.7 }}>
            Transaction #
          </ThemedText>
          <ThemedText size={15} weight="semibold">
            {receipt.transaction.transactionId}
          </ThemedText>
        </View>
      )}
      {receipt.transaction.paymentMethod && (
        <View style={styles.detailRow}>
          <ThemedText size={15} style={{ opacity: 0.7 }}>
            Payment
          </ThemedText>
          <ThemedText size={15} weight="semibold">
            {receipt.transaction.paymentMethod}
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
});
