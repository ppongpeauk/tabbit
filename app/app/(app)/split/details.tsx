/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Split details bottom sheet with totals and per-item breakdowns
 */

import { useMemo, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { formatCurrency } from "@/utils/format";
import { SplitStrategy, type SplitData } from "@/utils/split";
import type { ReceiptItem } from "@/utils/api";
import type { StoredReceipt, Friend as StorageFriend } from "@/utils/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { CircularProgress } from "@/components/circular-progress";
import { PersonAvatar } from "@/components/avatar";
import { useAuth } from "@/contexts/auth-context";
import { EmptyState } from "@/components/empty-state";
import type React from "react";

type ItemBreakdown = {
  item: ReceiptItem;
  shares: Record<string, number>;
};

function buildPeopleLookup(
  splitData: SplitData,
  friends: StorageFriend[],
  currentUser?: { id: string; name: string } | null
): Record<string, string> {
  const map: Record<string, string> = { ...(splitData.people || {}) };

  if (currentUser) {
    map[currentUser.id] = currentUser.name || "You";
  }

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
          const quantity = assignment.quantities![friendIndex] || 0;
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

interface SplitDetailsSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receiptId: string;
  onEdit?: () => void;
}

export function SplitDetailsSheet({
  bottomSheetRef,
  receiptId,
  onEdit,
}: SplitDetailsSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: receipt, isLoading } = useReceipt(receiptId);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();

  const splitData = receipt?.splitData;

  const peopleLookup = useMemo(
    () => (splitData ? buildPeopleLookup(splitData, friends, user) : {}),
    [splitData, friends, user]
  );

  const itemBreakdowns = useMemo(
    () => (receipt && splitData ? buildItemBreakdowns(receipt, splitData) : []),
    [receipt, splitData]
  );

  const progress = useMemo(() => {
    if (!splitData || !receipt) return 0;

    const totalOwed = Object.values(splitData.totals).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const settledAmount = 0;
    const remaining = Math.max(0, totalOwed - settledAmount);
    return totalOwed > 0 ? 1 - remaining / totalOwed : 1;
  }, [splitData, receipt]);

  const remainingAmount = useMemo(() => {
    if (!splitData) return 0;
    const totalOwed = Object.values(splitData.totals).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const settledAmount = 0;
    return Math.max(0, totalOwed - settledAmount);
  }, [splitData]);

  const handleConfigureSplit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
    if (onEdit) {
      onEdit();
    } else {
      router.push({
        pathname: "/split",
        params: { receiptId },
      });
    }
  }, [receiptId, bottomSheetRef, onEdit]);

  const handleEditSplit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onEdit) {
      onEdit();
    } else {
      handleConfigureSplit();
    }
  }, [handleConfigureSplit, onEdit]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  return (
    <TrueSheet
      ref={bottomSheetRef}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      detents={[1]}
      scrollable
    >
      <View className="flex-1">
        <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
          <ThemedText size="xl" weight="bold">
            Split Details
          </ThemedText>
          <View className="flex-row items-center gap-4">
            {splitData && (
              <Button size="sm" variant="secondary" onPress={handleEditSplit}>Edit</Button>
            )}
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <SymbolView
                name="xmark.circle.fill"
                tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                size={28}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading || isLoadingFriends ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator
              size="large"
              color={isDark ? Colors.dark.text : Colors.light.text}
            />
          </View>
        ) : !receipt ? (
          <View className="flex-1 justify-center items-center">
            <ThemedText>Receipt not found</ThemedText>
          </View>
        ) : !splitData ? (
          <EmptyState
            icon="person.2.fill"
            title="No Split Configured"
            subtitle="Set up how you want to split this receipt with your friends."
            action={
              <Button variant="primary" onPress={handleEditSplit} fullWidth>
                Configure Split
              </Button>
            }
          />
        ) : (
          <ScrollView
            contentContainerClassName="px-5 pt-4 pb-4 gap-4"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View
              className="rounded-[20px] p-5 border items-center gap-4"
              style={{
                backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
              }}
            >
              <CircularProgress
                progress={progress}
                size={100}
                strokeWidth={10}
                showLabel={true}
                label={`${Math.round(progress * 100)}%`}
              />
              <View className="items-center gap-1">
                <ThemedText size="sm" style={{ opacity: 0.7 }}>
                  Settled
                </ThemedText>
                {remainingAmount > 0 && (
                  <ThemedText size="base" weight="semibold">
                    {formatCurrency(remainingAmount, receipt.totals.currency)}{" "}
                    remaining
                  </ThemedText>
                )}
              </View>
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
                          <View className="flex-row items-center gap-3 flex-1">
                            <PersonAvatar
                              personId={personId}
                              name={peopleLookup[personId] || "Unknown"}
                              friends={friends}
                              size={40}
                            />
                            <ThemedText size="base" weight="semibold">
                              {peopleLookup[personId] || "Unknown"}
                            </ThemedText>
                          </View>
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
                    The split isn&apos;t configured yet.
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
                              <View className="flex-row items-center gap-2 flex-1">
                                <PersonAvatar
                                  personId={personId}
                                  name={peopleLookup[personId] || "Unknown"}
                                  friends={friends}
                                  size={24}
                                />
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
                              </View>
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
        )}
      </View>
    </TrueSheet>
  );
}
