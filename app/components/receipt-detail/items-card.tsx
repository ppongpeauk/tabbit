import { View, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency } from "@/utils/format";
import { Colors } from "@/constants/theme";
import type { StoredReceipt, ReceiptItem } from "@/utils/storage";

interface ItemsCardProps {
  receipt: StoredReceipt;
  onItemPress?: (item: ReceiptItem, index: number) => void;
  isCollaborator?: boolean;
}

export function ItemsCard({ receipt, onItemPress, isCollaborator = false }: ItemsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  // Theme-friendly background for quantity badge
  const quantityBg = isDark
    ? { backgroundColor: "rgba(255,255,255,0.07)" }
    : { backgroundColor: "rgba(20,20,20,0.06)" };

  return (
    <View className="flex flex-col gap-6">
      {receipt.items.map((item, index) => {
        const ItemWrapper = isCollaborator ? TouchableOpacity : View;
        return (
          <ItemWrapper
            key={index}
            onPress={
              isCollaborator
                ? () => {
                    if (process.env.EXPO_OS === "ios") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    onItemPress?.(item, index);
                  }
                : undefined
            }
            activeOpacity={isCollaborator ? 0.7 : undefined}
            className="flex-row justify-between items-start gap-4"
          >
          <View className="flex-1 flex-row gap-3">
            <View
              className="w-6 h-6 rounded-full items-center justify-center shrink-0"
              style={quantityBg}
            >
              <ThemedText
                size="xs"
                weight="bold"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                {item.quantity}
              </ThemedText>
            </View>
            <View className="flex-1 flex-col gap-1">
              <ThemedText
                size="base"
                weight="semibold"
                style={{ lineHeight: 20 }}
              >
                {item.name}
              </ThemedText>
              {Boolean(item.category?.trim()) || item.quantity > 1 ? (
                <ThemedText
                  size="sm"
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
            size="base"
            weight="semibold"
            style={{ lineHeight: 20, textAlign: "right" }}
          >
            {formatCurrency(item.totalPrice, receipt.totals.currency)}
          </ThemedText>
          </ItemWrapper>
        );
      })}
    </View>
  );
}
