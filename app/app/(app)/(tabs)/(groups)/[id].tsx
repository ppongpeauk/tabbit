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
import {
  getGroup,
  getPresignedUrl,
  getGroupReceipts,
  getGroupActivity,
  getGroupBalances,
  type Group,
  type GroupReceipt,
  type GroupActivity,
  type GroupBalance,
} from "@/utils/api";
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
  const [receipts, setReceipts] = useState<GroupReceipt[]>([]);
  const [activity, setActivity] = useState<GroupActivity[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);

  // Calculate bottom tab bar height
  // Native tabs are typically 49px on iPhone, plus safe area bottom
  const bottomTabBarHeight = useMemo(() => {
    const tabBarBaseHeight = Platform.OS === "ios" ? 49 : 56;
    return tabBarBaseHeight + insets.bottom;
  }, [insets.bottom]);

  const loadGroup = useCallback(async () => {
    if (!id) return;

    try {
      const [groupResult, receiptsResult, activityResult, balancesResult] =
        await Promise.all([
          getGroup(id),
          getGroupReceipts(id),
          getGroupActivity(id),
          getGroupBalances(id),
        ]);

      if (groupResult.success && groupResult.group) {
        setGroup(groupResult.group);

        if (groupResult.group.iconKey) {
          try {
            const urlResult = await getPresignedUrl(groupResult.group.iconKey);
            if (urlResult.success && urlResult.url) {
              setIconUrl(urlResult.url);
            }
          } catch (error) {
            console.error("Failed to load group icon:", error);
          }
        }
      }

      if (receiptsResult.success && receiptsResult.receipts) {
        setReceipts(receiptsResult.receipts);
      }

      if (activityResult.success && activityResult.activities) {
        setActivity(activityResult.activities);
      }

      if (balancesResult.success && balancesResult.balances) {
        setBalances(balancesResult.balances);
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
    router.push(`/camera?groupId=${id}`);
  }, [id]);

  const handleSettle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Navigate to settle screen
    console.log("Settle");
  }, []);

  const tabs = ["Receipts", "Activity", "Balances"];

  // Helper to format relative time
  const formatRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }, []);

  // Helper to get initials from name
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const renderReceiptItem = useCallback(
    ({ item: receipt }: { item: GroupReceipt }) => {
      const receiptData = receipt.receipt.data as any;
      const merchant = receiptData?.merchant?.name || "Unknown";
      const totals = receiptData?.totals;
      const amount = totals?.total || 0;
      const currency = totals?.currency || "USD";

      // For now, assume 0 paid - we'll add split tracking later
      const paidAmount = 0;
      const progress = 0;
      const progressPercentage = 0;
      const remainingBalance = amount;
      const isFullyPaid = false;

      return (
        <TouchableOpacity
          className="flex-row p-4 gap-3"
          activeOpacity={0.7}
          onPress={() => router.push(`/app/receipt/${receipt.receiptId}`)}
        >
          <View className="w-12 h-12 rounded-full items-center justify-center bg-black/5">
            <ThemedText size="lg">🧾</ThemedText>
          </View>
          <View className="flex-1 justify-center gap-1">
            <View className="flex-row justify-between items-center">
              <ThemedText weight="semibold" size="base">
                {merchant}
              </ThemedText>
              <ThemedText
                weight="bold"
                size="base"
                style={{
                  color: isDark ? Colors.dark.tint : Colors.light.tint,
                }}
              >
                {formatCurrency(amount, currency)}
              </ThemedText>
            </View>
            <View className="flex-row justify-between items-center">
              <ThemedText
                size="sm"
                style={{ color: isDark ? Colors.dark.icon : Colors.light.icon }}
              >
                {receipt.sharer.name || "Unknown"} • {formatRelativeTime(receipt.sharedAt)}
              </ThemedText>
              {!isFullyPaid && (
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  }}
                >
                  {formatCurrency(remainingBalance, currency)} left
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
    [isDark, formatRelativeTime]
  );

  const renderActivityItem = useCallback(
    ({ item: activityItem }: { item: GroupActivity }) => {
      return (
        <View className="flex-row p-4 gap-3">
          <View className="w-12 h-12 rounded-full items-center justify-center bg-black/5">
            <ThemedText size="lg">{activityItem.emoji}</ThemedText>
          </View>
          <View className="flex-1 justify-center gap-1">
            <View className="flex-row justify-between items-center">
              <ThemedText size="base">
                <ThemedText weight="semibold">{activityItem.userName}</ThemedText>{" "}
                {activityItem.action}
                {activityItem.detail && (
                  <>
                    {" "}
                    <ThemedText
                      style={{
                        color: isDark ? Colors.dark.icon : Colors.light.icon,
                      }}
                    >
                      {activityItem.detail}
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
                {formatRelativeTime(activityItem.createdAt)}
              </ThemedText>
            </View>
          </View>
        </View>
      );
    },
    [isDark, formatRelativeTime]
  );

  const renderBalanceItem = useCallback(
    ({ item: balance }: { item: GroupBalance }) => {
      return (
        <View className="flex-row p-4 gap-3">
          <View className="w-12 h-12 rounded-full items-center justify-center bg-black/5">
            <ThemedText size="base" weight="semibold">
              {getInitials(balance.userName)}
            </ThemedText>
          </View>
          <View className="flex-1 justify-center gap-1">
            <View className="flex-row justify-between items-center">
              <ThemedText size="base" weight="semibold">
                {balance.userName}
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
    [isDark, getInitials]
  );

  const renderTabContent = useCallback(
    (index: number) => {
      switch (index) {
        case 0:
          return (
            <FlashList
              data={receipts}
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
              ListEmptyComponent={
                <View className="p-8 items-center justify-center">
                  <ThemedText
                    size="base"
                    style={{ color: isDark ? Colors.dark.icon : Colors.light.icon }}
                  >
                    No receipts shared yet
                  </ThemedText>
                </View>
              }
            />
          );
        case 1:
          return (
            <FlashList
              data={activity}
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
              ListEmptyComponent={
                <View className="p-8 items-center justify-center">
                  <ThemedText
                    size="base"
                    style={{ color: isDark ? Colors.dark.icon : Colors.light.icon }}
                  >
                    No activity yet
                  </ThemedText>
                </View>
              }
            />
          );
        case 2:
          return (
            <FlashList
              data={balances}
              renderItem={renderBalanceItem}
              keyExtractor={(item, idx) => `${item.userId}-${idx}`}
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
              ListEmptyComponent={
                <View className="p-8 items-center justify-center">
                  <ThemedText
                    size="base"
                    style={{ color: isDark ? Colors.dark.icon : Colors.light.icon }}
                  >
                    No balances yet
                  </ThemedText>
                </View>
              }
            />
          );
        default:
          return null;
      }
    },
    [
      receipts,
      activity,
      balances,
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
    <View className="flex-1" style={{
      backgroundColor: isDark
        ? Colors.dark.background
        : Colors.light.background,
    }}>
      <SwipeableTabView tabs={tabs} renderTabContent={renderTabContent} />
      <ShareBottomSheet group={group} bottomSheetRef={shareBottomSheetRef} />
      <Toolbar bottom={16}>
        <ToolbarButton
          onPress={handleScanReceipt}
          icon="camera.fill"
          label="Scan"
          variant="glass"
        />
        <ToolbarButton
          onPress={() => router.push(`/create-manual?groupId=${id}`)}
          icon="text.cursor"
          variant="glass"
        />
        <ToolbarButton
          onPress={handleSettle}
          icon="checkmark.circle.fill"
          label="Settle Up"
          variant="glass"
        />
      </Toolbar>
    </View>
  );
}

