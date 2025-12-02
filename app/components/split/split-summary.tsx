/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Split summary component showing final breakdown
 */

import { View, StyleSheet, ScrollView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { formatCurrency } from "@/utils/format";
import type { Friend } from "@/utils/storage";
import type { SplitData } from "@/utils/split";
import type { ContactInfo } from "@/utils/contacts";

interface SplitSummaryProps {
  splitData: SplitData;
  friends: Friend[];
  deviceContacts?: ContactInfo[];
  receiptTotal: number;
  currency: string;
}

// Generate a consistent ID for a contact (same as in friend-selector)
function getContactId(contact: ContactInfo): string {
  return `contact:${contact.name}:${contact.phoneNumber || contact.email || ""}`;
}

export function SplitSummary({
  splitData,
  friends,
  deviceContacts = [],
  receiptTotal,
  currency,
}: SplitSummaryProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const calculatedTotal = Object.values(splitData.totals).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const isValid = Math.abs(calculatedTotal - receiptTotal) < 0.01;

  const getPersonName = (personId: string): string => {
    // Check if it's a friend
    const friend = friends.find((f) => f.id === personId);
    if (friend) return friend.name;

    // Check if it's a contact
    if (personId.startsWith("contact:")) {
      const contact = deviceContacts.find(
        (c) => getContactId(c) === personId
      );
      if (contact) return contact.name;
    }

    return "Unknown";
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.02)",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
      ]}
    >
      <ThemedText size="lg" weight="bold" style={styles.title}>
        Split Summary
      </ThemedText>

      <ScrollView style={styles.summaryList}>
        {Object.keys(splitData.totals).map((friendId) => {
          const baseAmount = splitData.friendShares[friendId] || 0;
          const taxAmount = splitData.taxDistribution[friendId] || 0;
          const tipAmount = splitData.tipDistribution?.[friendId] || 0;
          const total = splitData.totals[friendId] || 0;

          return (
            <View
              key={friendId}
              style={[
                styles.summaryItem,
                {
                  borderBottomColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <View style={styles.summaryHeader}>
                <ThemedText size="base" weight="semibold">
                  {getPersonName(friendId)}
                </ThemedText>
                <ThemedText size="base" weight="bold">
                  {formatCurrency(total, currency)}
                </ThemedText>
              </View>
              <View style={styles.summaryBreakdown}>
                <View style={styles.breakdownRow}>
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    Base
                  </ThemedText>
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    {formatCurrency(baseAmount, currency)}
                  </ThemedText>
                </View>
                {taxAmount > 0 && (
                  <View style={styles.breakdownRow}>
                    <ThemedText
                      size="sm"
                      style={{
                        color: isDark ? Colors.dark.icon : Colors.light.icon,
                      }}
                    >
                      Tax
                    </ThemedText>
                    <ThemedText
                      size="sm"
                      style={{
                        color: isDark ? Colors.dark.icon : Colors.light.icon,
                      }}
                    >
                      {formatCurrency(taxAmount, currency)}
                    </ThemedText>
                  </View>
                )}
                {tipAmount > 0 && (
                  <View style={styles.breakdownRow}>
                    <ThemedText
                      size="sm"
                      style={{
                        color: isDark ? Colors.dark.icon : Colors.light.icon,
                      }}
                    >
                      Tip
                    </ThemedText>
                    <ThemedText
                      size="sm"
                      style={{
                        color: isDark ? Colors.dark.icon : Colors.light.icon,
                      }}
                    >
                      {formatCurrency(tipAmount, currency)}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.totalRow,
          {
            borderTopColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        <ThemedText size="base" weight="bold">
          Total
        </ThemedText>
        <View style={styles.totalRight}>
          <ThemedText
            size="base"
            weight="bold"
            style={{
              color: isValid
                ? isDark
                  ? Colors.dark.text
                  : Colors.light.text
                : "red",
            }}
          >
            {formatCurrency(calculatedTotal, currency)}
          </ThemedText>
          {!isValid && (
            <ThemedText size="xs" style={{ color: "red", marginTop: 2 }}>
              Expected: {formatCurrency(receiptTotal, currency)}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    marginBottom: 8,
  },
  summaryList: {
    maxHeight: 300,
  },
  summaryItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryBreakdown: {
    gap: 4,
    marginLeft: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  totalRight: {
    alignItems: "flex-end",
  },
});
