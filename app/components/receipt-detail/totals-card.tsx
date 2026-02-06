import { View, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency } from "@/utils/format";
import { Colors } from "@/constants/theme";
import type { StoredReceipt } from "@/utils/storage";

interface TotalsCardProps {
  receipt: StoredReceipt;
  onTotalsPress?: () => void;
  isCollaborator?: boolean;
}

export function TotalsCard({ receipt, onTotalsPress, isCollaborator = false }: TotalsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Calculate tax percentage for display
  const taxPercentage =
    receipt.totals.subtotal > 0
      ? ((receipt.totals.tax / receipt.totals.subtotal) * 100).toFixed(2)
      : "0";

  const TotalsWrapper = isCollaborator ? TouchableOpacity : View;

  return (
    <TotalsWrapper
      activeOpacity={isCollaborator ? 0.7 : undefined}
      onPress={
        isCollaborator
          ? () => {
              if (process.env.EXPO_OS === "ios") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onTotalsPress?.();
            }
          : undefined
      }
      className="mt-6"
    >
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
        {receipt.totals.feesBreakdown &&
          receipt.totals.feesBreakdown.length > 0 ? (
          receipt.totals.feesBreakdown.map((feeItem, index) => (
            <View key={index} className="flex-row justify-between items-center">
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.subtle : Colors.light.icon,
                }}
              >
                {feeItem.label}
              </ThemedText>
              <ThemedText size="sm" weight="semibold">
                {formatCurrency(feeItem.amount, receipt.totals.currency)}
              </ThemedText>
            </View>
          ))
        ) : receipt.totals.fees > 0 ? (
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
              {formatCurrency(receipt.totals.fees, receipt.totals.currency)}
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
    </TotalsWrapper>
  );
}
