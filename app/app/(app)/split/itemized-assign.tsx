import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  getReceipts,
  getFriends,
  type StoredReceipt,
  type Friend,
} from "@/utils/storage";
import {
  fetchContacts,
  type ContactInfo,
} from "@/utils/contacts";
import { SplitStrategy, type ItemAssignment, calculateSplit } from "@/utils/split";
import { ItemAssignment as ItemAssignmentComponent } from "@/components/split/item-assignment";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

export default function ItemizedAssignScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<ItemAssignment[]>([]);
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: SplitStrategy | string;
    selectedFriendIds: string[];
  } | null>(null);

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

      const receipts = await getReceipts();
      const foundReceipt = receipts.find((r) => r.id === tempData.receiptId);
      if (!foundReceipt) {
        Alert.alert("Error", "Receipt not found");
        router.back();
        return;
      }
      setReceipt(foundReceipt);

      const loadedFriends = await getFriends();
      setFriends(loadedFriends);

      try {
        const contacts = await fetchContacts();
        setDeviceContacts(contacts);
      } catch (error) {
        console.error("Error loading contacts:", error);
      }

      const initialAssignments: ItemAssignment[] = foundReceipt.items.map(
        (item, index) => ({
          itemId: item.id || index.toString(),
          friendIds: [],
        })
      );
      setAssignments(initialAssignments);
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
        style={[
          styles.container,
          styles.centerContent,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
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
        style={[
          styles.container,
          styles.centerContent,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <ThemedText>Receipt not found</ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepContainer}>
          <ThemedText size="xl" weight="bold" style={styles.stepTitle}>
            Assign Items
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
                deviceContacts={deviceContacts}
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
        style={[
          styles.footer,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
            borderTopColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        <Button variant="primary" onPress={handleContinue} fullWidth>
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 24,
    paddingBottom: 100,
  },
  stepContainer: {
    gap: 12,
  },
  stepTitle: {
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

