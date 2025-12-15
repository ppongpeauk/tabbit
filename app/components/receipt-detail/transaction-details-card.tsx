import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDate } from "@/utils/format";
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

  // Format date and time separately
  const date = new Date(receipt.transaction.datetime);
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  // Get category (default to "DINING" if not available)
  const category = receipt.merchant.category?.toUpperCase() || "DINING";

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
          name="tag.fill"
          tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
          style={styles.icon}
        />
        <ThemedText
          size="xs"
          weight="medium"
          style={{
            color: isDark ? Colors.dark.subtle : Colors.light.icon,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {category}
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
          name="checkmark.seal.fill"
          tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
          style={styles.icon}
        />
        <ThemedText
          size="xs"
          weight="medium"
          style={{
            color: isDark ? Colors.dark.subtle : Colors.light.icon,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Verified
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
    marginBottom: 24,
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
