/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Review split summary screen before sending
 */

import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useReceipt, useUpdateReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import type { Friend } from "@/utils/api";
import {
  SplitStrategy,
  validateSplit,
  calculateSplit,
  type SplitData,
  type ItemAssignment,
} from "@/utils/split";
import { SplitSummary } from "@/components/split/split-summary";
import { SplitProgressBar } from "@/components/split-progress-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

function buildPeopleMap(
  friendIds: string[],
  friends: Friend[],
  currentUser?: { id: string; name: string } | null,
  tempPeople?: Record<string, string>
): Record<string, string> {
  const map: Record<string, string> = {};
  friendIds.forEach((friendId) => {
    if (currentUser && friendId === currentUser.id) {
      map[friendId] = "Me";
      return;
    }
    if (tempPeople && tempPeople[friendId]) {
      map[friendId] = tempPeople[friendId];
      return;
    }
    const friend = friends.find((item) => item.friendId === friendId);
    if (friend) {
      map[friendId] = friend.friendName;
    }
  });
  return map;
}

export default function ReviewScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: SplitStrategy | string;
    selectedFriendIds: string[];
    includeYourself?: boolean;
    assignments?: ItemAssignment[];
    tempPeople?: Record<string, string>;
    calculatedSplit?: {
      friendShares: Record<string, number>;
      taxDistribution: Record<string, number>;
      tipDistribution?: Record<string, number>;
      totals: Record<string, number>;
    };
  } | null>(null);
  const [calculatedSplitData, setCalculatedSplitData] =
    useState<SplitData | null>(null);
  const [receiptId, setReceiptId] = useState<string | undefined>(undefined);

  const { data: receipt, isLoading: isLoadingReceipt } = useReceipt(receiptId);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
  const updateReceiptMutation = useUpdateReceipt();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const tempDataStr = await AsyncStorage.getItem(SPLIT_DATA_KEY);
      if (!tempDataStr) {
        Alert.alert("Error", "Missing split data");
        router.replace("/split");
        return;
      }
      const tempData = JSON.parse(tempDataStr);
      setSplitData(tempData);
      setReceiptId(tempData.receiptId);

      const strategy =
        typeof tempData.strategy === "string"
          ? (tempData.strategy as SplitStrategy)
          : tempData.strategy;

      if (tempData.calculatedSplit) {
        const completeSplit: SplitData = {
          strategy,
          assignments: tempData.assignments || [],
          friendShares: tempData.calculatedSplit.friendShares,
          taxDistribution: tempData.calculatedSplit.taxDistribution,
          tipDistribution: tempData.calculatedSplit.tipDistribution,
          totals: tempData.calculatedSplit.totals,
          people: buildPeopleMap(
            tempData.selectedFriendIds || [],
            friends,
            user,
            tempData.tempPeople
          ),
        };
        setCalculatedSplitData(completeSplit);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [friends, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const calculateEqualSplit = async () => {
      if (
        receipt &&
        splitData &&
        !calculatedSplitData &&
        splitData.selectedFriendIds &&
        splitData.selectedFriendIds.length > 0
      ) {
        const strategy =
          typeof splitData.strategy === "string"
            ? (splitData.strategy as SplitStrategy)
            : splitData.strategy;

        if (strategy === SplitStrategy.EQUAL) {
          const calculatedSplit = calculateSplit(
            receipt,
            strategy,
            splitData.assignments || [],
            splitData.selectedFriendIds
          );
          const people = buildPeopleMap(
            splitData.selectedFriendIds,
            friends,
            user,
            splitData.tempPeople
          );
          setCalculatedSplitData({ ...calculatedSplit, people });

          await AsyncStorage.setItem(
            SPLIT_DATA_KEY,
            JSON.stringify({
              ...splitData,
              calculatedSplit: {
                friendShares: calculatedSplit.friendShares,
                taxDistribution: calculatedSplit.taxDistribution,
                tipDistribution: calculatedSplit.tipDistribution,
                totals: calculatedSplit.totals,
                people,
              },
            })
          );
        }
      }
    };

    calculateEqualSplit();
  }, [receipt, splitData, calculatedSplitData, friends, user]);

  const handleSend = useCallback(async () => {
    if (!receipt || !calculatedSplitData || !splitData) {
      Alert.alert("Error", "Missing data");
      return;
    }

    const strategy =
      typeof splitData.strategy === "string"
        ? (splitData.strategy as SplitStrategy)
        : splitData.strategy;
    const validation = validateSplit(
      receipt,
      strategy,
      splitData.assignments || [],
      splitData.selectedFriendIds
    );
    if (!validation.valid) {
      Alert.alert("Validation Error", validation.errors.join("\n"));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    updateReceiptMutation.mutate(
      {
        id: receipt.id,
        updates: { splitData: calculatedSplitData },
      },
      {
        onSuccess: async () => {
          await AsyncStorage.removeItem(SPLIT_DATA_KEY);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace(`/(app)/receipt/${receipt.id}`);
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Error", "Failed to save split");
        },
      }
    );
  }, [receipt, calculatedSplitData, splitData, updateReceiptMutation]);

  const isLoading = loading || isLoadingReceipt || isLoadingFriends;

  if (isLoading) {
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

  if (!calculatedSplitData) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
      >
        <ThemedText>Unable to calculate split</ThemedText>
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
      <SplitProgressBar
        currentStage={4}
        totalStages={4}
        stageLabels={["Method", "People", "Amounts", "Review"]}
      />
      <ScrollView
        contentContainerClassName="px-5 py-4 gap-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          <ThemedText size="xl" weight="bold" className="mb-2">
            Review Split Summary
          </ThemedText>
          <SplitSummary
            splitData={calculatedSplitData}
            friends={friends}
            receiptTotal={receipt.totals.total}
            currency={receipt.totals.currency}
          />
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 px-5 pt-4 border-t"
        style={{
          bottom: insets.bottom,
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
          borderTopColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        }}
      >
        <Button variant="primary" onPress={handleSend} fullWidth>
          Finish
        </Button>
      </View>
    </View>
  );
}
