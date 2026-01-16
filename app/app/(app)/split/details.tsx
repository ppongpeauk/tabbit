/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Split details screen with totals and per-item breakdowns
 */

import { useMemo, useCallback, useLayoutEffect } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { formatCurrency } from "@/utils/format";
import { SplitStrategy, type SplitData } from "@/utils/split";
import type { ReceiptItem } from "@/utils/api";
import type { StoredReceipt } from "@/utils/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";

type ItemBreakdown = {
  item: ReceiptItem;
  shares: Record<string, number>;
};

function buildPeopleLookup(
  splitData: SplitData,
  friends: { id: string; name: string }[]
): Record<string, string> {
  const map: Record<string, string> = { ...(splitData.people || {}) };
  friends.forEach((friend) => {
    if (!map[friend.id]) {
      map[friend.id] = friend.name;
    }
  });
  return map;
}

function buildItemBreakdowns(
  receipt: StoredReceipt,
  splitData: SplitData
): ItemBreakdown[] {
  const peopleIds = Object.keys(splitData.totals);
  if (peopleIds.length === 0) return [];

  const baseShares = splitData.friendShares;
  const totalBase = Object.values(baseShares).reduce(
    (sum, amount) => sum + amount,
    0
  );

  return receipt.items.map((item, index) => {
    const itemId = item.id || index.toString();
    const assignment = splitData.assignments.find(
      (entry) => entry.itemId === itemId
    );
    const shares: Record<string, number> = {};

    if (
      splitData.strategy === SplitStrategy.ITEMIZED &&
      assignment &&
      assignment.friendIds.length > 0
    ) {
      const friendIds = assignment.friendIds;
      if (
        assignment.quantities &&
        assignment.quantities.length === friendIds.length
      ) {
        const totalQuantity = assignment.quantities.reduce(
          (sum, qty) => sum + qty,
          0
        );
        friendIds.forEach((friendId, friendIndex) => {
          const quantity = assignment.quantities?.[friendIndex] || 0;
          shares[friendId] =
            totalQuantity > 0
              ? (item.totalPrice * quantity) / totalQuantity
              : 0;
        });
      } else {
        const perFriend = item.totalPrice / friendIds.length;
        friendIds.forEach((friendId) => {
          shares[friendId] = perFriend;
        });
      }
    } else if (totalBase > 0) {
      peopleIds.forEach((personId) => {
        const ratio = (baseShares[personId] || 0) / totalBase;
        shares[personId] = item.totalPrice * ratio;
      });
    } else {
      const perPerson = item.totalPrice / peopleIds.length;
      peopleIds.forEach((personId) => {
        shares[personId] = perPerson;
      });
    }

    return { item, shares };
  });
}

export default function SplitDetailsScreen() {
  const { receiptId } = useLocalSearchParams<{ receiptId?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const { data: receipt, isLoading } = useReceipt(receiptId);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();

  const splitData = receipt?.splitData;

  const peopleLookup = useMemo(
    () => (splitData ? buildPeopleLookup(splitData, friends) : {}),
    [splitData, friends]
  );

  const itemBreakdowns = useMemo(
    () => (receipt && splitData ? buildItemBreakdowns(receipt, splitData) : []),
    [receipt, splitData]
  );

  const handleConfigureSplit = useCallback(() => {
    if (!receiptId) return;
    router.push({
      pathname: "/split",
      params: { receiptId },
    });
  }, [receiptId]);

  const handleEditSplit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleConfigureSplit();
  }, [handleConfigureSplit]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Split Details",
      headerLeft: () => (
        <HeaderButton onPress={handleClose}>
          <SymbolView name="xmark" />
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton onPress={handleEditSplit}>
          <ThemedText size="base" weight="semibold">
            Edit
          </ThemedText>
        </HeaderButton>
      ),
    });
  }, [navigation, handleClose, handleEditSplit]);

  if (isLoading || isLoadingFriends) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? Colors.dark.text : Colors.light.text}
        />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
      >
        <ThemedText>Receipt not found</ThemedText>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      }}
    >
      <ScrollView
        contentContainerClassName="px-5 py-4 gap-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-[20px] p-5 border"
          style={{
            backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          }}
        >
          <ThemedText size="base" weight="semibold" className="mb-3">
            Who owes how much
          </ThemedText>

          {splitData ? (
            <View className="gap-4">
              {Object.keys(splitData.totals).map((personId) => {
                const baseAmount = splitData.friendShares[personId] || 0;
                const taxAmount = splitData.taxDistribution[personId] || 0;
                const tipAmount = splitData.tipDistribution?.[personId] || 0;
                const total = splitData.totals[personId] || 0;

                return (
                  <View
                    key={personId}
                    className="border-b pb-4 last:border-b-0"
                    style={{
                      borderBottomColor: isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <ThemedText size="base" weight="semibold">
                        {peopleLookup[personId] || "Unknown"}
                      </ThemedText>
                      <ThemedText size="base" weight="bold">
                        {formatCurrency(total, receipt.totals.currency)}
                      </ThemedText>
                    </View>
                    <View className="gap-1">
                      <View className="flex-row items-center justify-between">
                        <ThemedText
                          size="sm"
                          style={{
                            color: isDark
                              ? Colors.dark.icon
                              : Colors.light.icon,
                          }}
                        >
                          Base
                        </ThemedText>
                        <ThemedText
                          size="sm"
                          style={{
                            color: isDark
                              ? Colors.dark.icon
                              : Colors.light.icon,
                          }}
                        >
                          {formatCurrency(baseAmount, receipt.totals.currency)}
                        </ThemedText>
                      </View>
                      {taxAmount > 0 && (
                        <View className="flex-row items-center justify-between">
                          <ThemedText
                            size="sm"
                            style={{
                              color: isDark
                                ? Colors.dark.icon
                                : Colors.light.icon,
                            }}
                          >
                            Tax
                          </ThemedText>
                          <ThemedText
                            size="sm"
                            style={{
                              color: isDark
                                ? Colors.dark.icon
                                : Colors.light.icon,
                            }}
                          >
                            {formatCurrency(taxAmount, receipt.totals.currency)}
                          </ThemedText>
                        </View>
                      )}
                      {tipAmount > 0 && (
                        <View className="flex-row items-center justify-between">
                          <ThemedText
                            size="sm"
                            style={{
                              color: isDark
                                ? Colors.dark.icon
                                : Colors.light.icon,
                            }}
                          >
                            Tip
                          </ThemedText>
                          <ThemedText
                            size="sm"
                            style={{
                              color: isDark
                                ? Colors.dark.icon
                                : Colors.light.icon,
                            }}
                          >
                            {formatCurrency(tipAmount, receipt.totals.currency)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="gap-2">
              <ThemedText size="sm" style={{ opacity: 0.7 }}>
                The split isn’t configured yet.
              </ThemedText>
              <Button variant="primary" onPress={handleConfigureSplit}>
                Configure Split
              </Button>
            </View>
          )}
        </View>

        <View
          className="rounded-[20px] p-5 border"
          style={{
            backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          }}
        >
          <ThemedText size="base" weight="semibold" className="mb-3">
            Per-item breakdown
          </ThemedText>

          {splitData ? (
            <View className="gap-4">
              {itemBreakdowns.map((breakdown, index) => (
                <View
                  key={breakdown.item.id || `${breakdown.item.name}-${index}`}
                  className="border-b pb-4 last:border-b-0"
                  style={{
                    borderBottomColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 pr-4">
                      <ThemedText size="base" weight="semibold">
                        {breakdown.item.name}
                      </ThemedText>
                      <ThemedText
                        size="sm"
                        style={{
                          color: isDark ? Colors.dark.icon : Colors.light.icon,
                        }}
                      >
                        {breakdown.item.quantity} ×{" "}
                        {formatCurrency(
                          breakdown.item.unitPrice,
                          receipt.totals.currency
                        )}
                      </ThemedText>
                    </View>
                    <ThemedText size="base" weight="bold">
                      {formatCurrency(
                        breakdown.item.totalPrice,
                        receipt.totals.currency
                      )}
                    </ThemedText>
                  </View>
                  <View className="gap-2">
                    {Object.entries(breakdown.shares).map(
                      ([personId, amount]) => (
                        <View
                          key={`${breakdown.item.name}-${personId}`}
                          className="flex-row items-center justify-between"
                        >
                          <ThemedText
                            size="sm"
                            style={{
                              color: isDark
                                ? Colors.dark.icon
                                : Colors.light.icon,
                            }}
                          >
                            {peopleLookup[personId] || "Unknown"}
                          </ThemedText>
                          <ThemedText
                            size="sm"
                            style={{
                              color: isDark
                                ? Colors.dark.icon
                                : Colors.light.icon,
                            }}
                          >
                            {formatCurrency(amount, receipt.totals.currency)}
                          </ThemedText>
                        </View>
                      )
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="gap-2">
              <ThemedText size="sm" style={{ opacity: 0.7 }}>
                Configure a split to see item-by-item details.
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
