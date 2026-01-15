import { View } from "react-native";
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
    <View className="mt-6">
      <View className="flex-col gap-3">
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
            {formatCurrency(receipt.totals.subtotal, receipt.totals.currency)}
          </ThemedText>
        </View>
        {receipt.totals.taxBreakdown &&
        receipt.totals.taxBreakdown.length > 0 ? (
          receipt.totals.taxBreakdown.map((taxItem, index) => (
            <View key={index} className="flex-row justify-between items-center">
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
          <View className="flex-row justify-between items-center">
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
            {formatCurrency(receipt.totals.total, receipt.totals.currency)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
