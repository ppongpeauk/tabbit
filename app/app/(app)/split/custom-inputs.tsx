import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  getReceipts,
  getFriends,
  type StoredReceipt,
  type Friend,
} from "@/utils/storage";
import { fetchContacts, type ContactInfo } from "@/utils/contacts";
import { formatCurrency } from "@/utils/format";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateProportionalTaxTip } from "@/utils/split";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

export default function CustomInputsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    {}
  );
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: string;
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

      // Initialize custom amounts
      const amounts: Record<string, string> = {};
      tempData.selectedFriendIds?.forEach((friendId: string) => {
        amounts[friendId] = "";
      });
      setCustomAmounts(amounts);
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

  const getPersonName = (friendId: string): string => {
    const friend = friends.find((f) => f.id === friendId);
    if (friend) return friend.name;
    if (friendId.startsWith("contact:")) {
      const contact = deviceContacts.find(
        (c) =>
          `contact:${c.name}:${c.phoneNumber || c.email || ""}` === friendId
      );
      if (contact) return contact.name;
    }
    return "Unknown";
  };

  const validateAmounts = (): boolean => {
    if (!receipt) return false;
    let totalBase = 0;
    selectedFriendIds.forEach((friendId) => {
      const amount = parseFloat(customAmounts[friendId] || "0") || 0;
      totalBase += amount;
    });
    const subtotal = Math.round(receipt.totals.subtotal * 100) / 100;
    const difference = Math.abs(totalBase - subtotal);
    return difference <= 0.02;
  };

  const handleContinue = useCallback(async () => {
    if (!receipt || !splitData) {
      Alert.alert("Error", "Missing data");
      return;
    }

    if (!validateAmounts()) {
      Alert.alert(
        "Invalid Amounts",
        `Amounts must sum to ${formatCurrency(
          receipt.totals.subtotal,
          receipt.totals.currency
        )}`
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const friendShares: Record<string, number> = {};
    selectedFriendIds.forEach((friendId) => {
      const amount = parseFloat(customAmounts[friendId] || "0") || 0;
      friendShares[friendId] = amount;
    });

    const tip =
      receipt.totals.total -
      receipt.totals.subtotal -
      (receipt.totals.tax || 0);
    const { taxDistribution, tipDistribution } = calculateProportionalTaxTip(
      friendShares,
      receipt.totals.tax || 0,
      tip > 0.01 ? tip : undefined
    );

    const totals: Record<string, number> = {};
    selectedFriendIds.forEach((friendId) => {
      const base = friendShares[friendId] || 0;
      const tax = taxDistribution[friendId] || 0;
      const tipAmount = tipDistribution?.[friendId] || 0;
      totals[friendId] = Math.round((base + tax + tipAmount) * 100) / 100;
    });

    await AsyncStorage.setItem(
      SPLIT_DATA_KEY,
      JSON.stringify({
        ...splitData,
        calculatedSplit: {
          friendShares,
          taxDistribution,
          tipDistribution,
          totals,
        },
      })
    );

    router.push("/split/review");
  }, [
    receipt,
    splitData,
    selectedFriendIds,
    customAmounts,
    friends,
    deviceContacts,
  ]);

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

  const isValid = validateAmounts();

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
            Custom Amounts
          </ThemedText>
          <ThemedText
            size="sm"
            style={{
              color: isDark ? Colors.dark.icon : Colors.light.icon,
              marginBottom: 12,
            }}
          >
            Enter amounts for each person (must sum to{" "}
            {formatCurrency(receipt.totals.subtotal, receipt.totals.currency)})
          </ThemedText>
          {selectedFriendIds.map((friendId) => {
            const personName = getPersonName(friendId);
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
                  {personName}
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
        <Button
          variant="primary"
          onPress={handleContinue}
          disabled={!isValid}
          fullWidth
        >
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
