import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  formatReceiptDate,
  formatReceiptTime,
} from "@/utils/format";
import { Colors } from "@/constants/theme";
import type { StoredReceipt } from "@/utils/storage";

interface TransactionDetailsCardProps {
  receipt: StoredReceipt;
}

export function TransactionDetailsCard({
  receipt,
}: TransactionDetailsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Format date and time separately using safe formatters
  const dateStr = formatReceiptDate(receipt.transaction.datetime);
  const timeStr = formatReceiptTime(receipt.transaction.datetime);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isDark
              ? Colors.dark.surface
              : "rgba(0, 0, 0, 0.02)",
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          },
        ]}
      >
        <SymbolView
          name="calendar"
          tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
          style={styles.icon}
        />
        <ThemedText
          size="xs"
          weight="medium"
          style={{
            color: isDark ? Colors.dark.subtle : Colors.light.icon,
          }}
        >
          {dateStr}
        </ThemedText>
      </View>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isDark
              ? Colors.dark.surface
              : "rgba(0, 0, 0, 0.02)",
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          },
        ]}
      >
        <SymbolView
          name="clock.fill"
          tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
          style={styles.icon}
        />
        <ThemedText
          size="xs"
          weight="medium"
          style={{
            color: isDark ? Colors.dark.subtle : Colors.light.icon,
          }}
        >
          {timeStr}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  icon: {
    width: 16,
    height: 16,
  },
});
