/**
 * @author Composer
 * @description Group detail/dashboard screen
 */

import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useMemo,
} from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  useLocalSearchParams,
  router,
  useFocusEffect,
  useNavigation,
} from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { getGroup, getPresignedUrl, type Group } from "@/utils/api";
import { GroupHeader, ShareBottomSheet } from "@/components/group-detail";
import * as Haptics from "expo-haptics";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { SwipeableTabView } from "@/components/swipeable-tab-view";
import { SymbolView } from "expo-symbols";
import { formatCurrency } from "@/utils/format";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type React from "react";
import { ToolbarButton } from "@/components/toolbar/toolbar-button";
import { Toolbar } from "@/components/toolbar";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  // Calculate bottom tab bar height
  // Native tabs are typically 49px on iPhone, plus safe area bottom
  const bottomTabBarHeight = useMemo(() => {
    const tabBarBaseHeight = Platform.OS === "ios" ? 49 : 56;
    return tabBarBaseHeight + insets.bottom;
  }, [insets.bottom]);

  const loadGroup = useCallback(async () => {
    if (!id) return;

    try {
      const result = await getGroup(id);
      if (result.success && result.group) {
        setGroup(result.group);

        if (result.group.iconKey) {
          try {
            const urlResult = await getPresignedUrl(result.group.iconKey);
            if (urlResult.success && urlResult.url) {
              setIconUrl(urlResult.url);
            }
          } catch (error) {
            console.error("Failed to load group icon:", error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load group:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  useFocusEffect(
    useCallback(() => {
      loadGroup();
    }, [loadGroup])
  );

  const shareBottomSheetRef = useRef<TrueSheet>(null);

  const handleHeaderPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const params = new URLSearchParams();
    if (group?.name) {
      params.set("title", group.name);
    }
    if (group?.members) {
      params.set("memberCount", group.members.length.toString());
    }
    const queryString = params.toString();
    const paramString = queryString ? `?${queryString}` : "";
    router.push(`/(app)/(tabs)/(groups)/${id}/details${paramString}`);
  }, [id, group?.name, group?.members]);

  const handleShare = useCallback(() => {
    shareBottomSheetRef.current?.present();
  }, []);

  const handleScanReceipt = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/camera");
  }, []);

  const handleSettle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Navigate to settle screen
    console.log("Settle");
  }, []);

  const tabs = ["Receipts", "Activity", "Balances"];

  // Placeholder data types
  type ReceiptItem = {
    id: string;
    merchant: string;
    amount: number;
    currency: string;
    date: string;
    emoji: string;
    member: string;
    paidAmount: number;
  };

  type ActivityItem = {
    id: string;
    type: string;
    member: string;
    action: string;
    detail: string;
    time: string;
    emoji: string;
  };

  type BalanceItem = {
    member: string;
    amount: number;
    currency: string;
    status: string;
    initials: string;
  };

  const placeholderReceipts = useMemo<ReceiptItem[]>(
    () => [
      {
        id: "1",
        merchant: "Whole Foods Market",
        amount: 87.43,
        currency: "USD",
        date: "2 hours ago",
        emoji: "🛒",
        member: "Alice",
        paidAmount: 65.57,
      },
      {
        id: "2",
        merchant: "Starbucks",
        amount: 12.5,
        currency: "USD",
        date: "Yesterday",
        emoji: "☕",
        member: "Bob",
        paidAmount: 12.5,
      },
      {
        id: "3",
        merchant: "Target",
        amount: 156.78,
        currency: "USD",
        date: "2 days ago",
        emoji: "🎯",
        member: "Charlie",
        paidAmount: 78.39,
      },
      {
        id: "4",
        merchant: "Trader Joe's",
        amount: 45.2,
        currency: "USD",
        date: "3 days ago",
        emoji: "🛍️",
        member: "Alice",
        paidAmount: 0,
      },
      {
        id: "5",
        merchant: "CVS Pharmacy",
        amount: 23.99,
        currency: "USD",
        date: "Last week",
        emoji: "💊",
        member: "Bob",
        paidAmount: 15.5,
      },
    ],
    []
  );

  const placeholderActivity = useMemo<ActivityItem[]>(
    () => [
      {
        id: "1",
        type: "receipt_added",
        member: "Alice",
        action: "added a receipt",
        detail: "Whole Foods Market - $87.43",
        time: "2 hours ago",
        emoji: "🧾",
      },
      {
        id: "2",
        type: "member_joined",
        member: "David",
        action: "joined the group",
        detail: "",
        time: "5 hours ago",
        emoji: "👋",
      },
      {
        id: "3",
        type: "receipt_added",
        member: "Bob",
        action: "added a receipt",
        detail: "Starbucks - $12.50",
        time: "Yesterday",
        emoji: "🧾",
      },
      {
        id: "4",
        type: "payment_settled",
        member: "Charlie",
        action: "settled payment",
        detail: "$45.20 to Alice",
        time: "2 days ago",
        emoji: "✅",
      },
      {
        id: "5",
        type: "receipt_added",
        member: "Charlie",
        action: "added a receipt",
        detail: "Target - $156.78",
        time: "2 days ago",
        emoji: "🧾",
      },
      {
        id: "6",
        type: "group_updated",
        member: "Alice",
        action: "updated group settings",
        detail: "",
        time: "3 days ago",
        emoji: "⚙️",
      },
    ],
    []
  );

  const placeholderBalances = useMemo<BalanceItem[]>(
    () => [
      {
        member: "Alice",
        amount: 45.2,
        currency: "USD",
        status: "owed",
        initials: "AL",
      },
      {
        member: "Bob",
        amount: 12.5,
        currency: "USD",
        status: "owes",
        initials: "BO",
      },
      {
        member: "Charlie",
        amount: 78.39,
        currency: "USD",
        status: "owes",
        initials: "CH",
      },
      {
        member: "David",
        amount: 0,
        currency: "USD",
        status: "settled",
        initials: "DA",
      },
    ],
    []
  );

  const renderReceiptItem = useCallback(
    ({ item: receipt }: { item: ReceiptItem }) => {
      const progress = Math.min(receipt.paidAmount / receipt.amount, 1);
      const progressPercentage = Math.round(progress * 100);
      const remainingBalance = Math.max(0, receipt.amount - receipt.paidAmount);
      const isFullyPaid = remainingBalance <= 0.01;

      return (
        <TouchableOpacity className="flex-row p-4 gap-3" activeOpacity={0.7}>
          <View className="w-12 h-12 rounded-full items-center justify-center bg-black/5">
            <ThemedText size="lg">{receipt.emoji}</ThemedText>
          </View>
          <View className="flex-1 justify-center gap-1">
            <View className="flex-row justify-between items-center">
              <ThemedText weight="semibold" size="base">
                {receipt.merchant}
              </ThemedText>
              <ThemedText
                weight="bold"
                size="base"
                style={{
                  color: isDark ? Colors.dark.tint : Colors.light.tint,
                }}
              >
                {formatCurrency(receipt.amount, receipt.currency)}
              </ThemedText>
            </View>
            <View className="flex-row justify-between items-center">
              <ThemedText
                size="sm"
                style={{ color: isDark ? Colors.dark.icon : Colors.light.icon }}
              >
                {receipt.member} • {receipt.date}
              </ThemedText>
              {!isFullyPaid && (
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  }}
                >
                  {formatCurrency(remainingBalance, receipt.currency)} left
                </ThemedText>
              )}
            </View>
            <View className="mt-2">
              <View
                className="h-[3px] rounded-full overflow-hidden"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: isDark
                      ? Colors.dark.tint
                      : Colors.light.tint,
                  }}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [isDark]
  );

  const renderActivityItem = useCallback(
    ({ item: activity }: { item: ActivityItem }) => {
      return (
        <View className="flex-row p-4 gap-3">
          <View className="w-12 h-12 rounded-full items-center justify-center bg-black/5">
            <ThemedText size="lg">{activity.emoji}</ThemedText>
          </View>
          <View className="flex-1 justify-center gap-1">
            <View className="flex-row justify-between items-center">
              <ThemedText size="base">
                <ThemedText weight="semibold">{activity.member}</ThemedText>{" "}
                {activity.action}
                {activity.detail && (
                  <>
                    {" "}
                    <ThemedText
                      style={{
                        color: isDark ? Colors.dark.icon : Colors.light.icon,
                      }}
                    >
                      {activity.detail}
                    </ThemedText>
                  </>
                )}
              </ThemedText>
            </View>
            <View className="flex-row justify-between items-center">
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                {activity.time}
              </ThemedText>
            </View>
          </View>
        </View>
      );
    },
    [isDark]
  );

  const renderBalanceItem = useCallback(
    ({ item: balance }: { item: BalanceItem }) => {
      return (
        <View className="flex-row p-4 gap-3">
          <View className="w-12 h-12 rounded-full items-center justify-center bg-black/5">
            <ThemedText size="base" weight="semibold">
              {balance.initials}
            </ThemedText>
          </View>
          <View className="flex-1 justify-center gap-1">
            <View className="flex-row justify-between items-center">
              <ThemedText size="base" weight="semibold">
                {balance.member}
              </ThemedText>
              <View className="items-end">
                {balance.status === "settled" ? (
                  <View className="w-8 h-8 items-center justify-center">
                    <SymbolView
                      name="checkmark.circle.fill"
                      tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                      size={20}
                    />
                  </View>
                ) : (
                  <ThemedText
                    weight="bold"
                    size="base"
                    style={{
                      color: isDark ? Colors.dark.tint : Colors.light.tint,
                    }}
                  >
                    {balance.status === "owed" ? "+" : "-"}
                    {formatCurrency(Math.abs(balance.amount), balance.currency)}
                  </ThemedText>
                )}
              </View>
            </View>
            <View className="flex-row justify-between items-center">
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                {balance.status === "owed"
                  ? "is owed"
                  : balance.status === "owes"
                    ? "owes"
                    : "settled up"}
              </ThemedText>
            </View>
          </View>
        </View>
      );
    },
    [isDark]
  );

  const renderTabContent = useCallback(
    (index: number) => {
      switch (index) {
        case 0:
          return (
            <FlashList
              data={placeholderReceipts}
              renderItem={renderReceiptItem}
              keyExtractor={(item) => item.id}
              contentContainerClassName="pb-4"
              ItemSeparatorComponent={() => (
                <View
                  className="h-[1px]"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  }}
                />
              )}
            />
          );
        case 1:
          return (
            <FlashList
              data={placeholderActivity}
              renderItem={renderActivityItem}
              keyExtractor={(item) => item.id}
              contentContainerClassName="pb-4"
              ItemSeparatorComponent={() => (
                <View
                  className="h-[1px]"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  }}
                />
              )}
            />
          );
        case 2:
          return (
            <FlashList
              data={placeholderBalances}
              renderItem={renderBalanceItem}
              keyExtractor={(item, idx) => `${item.member}-${idx}`}
              contentContainerClassName="pb-4"
              ItemSeparatorComponent={() => (
                <View
                  className="h-[1px]"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  }}
                />
              )}
            />
          );
        default:
          return null;
      }
    },
    [
      placeholderReceipts,
      placeholderActivity,
      placeholderBalances,
      renderReceiptItem,
      renderActivityItem,
      renderBalanceItem,
      isDark,
    ]
  );

  useLayoutEffect(() => {
    const headerOptions = GroupHeader({
      group,
      iconUrl,
      colorScheme: colorScheme || "light",
      onPress: handleHeaderPress,
    });

    navigation.setOptions({
      ...headerOptions,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      },
    });
  }, [navigation, group, iconUrl, colorScheme, handleHeaderPress, isDark]);

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

  if (!group) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
      >
        <ThemedText size="lg" weight="semibold">
          Group not found
        </ThemedText>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-3">
          <ThemedText size="base" style={{ color: Colors.light.tint }}>
            Go Back
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <SwipeableTabView tabs={tabs} renderTabContent={renderTabContent} />
      <ShareBottomSheet group={group} bottomSheetRef={shareBottomSheetRef} />
      <Toolbar bottom={bottomTabBarHeight + 8}>
        <ToolbarButton
          onPress={handleScanReceipt}
          icon="camera.fill"
          label="Scan"
          variant="glass"
        />
        <ToolbarButton
          onPress={handleSettle}
          icon="checkmark.circle.fill"
          label="Settle Up"
          variant="glass"
        />
        <ToolbarButton
          onPress={() => router.push("/camera?mode=manual")}
          icon="pencil.and.list.clipboard"
          variant="glass"
        />
      </Toolbar>
    </>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)
