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
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  type ViewStyle,
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
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { SwipeableTabView } from "@/components/swipeable-tab-view";
import { SymbolView } from "expo-symbols";
import { formatCurrency } from "@/utils/format";
import type React from "react";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const navigation = useNavigation();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

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

  const shareBottomSheetRef = useRef<React.ComponentRef<
    typeof BottomSheetModal
  > | null>(null);

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
      },
      {
        id: "2",
        merchant: "Starbucks",
        amount: 12.5,
        currency: "USD",
        date: "Yesterday",
        emoji: "☕",
        member: "Bob",
      },
      {
        id: "3",
        merchant: "Target",
        amount: 156.78,
        currency: "USD",
        date: "2 days ago",
        emoji: "🎯",
        member: "Charlie",
      },
      {
        id: "4",
        merchant: "Trader Joe's",
        amount: 45.2,
        currency: "USD",
        date: "3 days ago",
        emoji: "🛍️",
        member: "Alice",
      },
      {
        id: "5",
        merchant: "CVS Pharmacy",
        amount: 23.99,
        currency: "USD",
        date: "Last week",
        emoji: "💊",
        member: "Bob",
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
      return (
        <TouchableOpacity style={styles.receiptCard} activeOpacity={0.7}>
          <View style={styles.receiptEmoji}>
            <ThemedText size="lg">{receipt.emoji}</ThemedText>
          </View>
          <View style={styles.receiptInfo}>
            <View style={styles.receiptHeader}>
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
            <ThemedText
              size="sm"
              style={{ color: isDark ? Colors.dark.icon : Colors.light.icon }}
            >
              {receipt.member} • {receipt.date}
            </ThemedText>
          </View>
        </TouchableOpacity>
      );
    },
    [isDark]
  );

  const renderActivityItem = useCallback(
    ({ item: activity }: { item: ActivityItem }) => {
      return (
        <View
          style={[
            styles.activityCard,
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
          <View style={styles.activityEmoji}>
            <ThemedText size="lg">{activity.emoji}</ThemedText>
          </View>
          <View style={styles.activityInfo}>
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
            <ThemedText
              size="sm"
              style={[
                styles.activityTime,
                {
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                },
              ]}
            >
              {activity.time}
            </ThemedText>
          </View>
        </View>
      );
    },
    [isDark]
  );

  const renderBalanceItem = useCallback(
    ({ item: balance }: { item: BalanceItem }) => {
      return (
        <View
          style={[
            styles.balanceCard,
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
          <View
            style={[
              styles.balanceAvatar,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)",
              },
            ]}
          >
            <ThemedText size="base" weight="semibold">
              {balance.initials}
            </ThemedText>
          </View>
          <View style={styles.balanceInfo}>
            <ThemedText size="base" weight="semibold">
              {balance.member}
            </ThemedText>
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
          <View style={styles.balanceAmount}>
            {balance.status === "settled" ? (
              <View style={styles.settledBadge}>
                <SymbolView
                  name="checkmark.circle.fill"
                  tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                  size={20}
                />
              </View>
            ) : (
              <ThemedText
                weight="bold"
                size="lg"
                style={{
                  color: balance.status === "owed" ? "#34C759" : "#FF3B30",
                }}
              >
                {balance.status === "owed" ? "+" : "-"}
                {formatCurrency(Math.abs(balance.amount), balance.currency)}
              </ThemedText>
            )}
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
              contentContainerStyle={styles.scrollContent}
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    styles.separator,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    },
                  ]}
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
              contentContainerStyle={styles.scrollContent}
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    styles.separator,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    },
                  ]}
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
              contentContainerStyle={styles.scrollContent}
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    styles.separator,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    },
                  ]}
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
      onShare: handleShare,
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
  }, [
    navigation,
    group,
    iconUrl,
    colorScheme,
    handleHeaderPress,
    handleShare,
    isDark,
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

  if (!group) {
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
        <ThemedText size="lg" weight="semibold">
          Group not found
        </ThemedText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ThemedText size="base" style={{ color: Colors.light.tint }}>
            Go Back
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      backgroundColor: isDark
        ? Colors.dark.background
        : Colors.light.background,
    },
  ];

  return (
    <>
      <SwipeableTabView
        tabs={tabs}
        renderTabContent={renderTabContent}
        style={containerStyle}
      />
      <ShareBottomSheet group={group} bottomSheetRef={shareBottomSheetRef} />
    </>
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
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  receiptCard: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  receiptEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  receiptInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  activityCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  activityEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  activityInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  activityTime: {
    marginTop: 2,
    opacity: 0.7,
  },
  balanceCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  balanceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceInfo: {
    flex: 1,
    gap: 2,
  },
  balanceAmount: {
    alignItems: "flex-end",
  },
  settledBadge: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    opacity: 0.6,
    fontStyle: "italic",
  },
  placeholderText: {
    marginBottom: 16,
  },
  backButton: {
    marginTop: 16,
    padding: 12,
  },
  separator: {
    height: 1,
  },
});
