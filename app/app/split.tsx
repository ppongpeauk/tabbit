/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Split screen - complete implementation with multiple strategies
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  getReceipts,
  getFriends,
  saveSplitData,
  getSplitData,
  type StoredReceipt,
  type Friend,
} from "@/utils/storage";
import {
  fetchContacts,
  requestContactsPermission,
  type ContactInfo,
} from "@/utils/contacts";
import {
  SplitStrategy,
  calculateSplit,
  calculateProportionalTaxTip,
  validateSplit,
  type ItemAssignment,
  type SplitData,
} from "@/utils/split";
import { FriendSelector } from "@/components/split/friend-selector";
import { ItemAssignment as ItemAssignmentComponent } from "@/components/split/item-assignment";
import { SplitSummary } from "@/components/split/split-summary";
import { formatCurrency } from "@/utils/format";

export default function SplitScreen() {
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<SplitStrategy>(SplitStrategy.EQUAL);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<ItemAssignment[]>([]);
  const [splitData, setSplitData] = useState<SplitData | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [receipts, loadedFriends, existingSplitData] = await Promise.all([
        getReceipts(),
        getFriends(),
        receiptId ? getSplitData(receiptId) : Promise.resolve(null),
      ]);

      const foundReceipt = receipts.find((r) => r.id === receiptId);
      if (!foundReceipt) {
        Alert.alert("Error", "Receipt not found");
        router.back();
        return;
      }

      setReceipt(foundReceipt);
      setFriends(loadedFriends);

      // Load device contacts
      try {
        const hasPermission = await requestContactsPermission();
        if (hasPermission) {
          const contacts = await fetchContacts();
          setDeviceContacts(contacts);
        }
      } catch (error) {
        console.error("Error loading contacts:", error);
        // Don't show error, just continue without contacts
      }

      if (existingSplitData) {
        setStrategy(existingSplitData.strategy);
        setAssignments(existingSplitData.assignments);
        const friendIds = Object.keys(existingSplitData.totals);
        setSelectedFriendIds(friendIds);
        setSplitData(existingSplitData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate split data when inputs change
  useEffect(() => {
    if (!receipt || selectedFriendIds.length === 0) {
      setSplitData(null);
      return;
    }

    try {
      let calculatedSplit: SplitData;

      if (strategy === SplitStrategy.CUSTOM) {
        // For custom, use the manually entered amounts
        const friendShares: Record<string, number> = {};
        let totalBase = 0;

        selectedFriendIds.forEach((friendId) => {
          const amount = parseFloat(customAmounts[friendId] || "0") || 0;
          friendShares[friendId] = amount;
          totalBase += amount;
        });

        // Validate custom amounts sum to subtotal
        const subtotal = Math.round(receipt.totals.subtotal * 100) / 100;
        const difference = Math.abs(totalBase - subtotal);

        if (difference > 0.02) {
          // Don't calculate if amounts don't match
          setSplitData(null);
          return;
        }

        // Calculate tax and tip proportionally based on custom base shares
        const tip =
          receipt.totals.total -
          receipt.totals.subtotal -
          (receipt.totals.tax || 0);
        const { taxDistribution, tipDistribution } =
          calculateProportionalTaxTip(
            friendShares,
            receipt.totals.tax || 0,
            tip > 0.01 ? tip : undefined
          );

        // Calculate totals
        const totals: Record<string, number> = {};
        selectedFriendIds.forEach((friendId) => {
          const base = friendShares[friendId] || 0;
          const tax = taxDistribution[friendId] || 0;
          const tipAmount = tipDistribution?.[friendId] || 0;
          totals[friendId] = Math.round((base + tax + tipAmount) * 100) / 100;
        });

        calculatedSplit = {
          strategy: SplitStrategy.CUSTOM,
          assignments: [],
          friendShares,
          taxDistribution,
          tipDistribution:
            tipDistribution && Object.keys(tipDistribution).length > 0
              ? tipDistribution
              : undefined,
          totals,
        };
      } else {
        calculatedSplit = calculateSplit(
          receipt,
          strategy,
          assignments,
          selectedFriendIds
        );
      }

      setSplitData(calculatedSplit);
    } catch (error) {
      console.error("Error calculating split:", error);
      setSplitData(null);
    }
  }, [receipt, strategy, selectedFriendIds, assignments, customAmounts]);

  const handleSave = useCallback(async () => {
    if (!receipt || !splitData) {
      Alert.alert("Error", "Please complete the split configuration");
      return;
    }

    const validation = validateSplit(
      receipt,
      strategy,
      assignments,
      selectedFriendIds
    );
    if (!validation.valid) {
      Alert.alert("Validation Error", validation.errors.join("\n"));
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await saveSplitData(receipt.id, splitData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Split saved successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save split");
    }
  }, [receipt, splitData, strategy, assignments, selectedFriendIds]);

  const handleStrategyChange = useCallback(
    (newStrategy: SplitStrategy) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStrategy(newStrategy);
      if (newStrategy === SplitStrategy.CUSTOM) {
        // Initialize custom amounts
        const amounts: Record<string, string> = {};
        selectedFriendIds.forEach((friendId) => {
          amounts[friendId] = "";
        });
        setCustomAmounts(amounts);
      } else if (newStrategy === SplitStrategy.ITEMIZED && receipt) {
        // Initialize assignments for itemized split
        const initialAssignments: ItemAssignment[] = receipt.items.map(
          (item, index) => ({
            itemId: item.id || index.toString(),
            friendIds: [],
          })
        );
        setAssignments(initialAssignments);
      }
    },
    [selectedFriendIds, receipt]
  );

  const handleToggleFriend = useCallback(
    (friendId: string) => {
      const isSelected = selectedFriendIds.includes(friendId);
      if (isSelected) {
        setSelectedFriendIds(selectedFriendIds.filter((id) => id !== friendId));
        // Remove friend from custom amounts if in custom mode
        if (strategy === SplitStrategy.CUSTOM) {
          const newAmounts = { ...customAmounts };
          delete newAmounts[friendId];
          setCustomAmounts(newAmounts);
        }
      } else {
        setSelectedFriendIds([...selectedFriendIds, friendId]);
        // Initialize custom amount if in custom mode
        if (strategy === SplitStrategy.CUSTOM) {
          setCustomAmounts({
            ...customAmounts,
            [friendId]: "",
          });
        }
      }
    },
    [selectedFriendIds, strategy, customAmounts]
  );

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

  if (loading) {
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
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  if (!receipt) {
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
        <ThemedText>Receipt not found</ThemedText>
      </View>
    );
  }

  if (friends.length === 0 && deviceContacts.length === 0) {
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
        <ThemedText style={styles.emptyText}>
          No contacts available. Please add friends in Settings or grant
          contacts permission.
        </ThemedText>
        <Pressable
          onPress={() => router.push("/(tabs)/(settings)/friends")}
          style={[
            styles.button,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            },
          ]}
        >
          <ThemedText weight="semibold">Go to Friends</ThemedText>
        </Pressable>
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
        {/* Receipt summary */}
        <View
          style={[
            styles.receiptCard,
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
          <ThemedText size="lg" weight="bold">
            {receipt.merchant.name}
          </ThemedText>
          <ThemedText
            size="base"
            style={{
              color: isDark ? Colors.dark.icon : Colors.light.icon,
              marginTop: 4,
            }}
          >
            Total:{" "}
            {formatCurrency(receipt.totals.total, receipt.totals.currency)}
          </ThemedText>
        </View>

        {/* Strategy selector */}
        <View style={styles.strategyContainer}>
          <ThemedText size="lg" weight="bold" style={styles.sectionTitle}>
            Split Strategy
          </ThemedText>
          <View style={styles.strategyButtons}>
            {[
              { value: SplitStrategy.EQUAL, label: "Equal" },
              { value: SplitStrategy.ITEMIZED, label: "Itemized" },
              { value: SplitStrategy.CUSTOM, label: "Custom" },
            ].map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => handleStrategyChange(value)}
                style={[
                  styles.strategyButton,
                  {
                    backgroundColor:
                      strategy === value
                        ? isDark
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.1)"
                        : isDark
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(0, 0, 0, 0.02)",
                    borderColor:
                      strategy === value
                        ? isDark
                          ? Colors.dark.icon
                          : Colors.light.icon
                        : isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                  },
                ]}
              >
                <ThemedText weight={strategy === value ? "semibold" : "normal"}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Friend selection */}
        <View style={styles.section}>
          <ThemedText size="lg" weight="bold" style={styles.sectionTitle}>
            Select People
          </ThemedText>
          <FriendSelector
            friends={friends}
            deviceContacts={deviceContacts}
            selectedFriendIds={selectedFriendIds}
            onToggleFriend={handleToggleFriend}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </View>

        {/* Strategy-specific UI */}
        {strategy === SplitStrategy.ITEMIZED && receipt && (
          <View style={styles.section}>
            <ThemedText size="lg" weight="bold" style={styles.sectionTitle}>
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
        )}

        {strategy === SplitStrategy.CUSTOM && (
          <View style={styles.customContainer}>
            <ThemedText size="lg" weight="bold" style={styles.sectionTitle}>
              Custom Amounts
            </ThemedText>
            <ThemedText
              size="sm"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
                marginBottom: 12,
              }}
            >
              Enter amounts for each friend (must sum to{" "}
              {formatCurrency(receipt.totals.subtotal, receipt.totals.currency)}
              )
            </ThemedText>
            {selectedFriendIds.map((friendId) => {
              // Check if it's a friend or contact
              const friend = friends.find((f) => f.id === friendId);
              const contact = friendId.startsWith("contact:")
                ? deviceContacts.find(
                    (c) =>
                      `contact:${c.name}:${c.phoneNumber || c.email || ""}` ===
                      friendId
                  )
                : undefined;
              const person = friend || contact;
              return (
                <View
                  key={friendId}
                  style={[
                    styles.customAmountRow,
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
                  <ThemedText style={styles.customAmountLabel}>
                    {person?.name || friendId}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.customAmountInput,
                      {
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.02)",
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.1)",
                        color: isDark ? Colors.dark.text : Colors.light.text,
                      },
                    ]}
                    value={customAmounts[friendId] || ""}
                    onChangeText={(text) =>
                      setCustomAmounts({
                        ...customAmounts,
                        [friendId]: text,
                      })
                    }
                    placeholder="0.00"
                    placeholderTextColor={
                      isDark ? Colors.dark.icon : Colors.light.icon
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Split summary */}
        {splitData && (
          <SplitSummary
            splitData={splitData}
            friends={friends}
            deviceContacts={deviceContacts}
            receiptTotal={receipt.totals.total}
            currency={receipt.totals.currency}
          />
        )}

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={!splitData}
          style={[
            styles.saveButton,
            {
              backgroundColor: splitData
                ? isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)"
                : isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              opacity: splitData ? 1 : 0.5,
            },
          ]}
        >
          <ThemedText size="base" weight="semibold">
            Save Split
          </ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 24,
    paddingBottom: 40,
  },
  loadingText: {
    textAlign: "center",
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    marginHorizontal: 20,
  },
  receiptCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontFamily: Fonts.sans,
    marginBottom: 12,
  },
  strategyContainer: {
    gap: 12,
  },
  strategyButtons: {
    flexDirection: "row",
    gap: 8,
  },
  strategyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  customContainer: {
    gap: 12,
  },
  customAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  customAmountLabel: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    flex: 1,
  },
  customAmountInput: {
    width: 100,
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: Fonts.sans,
    textAlign: "right",
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  section: {
    gap: 12,
  },
});
