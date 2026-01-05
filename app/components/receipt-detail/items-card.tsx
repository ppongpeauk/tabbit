import { View } from "react-native";
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
  // Theme-friendly background for quantity badge
  const quantityBg = isDark
    ? { backgroundColor: "rgba(255,255,255,0.07)" }
    : { backgroundColor: "rgba(20,20,20,0.06)" };

  return (
    <View className="flex flex-col gap-6">
      {receipt.items.map((item, index) => (
        <View
          key={index}
          className="flex-row justify-between items-start gap-4"
        >
          <View className="flex-1 flex-row gap-3">
            <View
              className="w-6 h-6 rounded-full items-center justify-center shrink-0"
              style={quantityBg}
            >
              <ThemedText
                size="xs"
                weight="semibold"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                {item.quantity}
              </ThemedText>
            </View>
            <View className="flex-1 flex-col gap-1">
              <ThemedText
                size="sm"
                weight="semibold"
                style={{ lineHeight: 20 }}
              >
                {item.name}
              </ThemedText>
              {Boolean(item.category?.trim()) || item.quantity > 1 ? (
                <ThemedText
                  size="xs"
                  style={{
                    color: isDark ? Colors.dark.subtle : Colors.light.icon,
                  }}
                >
                  {item.category?.trim() || ""}
                  {Boolean(item.category?.trim()) && item.quantity > 1
                    ? " • "
                    : ""}
                  {item.quantity > 1
                    ? `${item.quantity} × ${formatCurrency(
                        item.unitPrice,
                        receipt.totals.currency
                      )}`
                    : ""}
                </ThemedText>
              ) : null}
            </View>
          </View>
          <ThemedText
            size="sm"
            weight="semibold"
            style={{ lineHeight: 20, textAlign: "right" }}
          >
            {formatCurrency(item.totalPrice, receipt.totals.currency)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}
