/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Items list card component
 */

import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency } from "@/utils/format";
import { Colors } from "@/constants/theme";
import { getCardStyle } from "./utils";
import type { StoredReceipt } from "@/utils/storage";

interface ItemsCardProps {
  receipt: StoredReceipt;
}

export function ItemsCard({ receipt }: ItemsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View style={[styles.card, getCardStyle(isDark)]}>
      <View
        style={{
          flexDirection: "row",
          gap: 4,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <ThemedText size="xl" weight="bold">
          Items
        </ThemedText>
        <ThemedText size="xl" weight="semibold" style={{ opacity: 0.7 }}>
          {receipt.items.length}
        </ThemedText>
      </View>
      {receipt.items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <ThemedText
              size="base"
              weight="semibold"
              style={{ marginBottom: 4 }}
            >
              {item.name}
            </ThemedText>
            <ThemedText
              size="sm"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              }}
            >
              {item.quantity} ×{" "}
              {formatCurrency(item.unitPrice, receipt.totals.currency)}
              {item.category && ` • ${item.category}`}
            </ThemedText>
          </View>
          <ThemedText size="base" weight="semibold">
            {formatCurrency(item.totalPrice, receipt.totals.currency)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
  },
});
