import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency } from "@/utils/format";
import { Colors } from "@/constants/theme";
import type { StoredReceipt } from "@/utils/storage";

interface ItemsCardProps {
  receipt: StoredReceipt;
}

export function ItemsCard({ receipt }: ItemsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View style={styles.itemsContainer}>
      {receipt.items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <View style={styles.quantityBadge}>
              <ThemedText
                size="xs"
                weight="medium"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                {item.quantity}
              </ThemedText>
            </View>
            <View style={styles.itemInfo}>
              <ThemedText size="sm" weight="medium" style={styles.itemName}>
                {item.name}
              </ThemedText>
              {(item.category || item.quantity > 1) && (
                <ThemedText
                  size="xs"
                  style={{
                    color: isDark ? Colors.dark.subtle : Colors.light.icon,
                  }}
                >
                  {item.category || ""}
                  {item.category && item.quantity > 1 ? " • " : ""}
                  {item.quantity > 1
                    ? `${item.quantity} × ${formatCurrency(
                        item.unitPrice,
                        receipt.totals.currency
                      )}`
                    : ""}
                </ThemedText>
              )}
            </View>
          </View>
          <ThemedText size="sm" weight="medium" style={styles.itemPrice}>
            {formatCurrency(item.totalPrice, receipt.totals.currency)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  itemsContainer: {
    flexDirection: "column",
    gap: 24,
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  itemLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  quantityBadge: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    lineHeight: 20,
  },
  itemPrice: {
    lineHeight: 20,
    textAlign: "right",
  },
});
