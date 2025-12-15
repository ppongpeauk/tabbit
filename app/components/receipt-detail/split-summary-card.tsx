import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { formatCurrency } from "@/utils/format";
import { SplitSummary } from "@/components/split/split-summary";
import type { StoredReceipt, Friend } from "@/utils/storage";
import * as Haptics from "expo-haptics";

interface SplitSummaryCardProps {
  receipt: StoredReceipt;
  friends: Friend[];
}

export function SplitSummaryCard({ receipt, friends }: SplitSummaryCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!receipt.splitData) {
    return null;
  }

  const handleViewSplit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/split",
      params: { receiptId: receipt.id },
    });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.05)",
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText size="xl" weight="bold">
          Split
        </ThemedText>
        <Pressable onPress={handleViewSplit} style={styles.viewButton}>
          <ThemedText
            size="sm"
            weight="semibold"
            style={{
              color: isDark ? Colors.dark.tint : Colors.light.tint,
            }}
          >
            View/Edit
          </ThemedText>
        </Pressable>
      </View>
      <SplitSummary
        splitData={receipt.splitData}
        friends={friends}
        receiptTotal={receipt.totals.total}
        currency={receipt.totals.currency}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  viewButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
