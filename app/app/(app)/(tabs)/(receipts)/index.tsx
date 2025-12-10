import { useCallback, useMemo } from "react";
import { ThemedText } from "@/components/themed-text";
import {
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
  type SectionListRenderItemInfo,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReceipts } from "@/hooks/use-receipts";
import type { StoredReceipt } from "@/utils/storage";
import { formatCurrency, formatReceiptDateTime } from "@/utils/format";
import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReceiptSection {
  title: string;
  data: StoredReceipt[];
}

const SECTION_ORDER = [
  "Today",
  "Yesterday",
  "Last Week",
  "Last Month",
] as const;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 30;

/**
 * Get the section title for a receipt based on its timestamp
 */
function getSectionTitle(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const receiptDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffTime = today.getTime() - receiptDate.getTime();
  const diffDays = Math.ceil(diffTime / MILLISECONDS_PER_DAY);

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays <= DAYS_IN_WEEK) {
    return "Last Week";
  } else if (diffDays <= DAYS_IN_MONTH) {
    return "Last Month";
  } else {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  }
}

/**
 * ReceiptsScreen component - displays receipts grouped by date sections
 */
export default function ReceiptsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  // Use React Query hook
  const { data: receipts = [], refetch, isRefetching } = useReceipts();

  // Calculate bottom tab bar height
  const bottomTabBarHeight = useMemo(() => {
    const tabBarBaseHeight = Platform.OS === "ios" ? 49 : 56;
    return tabBarBaseHeight + insets.bottom;
  }, [insets.bottom]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const refreshing = isRefetching;

  const handleScanReceipt = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/camera");
  }, []);

  const handleManualEntry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/create-manual");
  }, []);

  const sections = useMemo<ReceiptSection[]>(() => {
    const grouped = new Map<string, StoredReceipt[]>();

    // Group receipts by section title
    receipts.forEach((receipt) => {
      const sectionTitle = getSectionTitle(receipt.transaction.datetime);
      if (!grouped.has(sectionTitle)) {
        grouped.set(sectionTitle, []);
      }
      grouped.get(sectionTitle)!.push(receipt);
    });

    const sortedSections: ReceiptSection[] = [];

    // Add ordered sections first (Today, Yesterday, Last Week, Last Month)
    SECTION_ORDER.forEach((title) => {
      if (grouped.has(title)) {
        sortedSections.push({
          title,
          data: grouped.get(title)!,
        });
        grouped.delete(title);
      }
    });

    // Add remaining sections (months) sorted by date (newest first)
    const remainingSections: ReceiptSection[] = Array.from(grouped.entries())
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => {
        const dateA = new Date(a.data[0]?.transaction.datetime || 0);
        const dateB = new Date(b.data[0]?.transaction.datetime || 0);
        return dateB.getTime() - dateA.getTime();
      });

    return [...sortedSections, ...remainingSections];
  }, [receipts]);

  const getReceiptDisplayInfo = (item: StoredReceipt) => {
    const receiptEmoji = item.appData?.emoji || "🧾";
    const hasCustomTitle = item.name && item.name !== item.merchant.name;
    const displayTitle = hasCustomTitle ? item.name : item.merchant.name;
    return { receiptEmoji, hasCustomTitle, displayTitle };
  };

  const renderReceiptItem = ({
    item,
    section,
  }: SectionListRenderItemInfo<StoredReceipt, ReceiptSection>) => {
    const { receiptEmoji, hasCustomTitle, displayTitle } =
      getReceiptDisplayInfo(item);
    const isToday = section.title === "Today";

    const handlePress = () => {
      router.push(`/(app)/receipt/${item.id}`);
    };

    return (
      <TouchableOpacity
        style={styles.receiptItem}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View
          style={[
            styles.receiptEmoji,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
            },
          ]}
        >
          <ThemedText
            size="lg"
            style={{ color: isDark ? Colors.dark.text : Colors.light.text }}
          >
            {receiptEmoji}
          </ThemedText>
        </View>
        <View style={styles.receiptInfo}>
          <View style={styles.receiptHeader}>
            <ThemedText weight="semibold" size="base">
              {displayTitle}
            </ThemedText>
            <ThemedText
              weight="bold"
              size="base"
              style={{
                color: isDark ? Colors.dark.tint : Colors.light.tint,
              }}
            >
              {formatCurrency(item.totals.total, item.totals.currency)}
            </ThemedText>
          </View>
          <View style={styles.receiptMetaRow}>
            <ThemedText
              size="sm"
              style={{ color: isDark ? Colors.dark.icon : Colors.light.icon }}
            >
              {formatReceiptDateTime(item.transaction.datetime, isToday)}
            </ThemedText>
            {hasCustomTitle && (
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                {item.merchant.name}
              </ThemedText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListRenderItemInfo<
      StoredReceipt,
      ReceiptSection
    >["section"];
  }) => {
    return (
      <View style={styles.sectionHeader}>
        <ThemedText
          weight="semibold"
          family="sans"
          size="sm"
          style={styles.sectionHeaderText}
        >
          {section.title}
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        sections={sections}
        renderItem={renderReceiptItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={[
          styles.list,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No receipts yet. Tap the camera icon to scan your first receipt!
            </ThemedText>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickySectionHeadersEnabled={false}
      />
      {/* Toolbar above bottom tab bar */}
      <View
        style={[
          styles.toolbarContainer,
          {
            bottom: bottomTabBarHeight + 8,
          },
        ]}
      >
        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={handleScanReceipt}
            activeOpacity={0.7}
            style={styles.toolbarButton}
          >
            <GlassView
              style={[
                styles.glassButton,
                {
                  backgroundColor:
                    Platform.OS === "ios"
                      ? isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(255, 255, 255, 0.7)"
                      : isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(255, 255, 255, 0.8)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <SymbolView
                name="camera.fill"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
                size={24}
              />
              <ThemedText
                size="base"
                weight="semibold"
                style={[
                  styles.toolbarButtonLabel,
                  {
                    color: isDark ? Colors.dark.text : Colors.light.text,
                  },
                ]}
              >
                Scan
              </ThemedText>
            </GlassView>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleManualEntry}
            activeOpacity={0.7}
            style={{
              aspectRatio: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GlassView
              style={[
                styles.glassButton,
                {
                  backgroundColor:
                    Platform.OS === "ios"
                      ? isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(255, 255, 255, 0.7)"
                      : isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(255, 255, 255, 0.8)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <SymbolView
                name="pencil.and.list.clipboard"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
                size={24}
              />
            </GlassView>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    height: "auto",
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionHeaderText: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  receiptItem: {
    flexDirection: "row",
    paddingVertical: 16,
    gap: 12,
  },
  receiptEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
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
  receiptMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.7,
    fontSize: 16,
  },
  toolbarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  toolbar: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  toolbarButton: {
    flex: 1,
  },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    gap: 8,
    borderWidth: Platform.OS === "ios" ? 0 : 1,
  },
  toolbarButtonLabel: {},
});
