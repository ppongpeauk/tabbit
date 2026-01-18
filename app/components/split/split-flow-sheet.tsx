/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Unified split flow in a bottom sheet modal with react-hook-form and Reanimated animations
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useForm, FormProvider, Controller } from "react-hook-form";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useReceipt, useUpdateReceipt } from "@/hooks/use-receipts";
import { useFriends, useCreateFriend } from "@/hooks/use-friends";
import { formatCurrency } from "@/utils/format";
import {
  SplitStrategy,
  calculateSplit,
  validateSplit,
  type SplitData,
  type ItemAssignment,
  calculateProportionalTaxTip,
} from "@/utils/split";
import { SplitModeChoices } from "./split-mode-choices";
import { AddPeopleSelector } from "@/components/add-people-selector";
import { ItemAssignment as ItemAssignmentComponent } from "./item-assignment";
import { SplitSummary } from "./split-summary";
import { SplitProgressBar } from "@/components/split-progress-bar";
import { FormTextInput } from "@/components/form-text-input";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type React from "react";

type SplitStep = "method" | "people" | "amounts" | "review";

interface SplitFormData {
  strategy: SplitStrategy | null;
  selectedFriendIds: string[];
  customAmounts: Record<string, string>;
  percentages: Record<string, string>;
  assignments: ItemAssignment[];
}

interface SplitFlowSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receiptId: string;
  groupId?: string;
  onComplete?: () => void;
}

export function SplitFlowSheet({
  bottomSheetRef,
  receiptId,
  groupId,
  onComplete,
}: SplitFlowSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState<SplitStep>("method");
  const [searchQuery, setSearchQuery] = useState("");
  const [tempPeople, setTempPeople] = useState<Record<string, string>>({});
  const addPersonSheetRef = useRef<TrueSheet | null>(null);
  const addTempPersonSheetRef = useRef<TrueSheet | null>(null);
  const receiptIdRef = useRef<string | null>(null);
  const createFriendMutation = useCreateFriend();

  const addPersonForm = useForm<{ name: string }>({
    defaultValues: { name: "" },
  });

  const addTempPersonForm = useForm<{ name: string }>({
    defaultValues: { name: "" },
  });

  const { data: receipt, isLoading: isLoadingReceipt } = useReceipt(receiptId);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
  const updateReceiptMutation = useUpdateReceipt();

  const slideProgress = useSharedValue(0);

  const methods = useForm<SplitFormData>({
    defaultValues: {
      strategy: null,
      selectedFriendIds: [],
      customAmounts: {},
      percentages: {},
      assignments: [],
    },
  });

  const { watch, setValue } = methods;
  const strategy = watch("strategy");
  const selectedFriendIds = watch("selectedFriendIds");
  const customAmounts = watch("customAmounts");
  const percentages = watch("percentages");
  const assignments = watch("assignments");

  // Initialize form with existing split data if editing, reset when sheet opens
  useEffect(() => {
    if (!receipt) return;

    // Only reset step and animation when receiptId changes (sheet opens with new receipt)
    const isNewReceipt = receiptIdRef.current !== receipt.id;
    if (isNewReceipt) {
      setCurrentStep("method");
      slideProgress.value = 0;
      receiptIdRef.current = receipt.id;
    }

    if (receipt.splitData) {
      const splitData = receipt.splitData;

      // Only set strategy if it's a new receipt or strategy is not set
      if (isNewReceipt || !strategy) {
        setValue("strategy", splitData.strategy);
      }

      const friendIds = Object.keys(splitData.totals || {});

      // Only set selectedFriendIds if it's a new receipt or they're empty
      if (isNewReceipt || selectedFriendIds.length === 0) {
        setValue("selectedFriendIds", friendIds);
      }

      if (splitData.people) {
        const tempPeopleMap: Record<string, string> = {};
        friendIds.forEach((friendId) => {
          const friend = friends.find((f) => f.id === friendId);
          if (!friend && splitData.people?.[friendId]) {
            tempPeopleMap[friendId] = splitData.people[friendId];
          }
        });
        setTempPeople(tempPeopleMap);
      }

      // Initialize assignments if itemized (only on new receipt)
      if (isNewReceipt) {
        if (splitData.strategy === SplitStrategy.ITEMIZED && splitData.assignments) {
          setValue("assignments", splitData.assignments);
        } else {
          const initialAssignments: ItemAssignment[] = receipt.items.map(
            (item, index) => ({
              itemId: item.id || index.toString(),
              friendIds: [],
            })
          );
          setValue("assignments", initialAssignments);
        }

        // Initialize custom amounts or percentages if applicable
        if (splitData.strategy === SplitStrategy.CUSTOM && splitData.friendShares) {
          const customAmounts: Record<string, string> = {};
          Object.entries(splitData.friendShares).forEach(([friendId, amount]) => {
            customAmounts[friendId] = amount.toString();
          });
          setValue("customAmounts", customAmounts);
        } else if (splitData.strategy === SplitStrategy.PERCENTAGE && receipt.totals.subtotal > 0) {
          const percentages: Record<string, string> = {};
          Object.entries(splitData.friendShares).forEach(([friendId, amount]) => {
            const percentage = (amount / receipt.totals.subtotal) * 100;
            percentages[friendId] = percentage.toFixed(1);
          });
          setValue("percentages", percentages);
        }
      }
    } else if (isNewReceipt) {
      // Initialize empty assignments for new split
      const initialAssignments: ItemAssignment[] = receipt.items.map(
        (item, index) => ({
          itemId: item.id || index.toString(),
          friendIds: [],
        })
      );
      setValue("assignments", initialAssignments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt?.id, setValue, slideProgress]);

  // Update tempPeople when friends change (without resetting step)
  useEffect(() => {
    if (!receipt?.splitData?.people) return;

    const friendIds = Object.keys(receipt.splitData.totals || {});
    const tempPeopleMap: Record<string, string> = {};
    friendIds.forEach((friendId) => {
      const friend = friends.find((f) => f.id === friendId);
      if (!friend && receipt.splitData?.people?.[friendId]) {
        tempPeopleMap[friendId] = receipt.splitData.people[friendId];
      }
    });
    setTempPeople(tempPeopleMap);
  }, [receipt, friends]);

  const stepIndex = useMemo(() => {
    const steps: SplitStep[] = ["method", "people", "amounts", "review"];
    return steps.indexOf(currentStep);
  }, [currentStep]);

  const validateCustomAmounts = useCallback((): boolean => {
    if (!receipt) return false;
    let totalBase = 0;
    selectedFriendIds.forEach((friendId) => {
      const amount = parseFloat(customAmounts[friendId] || "0") || 0;
      totalBase += amount;
    });
    const subtotal = Math.round(receipt.totals.subtotal * 100) / 100;
    const difference = Math.abs(totalBase - subtotal);
    if (difference > 0.02) {
      Alert.alert(
        "Invalid Amounts",
        `Amounts must sum to ${formatCurrency(
          receipt.totals.subtotal,
          receipt.totals.currency
        )}`
      );
      return false;
    }
    return true;
  }, [receipt, selectedFriendIds, customAmounts]);

  const validatePercentages = useCallback((): boolean => {
    const total = selectedFriendIds.reduce((sum, friendId) => {
      const pct = parseFloat(percentages[friendId] || "0") || 0;
      return sum + pct;
    }, 0);
    if (Math.abs(total - 100) > 0.1) {
      Alert.alert("Invalid Percentages", "Percentages must sum to 100%");
      return false;
    }
    return true;
  }, [selectedFriendIds, percentages]);

  const validateItemized = useCallback((): boolean => {
    if (!receipt) return false;
    const assignedItemIds = new Set(assignments.map((a) => a.itemId));
    const unassignedItems = receipt.items.filter((item, index) => {
      const itemId = item.id || index.toString();
      return !assignedItemIds.has(itemId);
    });
    if (unassignedItems.length > 0) {
      Alert.alert(
        "Incomplete Assignment",
        `Please assign all items. ${unassignedItems.length} item(s) not assigned.`
      );
      return false;
    }
    return true;
  }, [receipt, assignments]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep === "method") {
      if (!strategy) {
        Alert.alert("Error", "Please select a split mode");
        return;
      }
      setCurrentStep("people");
      slideProgress.value = withTiming(1, { duration: 300 });
    } else if (currentStep === "people") {
      if (selectedFriendIds.length === 0) {
        Alert.alert("Error", "Please select at least one person");
        return;
      }
      setCurrentStep("amounts");
      slideProgress.value = withTiming(2, { duration: 300 });
    } else if (currentStep === "amounts") {
      if (strategy === SplitStrategy.CUSTOM) {
        if (!validateCustomAmounts()) {
          return;
        }
      } else if (strategy === SplitStrategy.PERCENTAGE) {
        if (!validatePercentages()) {
          return;
        }
      } else if (strategy === SplitStrategy.ITEMIZED) {
        if (!validateItemized()) {
          return;
        }
      }
      setCurrentStep("review");
      slideProgress.value = withTiming(3, { duration: 300 });
    }
  }, [
    currentStep,
    strategy,
    selectedFriendIds,
    slideProgress,
    validateCustomAmounts,
    validatePercentages,
    validateItemized,
  ]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep === "people") {
      setCurrentStep("method");
      slideProgress.value = withTiming(0, { duration: 300 });
    } else if (currentStep === "amounts") {
      setCurrentStep("people");
      slideProgress.value = withTiming(1, { duration: 300 });
    } else if (currentStep === "review") {
      setCurrentStep("amounts");
      slideProgress.value = withTiming(2, { duration: 300 });
    }
  }, [currentStep, slideProgress]);

  const calculatedSplitData = useMemo<SplitData | null>(() => {
    if (!receipt || !strategy || selectedFriendIds.length === 0) return null;

    if (strategy === SplitStrategy.EQUAL) {
      return calculateSplit(receipt, strategy, [], selectedFriendIds);
    }

    if (strategy === SplitStrategy.CUSTOM) {
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

      return {
        strategy,
        assignments: [],
        friendShares,
        taxDistribution,
        tipDistribution: tip > 0.01 ? tipDistribution : undefined,
        totals,
      };
    }

    if (strategy === SplitStrategy.PERCENTAGE) {
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

      return {
        strategy,
        assignments: [],
        friendShares,
        taxDistribution,
        tipDistribution: tip > 0.01 ? tipDistribution : undefined,
        totals,
      };
    }

    if (strategy === SplitStrategy.ITEMIZED) {
      return calculateSplit(receipt, strategy, assignments, selectedFriendIds);
    }

    return null;
  }, [
    receipt,
    strategy,
    selectedFriendIds,
    customAmounts,
    percentages,
    assignments,
  ]);

  const handleFinish = useCallback(async () => {
    if (!receipt || !calculatedSplitData || !strategy) {
      Alert.alert("Error", "Missing data");
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const peopleMap: Record<string, string> = {};
    selectedFriendIds.forEach((friendId) => {
      if (tempPeople[friendId]) {
        peopleMap[friendId] = tempPeople[friendId];
      } else {
        const friend = friends.find((f) => f.id === friendId);
        if (friend) {
          peopleMap[friendId] = friend.name;
        }
      }
    });

    const completeSplit: SplitData = {
      ...calculatedSplitData,
      people: peopleMap,
    };

    updateReceiptMutation.mutate(
      {
        id: receipt.id,
        updates: { splitData: completeSplit },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          bottomSheetRef.current?.dismiss();
          onComplete?.();
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Error", "Failed to save split");
        },
      }
    );
  }, [
    receipt,
    calculatedSplitData,
    strategy,
    assignments,
    selectedFriendIds,
    friends,
    tempPeople,
    updateReceiptMutation,
    bottomSheetRef,
    onComplete,
  ]);

  const handleOpenAddPerson = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addPersonForm.reset({ name: "" });
    addPersonSheetRef.current?.present();
  }, [addPersonForm]);


  const handleSaveNewPerson = useCallback(async (data: { name: string }) => {
    const trimmedName = data.name.trim();

    const allPeopleNames = [
      ...friends.map((f) => f.name),
      ...Object.values(tempPeople),
    ];
    const isDuplicate = allPeopleNames.some(
      (name) => name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert("Error", "A person with this name already exists");
      return;
    }

    try {
      const newPerson = await createFriendMutation.mutateAsync({
        name: trimmedName,
      });
      setValue("selectedFriendIds", [...selectedFriendIds, newPerson.id]);
      addPersonForm.reset({ name: "" });
      addPersonSheetRef.current?.dismiss();
    } catch {
      Alert.alert("Error", "Failed to add person");
    }
  }, [friends, tempPeople, createFriendMutation, selectedFriendIds, setValue, addPersonForm]);

  const handleSaveTempPerson = useCallback(async (data: { name: string }) => {
    const trimmedName = data.name.trim();

    const allPeopleNames = [
      ...friends.map((f) => f.name),
      ...Object.values(tempPeople),
    ];
    const isDuplicate = allPeopleNames.some(
      (name) => name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert("Error", "A person with this name already exists");
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const updatedTempPeople = {
      ...tempPeople,
      [tempId]: trimmedName,
    };
    setTempPeople(updatedTempPeople);
    setValue("selectedFriendIds", [...selectedFriendIds, tempId]);
    addTempPersonForm.reset({ name: "" });
    addTempPersonSheetRef.current?.dismiss();
  }, [friends, tempPeople, selectedFriendIds, setValue, addTempPersonForm]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

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
          const exampleRatios = [20, 15, 10];
          const exampleTotal = exampleRatios.reduce((sum, r) => sum + r, 0);
          return exampleRatios.map((ratio) =>
            formatCurrency((total * ratio) / exampleTotal, currency)
          );
        }
        case SplitStrategy.PERCENTAGE: {
          const percentages = [33, 33, 34];
          return percentages.map((pct) => `${pct}%`);
        }
        case SplitStrategy.CUSTOM: {
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

  const getPersonName = useCallback(
    (friendId: string): string => {
      if (tempPeople[friendId]) {
        return tempPeople[friendId];
      }
      const friend = friends.find((f) => f.id === friendId);
      return friend?.name || "Unknown";
    },
    [friends, tempPeople]
  );

  const screenWidth = Dimensions.get("window").width;

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      slideProgress.value,
      [0, 1, 2, 3],
      [0, -screenWidth, -screenWidth * 2, -screenWidth * 3]
    );
    return {
      transform: [{ translateX }],
    };
  });

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
        <View className="flex-row gap-3">
          {currentStep !== "method" && (
            <Button
              variant="secondary"
              onPress={handleBack}
              style={{ flex: 1 }}
            >
              Back
            </Button>
          )}
          {currentStep !== "review" ? (
            <Button
              variant="primary"
              onPress={handleNext}
              disabled={
                (currentStep === "method" && !strategy) ||
                (currentStep === "people" &&
                  selectedFriendIds.length === 0)
              }
              style={{ flex: 1 }}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              onPress={handleFinish}
              disabled={!calculatedSplitData || updateReceiptMutation.isPending}
              style={{ flex: 1 }}
            >
              {updateReceiptMutation.isPending ? "Saving..." : "Finish"}
            </Button>
          )}
        </View>
      </View>
    );
  }, [
    currentStep,
    strategy,
    selectedFriendIds,
    calculatedSplitData,
    updateReceiptMutation.isPending,
    handleBack,
    handleNext,
    handleFinish,
    isDark,
    insets.bottom,
  ]);

  const isLoading = isLoadingReceipt || isLoadingFriends;

  if (isLoading) {
    return (
      <TrueSheet
        ref={bottomSheetRef}
        backgroundColor={
          isDark ? Colors.dark.background : Colors.light.background
        }
        detents={[1]}
      >
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator
            size="large"
            color={isDark ? Colors.dark.text : Colors.light.text}
          />
        </View>
      </TrueSheet>
    );
  }

  if (!receipt) {
    return null;
  }

  return (
    <FormProvider {...methods}>
      <TrueSheet
        ref={bottomSheetRef}
        backgroundColor={
          isDark ? Colors.dark.background : Colors.light.background
        }
        detents={[1]}
        footer={renderFooter()}
      >
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
            <ThemedText size="xl" weight="bold">
              Split Receipt
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

          {/* Progress Bar */}
          <View className="px-6 pb-4">
            <SplitProgressBar
              currentStage={stepIndex + 1}
              totalStages={4}
              stageLabels={["Method", "People", "Amounts", "Review"]}
            />
          </View>

          {/* Content */}
          <View style={{ flex: 1, overflow: "hidden" }}>
            <Animated.View
              style={[
                containerAnimatedStyle,
                { flexDirection: "row", width: screenWidth * 4 },
              ]}
            >
              {/* Step 1: Method */}
              <ScrollView
                style={{ width: screenWidth }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 200 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="gap-4">
                  <ThemedText size="xl" weight="bold">
                    How do you want to split the bill?
                  </ThemedText>
                  <SplitModeChoices
                    selectedStrategy={strategy}
                    onSelect={(s) => setValue("strategy", s)}
                    getExampleAmounts={getExampleAmounts}
                  />
                </View>
              </ScrollView>

              {/* Step 2: People */}
              <View style={{ width: screenWidth }}>
                <View className="px-6 pb-4 gap-4">
                  <ThemedText size="xl" weight="bold">
                    Who&apos;s splitting?
                  </ThemedText>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleOpenAddPerson}
                    className={`rounded-xl p-4 gap-1 ${isDark ? "bg-[#1A1D1E]" : "bg-white"
                      }`}
                    style={{
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: isDark
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: isDark
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <SymbolView
                          name="plus"
                          tintColor={
                            isDark ? Colors.dark.tint : Colors.light.tint
                          }
                          style={{ width: 24, height: 24 }}
                        />
                      </View>
                      <View className="flex-1">
                        <ThemedText size="base" weight="semibold">
                          Add Someone Not In Contacts
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 400 }} className="px-6">
                  <AddPeopleSelector
                    name="selectedFriendIds"
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    tempPeople={tempPeople}
                  />
                </View>
              </View>

              {/* Step 3: Amounts */}
              <ScrollView
                style={{ width: screenWidth }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 200 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="gap-4">
                  {strategy === SplitStrategy.CUSTOM && (
                    <>
                      <ThemedText size="xl" weight="bold">
                        Custom Amounts
                      </ThemedText>
                      <ThemedText
                        size="sm"
                        style={{
                          color: isDark ? Colors.dark.icon : Colors.light.icon,
                        }}
                      >
                        Enter amounts for each person (must sum to{" "}
                        {formatCurrency(
                          receipt.totals.subtotal,
                          receipt.totals.currency
                        )}
                        )
                      </ThemedText>
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
                            <FormTextInput
                              label={personName}
                              value={customAmounts[friendId] || ""}
                              onChangeText={(text) =>
                                setValue("customAmounts", {
                                  ...customAmounts,
                                  [friendId]: text,
                                })
                              }
                              numericOnly
                              min={0}
                              placeholder="0.00"
                              style={{ textAlign: "right" }}
                            />
                          </View>
                        );
                      })}
                    </>
                  )}

                  {strategy === SplitStrategy.PERCENTAGE && (
                    <>
                      <ThemedText size="xl" weight="bold">
                        Percentage Split
                      </ThemedText>
                      <ThemedText
                        size="sm"
                        style={{
                          color: isDark ? Colors.dark.icon : Colors.light.icon,
                        }}
                      >
                        Enter the percentage each person should pay (must sum
                        to 100%)
                      </ThemedText>
                      {selectedFriendIds.map((friendId) => {
                        const personName = getPersonName(friendId);
                        const percentage = percentages[friendId] || "0";
                        const amount =
                          (receipt.totals.subtotal *
                            (parseFloat(percentage) || 0)) /
                          100;

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
                              <ThemedText size="base" weight="semibold">
                                {personName}
                              </ThemedText>
                              <View className="flex-row items-center gap-2">
                                <FormTextInput
                                  value={percentages[friendId] || ""}
                                  onChangeText={(text) =>
                                    setValue("percentages", {
                                      ...percentages,
                                      [friendId]: text,
                                    })
                                  }
                                  numericOnly
                                  min={0}
                                  max={100}
                                  placeholder="0"
                                  style={{ width: 100, textAlign: "right" }}
                                />
                                <ThemedText size="base">%</ThemedText>
                              </View>
                            </View>
                            <ThemedText
                              size="sm"
                              style={{
                                color: isDark
                                  ? Colors.dark.icon
                                  : Colors.light.icon,
                              }}
                            >
                              ≈ {formatCurrency(amount, receipt.totals.currency)}
                            </ThemedText>
                          </View>
                        );
                      })}
                    </>
                  )}

                  {strategy === SplitStrategy.ITEMIZED && (
                    <>
                      <ThemedText size="xl" weight="bold">
                        Assign Items
                      </ThemedText>
                      <ThemedText
                        size="sm"
                        style={{
                          color: isDark ? Colors.dark.icon : Colors.light.icon,
                        }}
                      >
                        Tap each item to assign it to specific people
                      </ThemedText>
                      {receipt.items.map((item, index) => {
                        const itemId = item.id || index.toString();
                        const assignment = assignments.find(
                          (a) => a.itemId === itemId
                        );
                        return (
                          <ItemAssignmentComponent
                            key={itemId}
                            item={item}
                            itemIndex={index}
                            friends={friends}
                            selectedFriendIds={assignment?.friendIds || []}
                            quantities={assignment?.quantities}
                            tempPeople={tempPeople}
                            onFriendIdsChange={(friendIds) => {
                              const newAssignments = [...assignments];
                              const existingIndex = newAssignments.findIndex(
                                (a) => a.itemId === itemId
                              );
                              const newAssignment: ItemAssignment = {
                                itemId,
                                friendIds,
                                quantities: assignment?.quantities,
                              };
                              if (existingIndex >= 0) {
                                newAssignments[existingIndex] = newAssignment;
                              } else {
                                newAssignments.push(newAssignment);
                              }
                              setValue("assignments", newAssignments);
                            }}
                            onQuantitiesChange={(quantities) => {
                              const newAssignments = [...assignments];
                              const existingIndex = newAssignments.findIndex(
                                (a) => a.itemId === itemId
                              );
                              const newAssignment: ItemAssignment = {
                                itemId,
                                friendIds: assignment?.friendIds || [],
                                quantities,
                              };
                              if (existingIndex >= 0) {
                                newAssignments[existingIndex] = newAssignment;
                              } else {
                                newAssignments.push(newAssignment);
                              }
                              setValue("assignments", newAssignments);
                            }}
                            currency={receipt.totals.currency}
                          />
                        );
                      })}
                    </>
                  )}

                  {strategy === SplitStrategy.EQUAL && (
                    <View className="gap-2">
                      <ThemedText size="xl" weight="bold">
                        Equal Split
                      </ThemedText>
                      <ThemedText
                        size="sm"
                        style={{
                          color: isDark
                            ? Colors.dark.icon
                            : Colors.light.icon,
                        }}
                      >
                        The total will be split equally among all selected
                        people.
                      </ThemedText>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Step 4: Review */}
              <ScrollView
                style={{ width: screenWidth }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 200 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="gap-4">
                  <ThemedText size="xl" weight="bold">
                    Review Split Summary
                  </ThemedText>
                  {calculatedSplitData && (
                    <SplitSummary
                      splitData={calculatedSplitData}
                      friends={friends}
                      receiptTotal={receipt.totals.total}
                      currency={receipt.totals.currency}
                    />
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </View>
      </TrueSheet>

      <FormProvider {...addPersonForm}>
        <TrueSheet
          ref={addPersonSheetRef}
          backgroundColor={
            isDark ? Colors.dark.background : Colors.light.background
          }

          scrollable
        >
          <ScrollView
            contentContainerClassName="px-6 py-8"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View className="gap-3">
              <ThemedText size="xl" weight="bold">
                Add Person
              </ThemedText>
              <Controller
                control={addPersonForm.control}
                name="name"
                rules={{
                  required: "Name is required",
                  validate: (value) => {
                    const trimmed = value.trim();
                    if (!trimmed) {
                      return "Name is required";
                    }
                    const allPeopleNames = [
                      ...friends.map((f) => f.name),
                      ...Object.values(tempPeople),
                    ];
                    const isDuplicate = allPeopleNames.some(
                      (name) => name.trim().toLowerCase() === trimmed.toLowerCase()
                    );
                    if (isDuplicate) {
                      return "A person with this name already exists";
                    }
                    return true;
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <FormTextInput
                      label="Name"
                      value={value}
                      onChangeText={(text) => onChange(text.trimStart())}
                      onBlur={() => {
                        onBlur();
                        const trimmed = value.trim();
                        if (trimmed !== value) {
                          onChange(trimmed);
                        }
                      }}
                      placeholder="Enter name"
                      autoFocus
                    />
                    {addPersonForm.formState.errors.name && (
                      <ThemedText
                        size="sm"
                        style={{ color: "#ef4444", marginTop: -12 }}
                      >
                        {addPersonForm.formState.errors.name.message}
                      </ThemedText>
                    )}
                  </>
                )}
              />
              <View className="flex-row gap-3">
                <Button
                  variant="secondary"
                  onPress={() => {
                    addPersonForm.reset({ name: "" });
                    addPersonSheetRef.current?.dismiss();
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={addPersonForm.handleSubmit(handleSaveNewPerson)}
                  style={{ flex: 1 }}
                >
                  Save
                </Button>
              </View>
            </View>
          </ScrollView>
        </TrueSheet>
      </FormProvider>

      <FormProvider {...addTempPersonForm}>
        <TrueSheet
          ref={addTempPersonSheetRef}
          backgroundColor={
            isDark ? Colors.dark.background : Colors.light.background
          }

          scrollable
        >
          <ScrollView
            contentContainerClassName="px-6 py-8"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View className="gap-3">
              <ThemedText size="xl" weight="bold">
                Add Person Not on Platform
              </ThemedText>
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                This person will only be added to this split and won&apos;t be saved as a contact.
              </ThemedText>
              <Controller
                control={addTempPersonForm.control}
                name="name"
                rules={{
                  required: "Name is required",
                  validate: (value) => {
                    const trimmed = value.trim();
                    if (!trimmed) {
                      return "Name is required";
                    }
                    const allPeopleNames = [
                      ...friends.map((f) => f.name),
                      ...Object.values(tempPeople),
                    ];
                    const isDuplicate = allPeopleNames.some(
                      (name) => name.trim().toLowerCase() === trimmed.toLowerCase()
                    );
                    if (isDuplicate) {
                      return "A person with this name already exists";
                    }
                    return true;
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <FormTextInput
                      label="Name"
                      value={value}
                      onChangeText={(text) => onChange(text.trimStart())}
                      onBlur={() => {
                        onBlur();
                        const trimmed = value.trim();
                        if (trimmed !== value) {
                          onChange(trimmed);
                        }
                      }}
                      placeholder="Enter name"
                      autoFocus
                    />
                    {addTempPersonForm.formState.errors.name && (
                      <ThemedText
                        size="sm"
                        style={{ color: "#ef4444", marginTop: -12 }}
                      >
                        {addTempPersonForm.formState.errors.name.message}
                      </ThemedText>
                    )}
                  </>
                )}
              />
              <View className="flex-row gap-3">
                <Button
                  variant="secondary"
                  onPress={() => {
                    addTempPersonForm.reset({ name: "" });
                    addTempPersonSheetRef.current?.dismiss();
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={addTempPersonForm.handleSubmit(handleSaveTempPerson)}
                  style={{ flex: 1 }}
                >
                  Add
                </Button>
              </View>
            </View>
          </ScrollView>
        </TrueSheet>
      </FormProvider>
    </FormProvider>
  );
}
