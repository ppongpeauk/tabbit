/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Choose split mode screen for receipt splitting
 */

import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useReceipt } from "@/hooks/use-receipts";
import { getSplitData, getDefaultSplitMode } from "@/utils/storage";
import { SplitStrategy } from "@/utils/split";
import { formatCurrency } from "@/utils/format";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SplitModeChoices } from "@/components/split/split-mode-choices";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

export default function ChooseSplitModeScreen() {
  const { receiptId, groupId } = useLocalSearchParams<{
    receiptId?: string;
    groupId?: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [selectedStrategy, setSelectedStrategy] =
    useState<SplitStrategy | null>(null);
  const [loading, setLoading] = useState(true);

  // Use React Query hook
  const { data: receipt, isLoading: isLoadingReceipt } = useReceipt(receiptId);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (!receiptId) {
        Alert.alert("Error", "Receipt ID is required");
        router.back();
        return;
      }

      const existingSplitData = await getSplitData(receiptId);
      if (existingSplitData) {
        setSelectedStrategy(existingSplitData.strategy);
      } else {
        // Use default split mode if no existing split data
        const defaultMode = await getDefaultSplitMode();
        setSelectedStrategy(defaultMode);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    if (receiptId) {
      loadData();
    }
  }, [receiptId, loadData]);

  useEffect(() => {
    if (receiptId && receipt === null && !isLoadingReceipt) {
      Alert.alert("Error", "Receipt not found");
      router.back();
    }
  }, [receiptId, receipt, isLoadingReceipt]);

  const handleStrategySelect = useCallback((strategy: SplitStrategy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStrategy(strategy);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!selectedStrategy || !receiptId) {
      Alert.alert("Error", "Please select a split mode");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await AsyncStorage.setItem(
      SPLIT_DATA_KEY,
      JSON.stringify({
        receiptId,
        groupId,
        strategy: selectedStrategy,
      })
    );

    router.push("/split/add-people");
  }, [selectedStrategy, receiptId, groupId]);

  // Calculate example amounts for each split mode
  const getExampleAmounts = useCallback(
    (strategy: SplitStrategy): string[] => {
      if (!receipt) return ["$0", "$0", "$0"];

      const total = receipt.totals.total;
      const currency = receipt.totals.currency;
      const numPeople = 3;

      switch (strategy) {
        case SplitStrategy.EQUAL: {
          const amountPerPerson = total / numPeople;
          return Array(numPeople).fill(
            formatCurrency(amountPerPerson, currency)
          );
        }
        case SplitStrategy.ITEMIZED: {
          // Example: $20, $15, $10 (sums to $45, scaled to actual total)
          const exampleRatios = [20, 15, 10];
          const exampleTotal = exampleRatios.reduce((sum, r) => sum + r, 0);
          return exampleRatios.map((ratio) =>
            formatCurrency((total * ratio) / exampleTotal, currency)
          );
        }
        case SplitStrategy.PERCENTAGE: {
          // Example: 33%, 33%, 34% (sums to 100%)
          const percentages = [33, 33, 34];
          return percentages.map((pct) => `${pct}%`);
        }
        case SplitStrategy.CUSTOM: {
          // Example: $25, $20, $15 (sums to $60, scaled to actual total)
          const exampleRatios = [25, 20, 15];
          const exampleTotal = exampleRatios.reduce((sum, r) => sum + r, 0);
          return exampleRatios.map((ratio) =>
            formatCurrency((total * ratio) / exampleTotal, currency)
          );
        }
        default:
          return ["$0", "$0", "$0"];
      }
    },
    [receipt]
  );

  if (loading || isLoadingReceipt || !receipt) {
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
        {/* Choose Split Mode */}
        <View className="gap-1">
          <ThemedText size="xl" weight="bold" className="mb-2">
            How do you want to split the bill?
          </ThemedText>
          <SplitModeChoices
            selectedStrategy={selectedStrategy}
            onSelect={handleStrategySelect}
            getExampleAmounts={getExampleAmounts}
          />
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
          disabled={!selectedStrategy}
          fullWidth
        >
          Continue
        </Button>
      </View>
    </View>
  );
}
