/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Split details bottom sheet with list of people in the split
 */

import { useMemo, useCallback, useRef, useState } from "react";
import { View, ScrollView, ActivityIndicator, TouchableOpacity, Pressable } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { formatCurrency } from "@/utils/format";
import { SplitStatus } from "@/utils/split";
import type { Friend as StorageFriend } from "@/utils/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { PersonAvatar } from "@/components/avatar";
import { useAuth } from "@/contexts/auth-context";
import { EmptyState } from "@/components/empty-state";
import { CircularProgress } from "@/components/circular-progress";
import { PersonSplitDetailsSheet } from "@/components/split/person-split-details-sheet";
import type React from "react";

function buildPeopleLookup(
  splitData: { people?: Record<string, string> },
  friends: StorageFriend[],
  currentUser?: { id: string; name: string } | null
): Record<string, string> {
  const map: Record<string, string> = { ...(splitData.people || {}) };

  if (currentUser) {
    map[currentUser.id] = "Me";
  }

  friends.forEach((friend) => {
    if (!map[friend.id]) {
      map[friend.id] = friend.name;
    }
  });

  return map;
}

interface SplitDetailsSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receiptId: string;
  currentUserId?: string | null;
  onEdit?: () => void;
}

export function SplitDetailsSheet({
  bottomSheetRef,
  receiptId,
  currentUserId,
  onEdit,
}: SplitDetailsSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: receipt, isLoading } = useReceipt(receiptId);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
  const personDetailsSheetRef = useRef<TrueSheet | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const lastPresentedPersonIdRef = useRef<string | null>(null);

  const splitData = receipt?.splitData;
  const isOwner = receipt?.ownerId && currentUserId && receipt.ownerId === currentUserId;

  const peopleLookup = useMemo(
    () => (splitData ? buildPeopleLookup(splitData, friends, user) : {}),
    [splitData, friends, user]
  );

  const progress = useMemo(() => {
    if (!splitData || !receipt || !splitData.totals) return 0;

    const totalOwed = Object.values(splitData.totals).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const settledAmount = Object.values(splitData.settledAmounts || {}).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const remaining = Math.max(0, totalOwed - settledAmount);
    return totalOwed > 0 ? 1 - remaining / totalOwed : 1;
  }, [splitData, receipt]);

  const remainingAmount = useMemo(() => {
    if (!splitData || !splitData.totals) return 0;
    const totalOwed = Object.values(splitData.totals).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const settledAmount = Object.values(splitData.settledAmounts || {}).reduce(
      (sum, amount) => sum + amount,
      0
    );
    return Math.max(0, totalOwed - settledAmount);
  }, [splitData]);

  const handleConfigureSplit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
    if (onEdit) {
      onEdit();
    } else {
      router.push({
        pathname: "/split",
        params: { receiptId },
      });
    }
  }, [receiptId, bottomSheetRef, onEdit]);

  const handleEditSplit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onEdit) {
      onEdit();
    } else {
      handleConfigureSplit();
    }
  }, [handleConfigureSplit, onEdit]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handlePersonPress = useCallback(
    (personId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedPersonId(personId);

      if (personId === lastPresentedPersonIdRef.current) {
        lastPresentedPersonIdRef.current = null;
        personDetailsSheetRef.current?.dismiss();
        requestAnimationFrame(() => {
          lastPresentedPersonIdRef.current = personId;
          personDetailsSheetRef.current?.present();
        });
      } else {
        lastPresentedPersonIdRef.current = personId;
        requestAnimationFrame(() => {
          personDetailsSheetRef.current?.present();
        });
      }
    },
    []
  );

  const handlePersonDetailsStatusChange = useCallback(() => {
    // Don't clear selectedPersonId - just let React Query refetch update the data
    // The sheet should stay open and show updated data
  }, []);

  const handlePersonDetailsDismiss = useCallback(() => {
    setSelectedPersonId(null);
    lastPresentedPersonIdRef.current = null;
  }, []);

  return (
    <TrueSheet
      ref={bottomSheetRef}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      detents={[1]}
      scrollable
    >
      <View className="flex-1">
        <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
          <ThemedText size="xl" weight="bold">
            Split Details
          </ThemedText>
          <View className="flex-row items-center gap-4">
            {splitData?.totals && isOwner && (
              <Button size="sm" variant="secondary" onPress={handleEditSplit}>Edit</Button>
            )}
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
        </View>

        {isLoading || isLoadingFriends ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator
              size="large"
              color={isDark ? Colors.dark.text : Colors.light.text}
            />
          </View>
        ) : !receipt ? (
          <View className="flex-1 justify-center items-center">
            <ThemedText>Receipt not found</ThemedText>
          </View>
        ) : !splitData || !splitData.totals || Object.keys(splitData.totals).length === 0 ? (
          <EmptyState
            icon="person.2.fill"
            title="No Split Configured"
            subtitle={
              isOwner
                ? "Set up how you want to split this receipt with your friends."
                : "The owner hasn't set up a split for this receipt yet."
            }
            action={
              isOwner ? (
                <Button variant="primary" onPress={handleEditSplit} fullWidth>
                  Configure Split
                </Button>
              ) : null
            }
          />
        ) : (
          <ScrollView
            contentContainerClassName="px-5 pt-4 pb-4 gap-4"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Progress Card */}
            <View
              className="rounded-[20px] p-5 border items-center gap-4"
              style={{
                backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
              }}
            >
              <CircularProgress
                progress={progress}
                size={100}
                strokeWidth={10}
                showLabel={true}
                label={`${Math.round(progress * 100)}%`}
              />
              <View className="items-center gap-1">
                <ThemedText size="sm" style={{ opacity: 0.7 }}>
                  Settled
                </ThemedText>
                {remainingAmount > 0 && (
                  <ThemedText size="base" weight="semibold">
                    {formatCurrency(remainingAmount, receipt.totals.currency)}{" "}
                    remaining
                  </ThemedText>
                )}
              </View>
            </View>

            {/* People List */}
            <View
              className={`rounded-3xl overflow-hidden border ${isDark ? "bg-[#1A1D1E] border-white/5" : "bg-white border-black/5"
                }`}
            >
              {Object.keys(splitData.totals).map((personId, index) => {
                const total = splitData.totals[personId] || 0;
                const status = splitData.statuses?.[personId] || SplitStatus.PENDING;
                const isSettled = status === SplitStatus.SETTLED;
                const isPartial = status === SplitStatus.PARTIAL;
                const personName = peopleLookup[personId] || "Unknown";

                const statusColor =
                  isSettled
                    ? "#10b981"
                    : isPartial
                      ? "#f59e0b"
                      : "#eab308";

                const statusLabel =
                  isSettled
                    ? "SETTLED"
                    : isPartial
                      ? "PARTIAL"
                      : "PENDING";

                const separatorColor =
                  colorScheme === "dark"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)";
                const pressedBg =
                  colorScheme === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.03)";

                return (
                  <View key={personId}>
                    {index > 0 && (
                      <View
                        className="h-[1px] mx-4"
                        style={{ backgroundColor: separatorColor }}
                      />
                    )}
                    <Pressable
                      cssInterop={false}
                      onPress={() => handlePersonPress(personId)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        backgroundColor: pressed ? pressedBg : "transparent",
                      })}
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <View className="relative">
                          <PersonAvatar
                            personId={personId}
                            name={personName}
                            friends={friends}
                            size={48}
                          />
                          <View
                            className="absolute bottom-0 right-0 w-5 h-5 rounded-full items-center justify-center border-2"
                            style={{
                              backgroundColor: statusColor,
                              borderColor: isDark
                                ? Colors.dark.surface
                                : "#FFFFFF",
                            }}
                          >
                            <SymbolView
                              name={isSettled ? "checkmark" : "clock"}
                              tintColor="#FFFFFF"
                              size={10}
                            />
                          </View>
                        </View>
                        <View className="flex-1">
                          <ThemedText size="base" weight="semibold">
                            {personName}
                          </ThemedText>
                          <View className="flex-row items-center gap-2 mt-1">
                            <View
                              className="px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: statusColor }}
                            >
                              <ThemedText
                                size="xs"
                                weight="semibold"
                                style={{ color: "#FFFFFF" }}
                              >
                                {statusLabel}
                              </ThemedText>
                            </View>
                          </View>
                          <ThemedText
                            size="sm"
                            className="mt-1"
                            style={{
                              color: isDark ? Colors.dark.icon : Colors.light.icon,
                            }}
                          >
                            {isSettled
                              ? `Paid ${formatCurrency(total, receipt.totals.currency)}`
                              : `Owes ${formatCurrency(total, receipt.totals.currency)}`}
                          </ThemedText>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Button
                          size="sm"
                          variant={isSettled ? "secondary" : "primary"}
                          onPress={() => handlePersonPress(personId)}
                        >
                          {isSettled ? "Details" : "Remind"}
                        </Button>
                        <SymbolView
                          name="chevron.down"
                          tintColor={
                            isDark ? Colors.dark.icon : Colors.light.icon
                          }
                          size={16}
                        />
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
      {receipt && (
        <PersonSplitDetailsSheet
          bottomSheetRef={personDetailsSheetRef}
          receiptId={receipt.id}
          personId={selectedPersonId || ""}
          currentUserId={currentUserId}
          onStatusChange={handlePersonDetailsStatusChange}
          onDismiss={handlePersonDetailsDismiss}
        />
      )}
    </TrueSheet>
  );
}
