import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { RadioButton } from "@/components/ui/radio-button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  getReceipts,
  getSplitData,
  getDefaultSplitMode,
  type StoredReceipt,
} from "@/utils/storage";
import { SplitStrategy } from "@/utils/split";
import { formatCurrency } from "@/utils/format";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExpenseDistributionExample } from "@/components/split/expense-distribution-example";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

export default function ChooseSplitModeScreen() {
  const { receiptId, groupId } = useLocalSearchParams<{
    receiptId?: string;
    groupId?: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] =
    useState<SplitStrategy | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (!receiptId) {
        Alert.alert("Error", "Receipt ID is required");
        router.back();
        return;
      }

      const receipts = await getReceipts();
      const foundReceipt = receipts.find((r) => r.id === receiptId);

      if (!foundReceipt) {
        Alert.alert("Error", "Receipt not found");
        router.back();
        return;
      }

      setReceipt(foundReceipt);

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
    loadData();
  }, [loadData]);

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

        {/* Choose Split Mode */}
        <View style={styles.stepContainer}>
          <ThemedText size="lg" weight="bold" style={styles.stepTitle}>
            Choose Split Mode
          </ThemedText>
          <View style={styles.optionsContainer}>
            {[
              {
                value: SplitStrategy.EQUAL,
                label: "Even",
                icon: "equal.circle",
                description:
                  "Split the total amount equally among all selected people. Perfect for shared meals or group expenses.",
              },
              {
                value: SplitStrategy.ITEMIZED,
                label: "Itemized",
                icon: "list.bullet",
                description:
                  "Assign specific items from the receipt to each person. Great when people ordered different things.",
              },
              {
                value: SplitStrategy.PERCENTAGE,
                label: "Percentage",
                icon: "percent",
                description:
                  "Split by percentage of the total. Each person pays a specific percentage of the bill.",
              },
              {
                value: SplitStrategy.CUSTOM,
                label: "Custom",
                icon: "slider.horizontal.3",
                description:
                  "Manually set custom amounts for each person. Use this for complex splits or specific arrangements.",
              },
            ].map(({ value, label, icon, description }) => (
              <RadioButton
                key={value}
                value={value}
                label={label}
                icon={icon}
                description={description}
                example={
                  <ExpenseDistributionExample
                    amounts={getExampleAmounts(value)}
                  />
                }
                isSelected={selectedStrategy === value}
                onPress={() => handleStrategySelect(value)}
              />
            ))}
          </View>
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
          disabled={!selectedStrategy}
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
    gap: 16,
    paddingBottom: 100,
  },
  receiptCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  stepContainer: {
    gap: 4,
  },
  stepTitle: {
    marginBottom: 8,
  },
  optionsContainer: {
    gap: 12,
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
