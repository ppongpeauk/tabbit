import { useCallback, useMemo } from "react";
import { ThemedText } from "@/components/themed-text";
import {
  Pressable,
  View,
  Image,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { StoredReceipt } from "@/utils/storage";
import { isCollaborator } from "@/utils/storage";
import { formatCurrency, formatReceiptDateTime } from "@/utils/format";
import * as Haptics from "expo-haptics";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { SymbolView } from "expo-symbols";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import moment from "moment";

interface ReceiptRowProps {
  receipt: StoredReceipt;
  isFirstInSection: boolean;
  isLastInSection: boolean;
  sectionTitle: string;
  currentUserId?: string | null;
  onDelete: (id: string, closeSwipeable: () => void) => void;
}

/**
 * Get the return date display text and styling info
 */
function getReturnDateInfo(returnByDate?: string): {
  text: string | null;
  daysRemaining: number | null;
  isUrgent: boolean;
} | null {
  if (!returnByDate) {
    return null;
  }

  const returnDate = moment(returnByDate);
  if (!returnDate.isValid()) {
    return null;
  }

  const now = moment();
  const daysRemaining = returnDate.diff(now, "days");

  // Only show if less than 14 days
  if (daysRemaining >= 14) {
    return null;
  }

  const isUrgent = daysRemaining < 7;
  const text =
    daysRemaining < 0
      ? "Return period passed"
      : daysRemaining === 0
        ? "Return by today"
        : daysRemaining === 1
          ? "in 1 day"
          : `in ${daysRemaining} days`;

  return {
    text,
    daysRemaining,
    isUrgent,
  };
}

function ReceiptSourceIcons({ receipt }: { receipt: StoredReceipt }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const iconSize = 14;

  const isCollaborative = !!receipt.splitData;

  if (!isCollaborative) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-1.5 ml-2">
      {Platform.OS === "ios" ? (
        <SymbolView
          name="person.2.fill"
          tintColor={iconColor}
          style={{ width: iconSize, height: iconSize }}
        />
      ) : (
        <MaterialIcons
          name="people"
          size={iconSize}
          color={iconColor}
        />
      )}
    </View>
  );
}

export function ReceiptRow({
  receipt,
  isFirstInSection,
  isLastInSection,
  sectionTitle,
  currentUserId,
  onDelete,
}: ReceiptRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isToday = sectionTitle === "Today";
  const isCollaboratorValue = isCollaborator(receipt, currentUserId);

  const separatorColor =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";
  const rowBaseBg = isDark ? Colors.dark.surface : Colors.light.surface;
  const pressedBg =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(0, 0, 0, 0.03)";
  const merchantLogo = receipt.merchant.logo;

  const hasCustomTitle = receipt.name && receipt.name !== receipt.merchant.name;
  const displayTitle = hasCustomTitle ? receipt.name : receipt.merchant.name;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(app)/receipt/${receipt.id}`);
  }, [receipt.id]);

  const returnDateInfo = getReturnDateInfo(receipt.returnInfo?.returnByDate);

  // Calculate split settlement progress
  const splitSettlementInfo = useMemo(() => {
    if (!receipt.splitData || !receipt.splitData.totals) return null;

    const totalOwed = Object.values(receipt.splitData.totals).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const settledAmount = Object.values(
      receipt.splitData.settledAmounts || {}
    ).reduce((sum, amount) => sum + amount, 0);
    const remaining = Math.max(0, totalOwed - settledAmount);
    const progress = totalOwed > 0 ? settledAmount / totalOwed : 1;

    return {
      remaining,
      progress,
      totalOwed,
    };
  }, [receipt.splitData]);

  return (
    <View>
      {!isFirstInSection && (
        <View
          className="h-[1px] mx-4"
          style={{ backgroundColor: separatorColor }}
        />
      )}
      <ReanimatedSwipeable
        rightThreshold={48}
        friction={2}
        overshootRight={false}
        childrenContainerStyle={{ backgroundColor: rowBaseBg }}
        renderRightActions={isCollaboratorValue ? (_, __, swipeableMethods) => (
          <View
            className="h-full justify-center items-center"
            style={{
              backgroundColor: "#EF4444",
            }}
          >
            <Pressable
              cssInterop={false}
              className="h-full w-full justify-center items-center px-4"
              onPress={() => onDelete(receipt.id, swipeableMethods.close)}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? "rgba(0, 0, 0, 0.15)"
                  : "transparent",
              })}
            >
              <ThemedText weight="bold" size="sm" lightColor="#fff">
                Delete
              </ThemedText>
            </Pressable>
          </View>
        ) : undefined}
      >
        <Pressable
          cssInterop={false}
          onPress={handlePress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 16,
            paddingHorizontal: 16,
            backgroundColor: pressed ? pressedBg : rowBaseBg,
          })}
        >
          <View className="flex-row items-start gap-3 flex-1">
            {merchantLogo ? (
              <Image
                source={{ uri: merchantLogo }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.05)",
                }}
                resizeMode="contain"
              />
            ) : null}
            <View className="flex-1 justify-center gap-1">
              <View className="flex-row justify-between items-center">
                <ThemedText weight="semibold" size="base">
                  {displayTitle}
                </ThemedText>
                <ThemedText
                  weight="bold"
                  size="base"
                  lightColor={Colors.light.tint}
                  darkColor={Colors.dark.tint}
                >
                  {formatCurrency(receipt.totals.total, receipt.totals.currency)}
                </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  {displayTitle !== receipt.merchant.name && (
                    <ThemedText
                      size="sm"
                      lightColor={Colors.light.icon}
                      darkColor={Colors.dark.icon}
                    >
                      {receipt.merchant.name}
                    </ThemedText>
                  )}
                </View>
                <View className="flex-row items-center">
                  <ThemedText
                    size="sm"
                    lightColor={Colors.light.icon}
                    darkColor={Colors.dark.icon}
                  >
                    {formatReceiptDateTime(receipt.transaction.datetime, isToday)}
                  </ThemedText>
                  <ReceiptSourceIcons receipt={receipt} />
                </View>
              </View>
              {returnDateInfo && (
                <View className="flex-row items-center gap-1.5 mt-0.5">
                  {Platform.OS === "ios" ? (
                    <SymbolView
                      name={
                        returnDateInfo.isUrgent
                          ? "exclamationmark.triangle.fill"
                          : "arrow.uturn.backward"
                      }
                      tintColor={
                        returnDateInfo.isUrgent
                          ? "#F97316"
                          : isDark
                            ? Colors.dark.icon
                            : Colors.light.icon
                      }
                      style={{ width: 12, height: 12 }}
                    />
                  ) : (
                    <MaterialIcons
                      name={returnDateInfo.isUrgent ? "warning" : "undo"}
                      size={12}
                      color={
                        returnDateInfo.isUrgent
                          ? "#F97316"
                          : isDark
                            ? Colors.dark.icon
                            : Colors.light.icon
                      }
                    />
                  )}
                  <ThemedText
                    size="sm"
                    lightColor={
                      returnDateInfo.isUrgent
                        ? "#F97316"
                        : Colors.light.icon
                    }
                    darkColor={
                      returnDateInfo.isUrgent
                        ? "#F97316"
                        : Colors.dark.icon
                    }
                  >
                    {returnDateInfo.text}
                  </ThemedText>
                </View>
              )}
              {splitSettlementInfo && (
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <ThemedText
                      size="sm"
                      lightColor={Colors.light.icon}
                      darkColor={Colors.dark.icon}
                    >
                      {formatCurrency(
                        splitSettlementInfo.remaining,
                        receipt.totals.currency
                      )}{" "}
                      left to settle up
                    </ThemedText>
                  </View>
                  <View
                    className="h-1 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${splitSettlementInfo.progress * 100}%`,
                        backgroundColor: isDark
                          ? Colors.dark.tint
                          : Colors.light.tint,
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}
