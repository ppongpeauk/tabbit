/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Bottom sheet showing detailed breakdown for a single person in a split
 */

import { useMemo, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useReceipt, useUpdateReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { formatCurrency } from "@/utils/format";
import { SplitStrategy, SplitStatus, type SplitData } from "@/utils/split";
import type { StoredReceipt } from "@/utils/storage";
import { isCollaborator } from "@/utils/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth-context";
import type React from "react";

interface PersonSplitDetailsSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receiptId: string;
  personId: string;
  currentUserId?: string | null;
  onStatusChange?: () => void;
  onDismiss?: () => void;
}

function buildItemBreakdownForPerson(
  receipt: StoredReceipt,
  splitData: SplitData,
  personId: string
): {
  item: StoredReceipt["items"][number];
  amount: number;
}[] {
  if (!splitData.totals) return [];
  const peopleIds = Object.keys(splitData.totals);
  if (peopleIds.length === 0) return [];

  const baseShares = splitData.friendShares || {};
  const totalBase = Object.values(baseShares).reduce(
    (sum, amount) => sum + amount,
    0
  );

  return receipt.items.map((item, index) => {
    const itemId = item.id || index.toString();
    const assignment = splitData.assignments?.find(
      (entry) => entry.itemId === itemId
    );
    let amount = 0;

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
        const personIndex = friendIds.indexOf(personId);
        if (personIndex >= 0 && totalQuantity > 0) {
          const quantity = assignment.quantities[personIndex] || 0;
          amount = (item.totalPrice * quantity) / totalQuantity;
        }
      } else {
        const perFriend = item.totalPrice / friendIds.length;
        if (friendIds.includes(personId)) {
          amount = perFriend;
        }
      }
    } else if (totalBase > 0) {
      const ratio = (baseShares[personId] || 0) / totalBase;
      amount = item.totalPrice * ratio;
    } else {
      const perPerson = item.totalPrice / peopleIds.length;
      amount = perPerson;
    }

    return { item, amount };
  });
}

export function PersonSplitDetailsSheet({
  bottomSheetRef,
  receiptId,
  personId,
  currentUserId,
  onStatusChange,
  onDismiss,
}: PersonSplitDetailsSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: receipt, isLoading } = useReceipt(receiptId);
  const { data: friends = [] } = useFriends();
  const updateReceiptMutation = useUpdateReceipt();

  const splitData = receipt?.splitData;
  const isCollaboratorValue = isCollaborator(receipt, currentUserId);

  const peopleLookup = useMemo(() => {
    if (!splitData) return {};
    const map: Record<string, string> = { ...(splitData.people || {}) };

    if (user) {
      map[user.id] = "Me";
    }

    friends.forEach((friend) => {
      if (!map[friend.id]) {
        map[friend.id] = friend.name;
      }
    });

    return map;
  }, [splitData, friends, user]);

  const personName = peopleLookup[personId] || "Unknown";
  const personTotal = splitData?.totals?.[personId] || 0;
  const baseAmount = splitData?.friendShares?.[personId] || 0;
  const taxAmount = splitData?.taxDistribution?.[personId] || 0;
  const tipAmount = splitData?.tipDistribution?.[personId] || 0;
  const currentStatus = splitData?.statuses?.[personId] || SplitStatus.PENDING;
  const settledAmount = splitData?.settledAmounts?.[personId] || 0;
  const remainingAmount = personTotal - settledAmount;

  const itemBreakdown = useMemo(
    () =>
      receipt && splitData
        ? buildItemBreakdownForPerson(receipt, splitData, personId)
        : [],
    [receipt, splitData, personId]
  );

  const handleStatusChange = useCallback(
    (newStatus: SplitStatus) => {
      if (!receipt || !splitData) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const updatedStatuses = {
        ...(splitData.statuses || {}),
        [personId]: newStatus,
      };

      const updatedSettledAmounts = {
        ...(splitData.settledAmounts || {}),
        [personId]:
          newStatus === SplitStatus.SETTLED
            ? personTotal
            : newStatus === SplitStatus.PARTIAL
              ? settledAmount
              : 0,
      };

      const updatedSplitData: SplitData = {
        ...splitData,
        statuses: updatedStatuses,
        settledAmounts: updatedSettledAmounts,
      };

      updateReceiptMutation.mutate(
        {
          id: receipt.id,
          updates: { splitData: updatedSplitData },
        },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onStatusChange?.();
          },
          onError: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "Failed to update status");
          },
        }
      );
    },
    [
      receipt,
      splitData,
      personId,
      personTotal,
      settledAmount,
      updateReceiptMutation,
      onStatusChange,
    ]
  );

  const handleSettleAmount = useCallback(
    (amount: number) => {
      if (!receipt || !splitData) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newSettledAmount = Math.min(settledAmount + amount, personTotal);
      const newStatus =
        newSettledAmount >= personTotal
          ? SplitStatus.SETTLED
          : newSettledAmount > 0
            ? SplitStatus.PARTIAL
            : SplitStatus.PENDING;

      const updatedStatuses = {
        ...(splitData.statuses || {}),
        [personId]: newStatus,
      };

      const updatedSettledAmounts = {
        ...(splitData.settledAmounts || {}),
        [personId]: newSettledAmount,
      };

      const updatedSplitData: SplitData = {
        ...splitData,
        statuses: updatedStatuses,
        settledAmounts: updatedSettledAmounts,
      };

      updateReceiptMutation.mutate(
        {
          id: receipt.id,
          updates: { splitData: updatedSplitData },
        },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onStatusChange?.();
          },
          onError: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "Failed to settle amount");
          },
        }
      );
    },
    [
      receipt,
      splitData,
      personId,
      personTotal,
      settledAmount,
      updateReceiptMutation,
      onStatusChange,
    ]
  );

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
    onDismiss?.();
  }, [bottomSheetRef, onDismiss]);

  const settleRemainingText = useMemo(() => {
    if (!receipt || remainingAmount <= 0) return "";
    return `Settle Remaining (${formatCurrency(remainingAmount, receipt.totals.currency)})`;
  }, [receipt, remainingAmount]);

  const statusColor = useMemo(() => {
    if (currentStatus === SplitStatus.SETTLED) return "#10b981";
    if (currentStatus === SplitStatus.PARTIAL) return "#f59e0b";
    return "#eab308";
  }, [currentStatus]);

  const statusLabel = useMemo(() => {
    if (currentStatus === SplitStatus.SETTLED) return "SETTLED";
    if (currentStatus === SplitStatus.PARTIAL) return "PARTIAL";
    return "PENDING";
  }, [currentStatus]);

  const renderFooter = useCallback(() => {
    return (
      <View
        className="px-6 py-6 border-t"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
          borderTopColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <View className="gap-3">
          {isCollaboratorValue && currentStatus !== SplitStatus.SETTLED && receipt && splitData && (
            <Button
              variant="primary"
              onPress={() => handleStatusChange(SplitStatus.SETTLED)}
              disabled={updateReceiptMutation.isPending}
              fullWidth
            >
              Mark as Settled
            </Button>
          )}
          {isCollaboratorValue && currentStatus === SplitStatus.SETTLED && receipt && splitData && (
            <Button
              variant="secondary"
              onPress={() => handleStatusChange(SplitStatus.PENDING)}
              disabled={updateReceiptMutation.isPending}
              fullWidth
            >
              Mark as Pending
            </Button>
          )}
          {isCollaboratorValue && remainingAmount > 0 && settleRemainingText && receipt && splitData && (
            <Button
              variant="secondary"
              onPress={() => handleSettleAmount(remainingAmount)}
              disabled={updateReceiptMutation.isPending}
              fullWidth
            >
              {settleRemainingText}
            </Button>
          )}
        </View>
      </View>
    );
  }, [
    isDark,
    insets.bottom,
    currentStatus,
    receipt,
    splitData,
    handleStatusChange,
    updateReceiptMutation.isPending,
    handleSettleAmount,
    remainingAmount,
    settleRemainingText,
  ]);

  if (isLoading || !receipt || !splitData || !personId) {
    return (
      <TrueSheet
        ref={bottomSheetRef}
        backgroundColor={
          isDark ? Colors.dark.background : Colors.light.background
        }
        detents={[1]}
        scrollable
      >
        <View />
      </TrueSheet>
    );
  }

  return (
    <TrueSheet
      ref={bottomSheetRef}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      detents={[1]}
      scrollable
      footer={renderFooter()}
    >
      <View className="flex-1">
        <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
          <ThemedText size="xl" weight="bold">
            {personName}
          </ThemedText>
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

        <ScrollView
          contentContainerClassName="px-5 pt-4 pb-4 gap-4"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* Status Section */}
          <View
            className="rounded-[20px] p-5 border"
            style={{
              backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <ThemedText size="base" weight="semibold">
                Status
              </ThemedText>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: statusColor }}
              >
                <ThemedText size="sm" weight="semibold" style={{ color: "#FFFFFF" }}>
                  {statusLabel}
                </ThemedText>
              </View>
            </View>
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  }}
                >
                  Total Owed
                </ThemedText>
                <ThemedText size="sm" weight="semibold">
                  {formatCurrency(personTotal, receipt.totals.currency)}
                </ThemedText>
              </View>
              {settledAmount > 0 && (
                <View className="flex-row items-center justify-between">
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    Settled
                  </ThemedText>
                  <ThemedText size="sm" weight="semibold">
                    {formatCurrency(settledAmount, receipt.totals.currency)}
                  </ThemedText>
                </View>
              )}
              {remainingAmount > 0 && (
                <View className="flex-row items-center justify-between">
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    Remaining
                  </ThemedText>
                  <ThemedText size="sm" weight="semibold">
                    {formatCurrency(remainingAmount, receipt.totals.currency)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Cost Breakdown */}
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
              Cost Breakdown
            </ThemedText>
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  }}
                >
                  Base
                </ThemedText>
                <ThemedText size="sm" weight="semibold">
                  {formatCurrency(baseAmount, receipt.totals.currency)}
                </ThemedText>
              </View>
              {taxAmount > 0 && (
                <View className="flex-row items-center justify-between">
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    Tax
                  </ThemedText>
                  <ThemedText size="sm" weight="semibold">
                    {formatCurrency(taxAmount, receipt.totals.currency)}
                  </ThemedText>
                </View>
              )}
              {tipAmount > 0 && (
                <View className="flex-row items-center justify-between">
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    Tip
                  </ThemedText>
                  <ThemedText size="sm" weight="semibold">
                    {formatCurrency(tipAmount, receipt.totals.currency)}
                  </ThemedText>
                </View>
              )}
              <View
                className="pt-3 border-t"
                style={{
                  borderTopColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <View className="flex-row items-center justify-between">
                  <ThemedText size="base" weight="bold">
                    Total
                  </ThemedText>
                  <ThemedText size="base" weight="bold">
                    {formatCurrency(personTotal, receipt.totals.currency)}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Item Breakdown */}
          {itemBreakdown.length > 0 && (
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
                Items
              </ThemedText>
              <View className="gap-3">
                {itemBreakdown.map((breakdown, index) => (
                  <View
                    key={breakdown.item.id || `${breakdown.item.name}-${index}`}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-4">
                      <ThemedText size="sm" weight="semibold">
                        {breakdown.item.name}
                      </ThemedText>
                      <ThemedText
                        size="xs"
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
                    <ThemedText size="sm" weight="semibold">
                      {formatCurrency(breakdown.amount, receipt.totals.currency)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </TrueSheet>
  );
}
