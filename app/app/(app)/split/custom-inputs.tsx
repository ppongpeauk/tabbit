/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Custom amount split input screen
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { FormTextInput } from "@/components/form-text-input";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { formatCurrency } from "@/utils/format";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateProportionalTaxTip } from "@/utils/split";
import { SplitProgressBar } from "@/components/split-progress-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

interface CustomAmountsForm {
  amounts: Record<string, string>;
}

export default function CustomInputsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: string;
    selectedFriendIds: string[];
    includeYourself?: boolean;
    tempPeople?: Record<string, string>;
  } | null>(null);
  const [receiptId, setReceiptId] = useState<string | undefined>(undefined);

  const {
    control,
    handleSubmit,
    watch,
    reset,
  } = useForm<CustomAmountsForm>({
    defaultValues: {
      amounts: {},
    },
  });

  const watchedAmounts = watch("amounts");

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

      // Initialize custom amounts
      const amounts: Record<string, string> = {};
      tempData.selectedFriendIds?.forEach((friendId: string) => {
        amounts[friendId] = "";
      });
      reset({ amounts });
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [reset]);

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
    if (user && friendId === user.id) {
      return "Me";
    }
    if (splitData?.tempPeople && splitData.tempPeople[friendId]) {
      return splitData.tempPeople[friendId];
    }
    const friend = friends.find((f) => f.id === friendId);
    return friend?.name || "Unknown";
  };

  const currentTotal = useMemo(() => {
    return Object.values(watchedAmounts || {}).reduce((sum, val) => {
      return sum + (parseFloat(val) || 0);
    }, 0);
  }, [watchedAmounts]);

  const validateAmounts = useCallback((): boolean => {
    if (!receipt) return false;
    const subtotal = Math.round(receipt.totals.subtotal * 100) / 100;
    const difference = Math.abs(currentTotal - subtotal);
    return difference <= 0.02;
  }, [receipt, currentTotal]);

  const handleContinue = handleSubmit(async (data) => {
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
      const amount = parseFloat(data.amounts[friendId] || "0") || 0;
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
  });

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

  const isValid = validateAmounts();

  const totalAmount = currentTotal;
  const remainingAmount = receipt ? receipt.totals.subtotal - totalAmount : 0;

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
        currentStage={3}
        totalStages={4}
        stageLabels={["Method", "People", "Amounts", "Review"]}
      />
      <ScrollView
        contentContainerClassName="px-5 py-4 gap-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <View>
            <ThemedText size="xl" weight="bold">
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
          </View>

          {/* Remaining Amount Indicator */}
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
              <ThemedText weight="semibold">
                Remaining
              </ThemedText>
              <ThemedText
                size="base"
                weight="bold"
              >
                {formatCurrency(remainingAmount, receipt.totals.currency)}
              </ThemedText>
            </View>
            <ThemedText
              size="xs"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
                marginTop: 4,
              }}
            >
              Total: {formatCurrency(totalAmount, receipt.totals.currency)} /{" "}
              {formatCurrency(receipt.totals.subtotal, receipt.totals.currency)}
            </ThemedText>
          </View>

          {/* Person Input Fields */}
          {selectedFriendIds.map((friendId) => {
            const personName = getPersonName(friendId);
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
                <Controller
                  control={control}
                  name={`amounts.${friendId}`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormTextInput
                      label={personName}
                      value={value || ""}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      numericOnly
                      min={0}
                      placeholder="0.00"
                      style={{ textAlign: "right" }}
                    />
                  )}
                />
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
