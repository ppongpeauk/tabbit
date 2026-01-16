/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Itemized split assignment screen
 */

import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import {
  SplitStrategy,
  type ItemAssignment,
  calculateSplit,
} from "@/utils/split";
import { ItemAssignment as ItemAssignmentComponent } from "@/components/split/item-assignment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

export default function ItemizedAssignScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<ItemAssignment[]>([]);
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: SplitStrategy | string;
    selectedFriendIds: string[];
  } | null>(null);
  const [receiptId, setReceiptId] = useState<string | undefined>(undefined);

  // Use React Query hooks
  const { data: receipt, isLoading: isLoadingReceipt } = useReceipt(receiptId);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();

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
      setSelectedFriendIds(tempData.selectedFriendIds || []);
      setReceiptId(tempData.receiptId);

    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (receiptId && receipt === null && !isLoadingReceipt) {
      Alert.alert("Error", "Receipt not found");
      router.back();
      return;
    }

    if (receipt) {
      const initialAssignments: ItemAssignment[] = receipt.items.map(
        (item, index) => ({
          itemId: item.id || index.toString(),
          friendIds: [],
        })
      );
      setAssignments(initialAssignments);
    }
  }, [receipt, receiptId, isLoadingReceipt]);

  const isLoading = loading || isLoadingReceipt || isLoadingFriends;

  const handleItemAssignmentChange = useCallback(
    (itemIndex: number, friendIds: string[], quantities?: number[]) => {
      const newAssignments = [...assignments];
      const item = receipt?.items[itemIndex];
      if (!item) return;

      const itemId = item.id || itemIndex.toString();
      const existingIndex = newAssignments.findIndex(
        (a) => a.itemId === itemId
      );

      const assignment: ItemAssignment = {
        itemId,
        friendIds,
        quantities,
      };

      if (existingIndex >= 0) {
        newAssignments[existingIndex] = assignment;
      } else {
        newAssignments.push(assignment);
      }

      setAssignments(newAssignments);
    },
    [assignments, receipt]
  );

  const handleContinue = useCallback(async () => {
    if (!receipt || !splitData) {
      Alert.alert("Error", "Missing data");
      return;
    }

    const strategy =
      typeof splitData.strategy === "string"
        ? SplitStrategy.ITEMIZED
        : splitData.strategy;
    const calculatedSplit = calculateSplit(
      receipt,
      strategy,
      assignments,
      selectedFriendIds
    );

    await AsyncStorage.setItem(
      SPLIT_DATA_KEY,
      JSON.stringify({
        ...splitData,
        assignments,
        calculatedSplit,
      })
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/split/review");
  }, [receipt, splitData, assignments, selectedFriendIds]);

  if (loading) {
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
        <View className="gap-3">
          <ThemedText size="xl" weight="bold" className="mb-2">
            Assign Items
          </ThemedText>
          <ThemedText
            size="sm"
            style={{
              color: isDark ? Colors.dark.icon : Colors.light.icon,
              marginBottom: 12,
            }}
          >
            Tap each item to assign it to specific people
          </ThemedText>
          {receipt.items.map((item, index) => {
            const itemId = item.id || index.toString();
            const assignment = assignments.find((a) => a.itemId === itemId);
            return (
              <ItemAssignmentComponent
                key={itemId}
                item={item}
                itemIndex={index}
                friends={friends}
                selectedFriendIds={assignment?.friendIds || []}
                quantities={assignment?.quantities}
                onFriendIdsChange={(friendIds) =>
                  handleItemAssignmentChange(
                    index,
                    friendIds,
                    assignment?.quantities
                  )
                }
                onQuantitiesChange={(quantities) =>
                  handleItemAssignmentChange(
                    index,
                    assignment?.friendIds || [],
                    quantities
                  )
                }
                currency={receipt.totals.currency}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Continue Button */}
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
        <Button variant="primary" onPress={handleContinue} fullWidth>
          Continue
        </Button>
      </View>
    </View>
  );
}
