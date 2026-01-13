/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Percentage-based split input screen
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
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
import { useReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import type { Friend } from "@/utils/storage";
import { fetchContacts, type ContactInfo } from "@/utils/contacts";
import { formatCurrency } from "@/utils/format";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateProportionalTaxTip } from "@/utils/split";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

export default function PercentageInputsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [deviceContacts, setDeviceContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: string;
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

      try {
        const contacts = await fetchContacts();
        setDeviceContacts(contacts);
      } catch (error) {
        console.error("Error loading contacts:", error);
      }

      // Initialize percentages - default to equal split
      const defaultPercentage = (
        100 / (tempData.selectedFriendIds?.length || 1)
      ).toFixed(1);
      const initialPercentages: Record<string, string> = {};
      tempData.selectedFriendIds?.forEach((friendId: string) => {
        initialPercentages[friendId] = defaultPercentage;
      });
      setPercentages(initialPercentages);
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
    }
  }, [receiptId, receipt, isLoadingReceipt]);

  const isLoading = loading || isLoadingReceipt || isLoadingFriends;

  const getPersonName = (friendId: string): string => {
    // Check if it's a friend
    const friend = friends.find((f) => f.id === friendId);
    if (friend) return friend.name;

    // Check if it's a unified ID (from add-people selector)
    if (friendId.startsWith("unified:")) {
      // Try to match by phone number
      if (friendId.startsWith("unified:phone:")) {
        const phoneNormalized = friendId.replace("unified:phone:", "");
        const contact = deviceContacts.find((c) => {
          const contactPhone = c.phoneNumber?.replace(/\D/g, "");
          return contactPhone === phoneNormalized;
        });
        if (contact) return contact.name;

        // Also check friends
        const friendMatch = friends.find((f) => {
          const friendPhone = f.phoneNumber?.replace(/\D/g, "");
          return friendPhone === phoneNormalized;
        });
        if (friendMatch) return friendMatch.name;
      }

      // Try to match by email
      if (friendId.startsWith("unified:email:")) {
        const email = friendId.replace("unified:email:", "");
        const contact = deviceContacts.find(
          (c) => c.email?.toLowerCase() === email.toLowerCase()
        );
        if (contact) return contact.name;

        // Also check friends
        const friendMatch = friends.find(
          (f) => f.email?.toLowerCase() === email.toLowerCase()
        );
        if (friendMatch) return friendMatch.name;
      }

      // Try to match by name
      if (friendId.startsWith("unified:name:")) {
        const name = friendId.replace("unified:name:", "");
        const contact = deviceContacts.find(
          (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
        if (contact) return contact.name;

        // Also check friends
        const friendMatch = friends.find(
          (f) => f.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
        if (friendMatch) return friendMatch.name;
      }
    }

    // Check if it's a contact ID
    if (friendId.startsWith("contact:")) {
      // Parse the contact ID format: contact:name:phoneOrEmail
      const parts = friendId.split(":");
      if (parts.length >= 3) {
        const contactName = parts[1];
        const phoneOrEmail = parts.slice(2).join(":"); // Handle colons in email addresses

        // Try exact match first
        const exactMatch = deviceContacts.find(
          (c) =>
            `contact:${c.name}:${c.phoneNumber || c.email || ""}` === friendId
        );
        if (exactMatch) return exactMatch.name;

        // Try matching by name and phone/email with normalization
        const contact = deviceContacts.find((c) => {
          if (c.name !== contactName) return false;
          const contactPhone = c.phoneNumber?.replace(/\D/g, "");
          const searchPhone = phoneOrEmail.replace(/\D/g, "");
          if (contactPhone && searchPhone && contactPhone === searchPhone)
            return true;
          if (
            c.email &&
            phoneOrEmail &&
            c.email.toLowerCase() === phoneOrEmail.toLowerCase()
          )
            return true;
          return false;
        });
        if (contact) return contact.name;
      }
    }

    return "Unknown";
  };

  const getTotalPercentage = (): number => {
    return selectedFriendIds.reduce((sum, friendId) => {
      const pct = parseFloat(percentages[friendId] || "0") || 0;
      return sum + pct;
    }, 0);
  };

  const validatePercentages = (): boolean => {
    const total = getTotalPercentage();
    return Math.abs(total - 100) <= 0.1; // Allow 0.1% tolerance
  };

  const handleContinue = useCallback(async () => {
    if (!receipt || !splitData) {
      Alert.alert("Error", "Missing data");
      return;
    }

    if (!validatePercentages()) {
      Alert.alert("Invalid Percentages", "Percentages must sum to 100%");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Calculate base shares from percentages
    const friendShares: Record<string, number> = {};
    selectedFriendIds.forEach((friendId) => {
      const percentage = parseFloat(percentages[friendId] || "0") || 0;
      friendShares[friendId] = (receipt.totals.subtotal * percentage) / 100;
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
    percentages,
    friends,
    deviceContacts,
  ]);

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

  const isValid = validatePercentages();
  const totalPercentage = getTotalPercentage();

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
        <View>
          <ThemedText size="xl" weight="bold">
            Percentage Split
          </ThemedText>
          <ThemedText
            size="sm"
            style={{
              color: isDark ? Colors.dark.icon : Colors.light.icon,
            }}
          >
            Enter the percentage each person should pay (must sum to 100%)
          </ThemedText>

          {/* Total Percentage Indicator */}
          <View
            className="p-4 rounded-lg mb-2"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              borderWidth: 1,
              borderColor: isValid
                ? isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)"
                : "#ff4444",
            }}
          >
            <View className="flex-row items-center justify-between">
              <ThemedText size="base" weight="semibold">
                Total
              </ThemedText>
              <ThemedText
                size="lg"
                weight="bold"
                style={{
                  color: isValid ? Colors.light.tint : "#ff4444",
                }}
              >
                {totalPercentage.toFixed(1)}%
              </ThemedText>
            </View>
          </View>

          {/* Person Input Fields */}
          {selectedFriendIds.map((friendId) => {
            const personName = getPersonName(friendId);
            const percentage = percentages[friendId] || "0";
            const amount =
              (receipt.totals.subtotal * (parseFloat(percentage) || 0)) / 100;

            return (
              <View
                key={friendId}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <ThemedText size="base" weight="semibold" className="flex-1">
                    {personName}
                  </ThemedText>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      style={{
                        width: 100,
                        borderRadius: 6,
                        borderWidth: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        fontSize: 16,
                        textAlign: "right",
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.02)",
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.1)",
                        color: isDark ? Colors.dark.text : Colors.light.text,
                      }}
                      value={percentages[friendId] || ""}
                      onChangeText={(text) =>
                        setPercentages({
                          ...percentages,
                          [friendId]: text,
                        })
                      }
                      placeholder="0"
                      placeholderTextColor={
                        isDark ? Colors.dark.icon : Colors.light.icon
                      }
                      keyboardType="decimal-pad"
                    />
                    <ThemedText size="base">%</ThemedText>
                  </View>
                </View>
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  }}
                >
                  ≈ {formatCurrency(amount, receipt.totals.currency)}
                </ThemedText>
              </View>
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
