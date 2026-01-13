import { useCallback, useMemo } from "react";
import { ThemedText } from "@/components/themed-text";
import {
  SectionList,
  Pressable,
  View,
  RefreshControl,
  type SectionListRenderItemInfo,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReceipts } from "@/hooks/use-receipts";
import type { StoredReceipt } from "@/utils/storage";
import { formatCurrency, formatReceiptDateTime } from "@/utils/format";
import * as Haptics from "expo-haptics";
import { Toolbar, ToolbarButton } from "@/components/toolbar";
import moment from "moment";

interface ReceiptSection {
  title: string;
  data: StoredReceipt[];
}

interface SectionItem {
  type: "section";
  section: ReceiptSection;
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

  // Validate date - check if it's a valid date
  if (isNaN(date.getTime())) {
    return "Unknown Date";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const receiptDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  // Validate receiptDate as well
  if (isNaN(receiptDate.getTime())) {
    return "Unknown Date";
  }

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
    try {
      // If the current year is different, include the year
      if (date.getFullYear() !== now.getFullYear()) {
        return moment(date).format("MMMM YYYY");
      } else {
        return moment(date).format("MMMM");
      }
    } catch {
      // Fallback if formatting fails
      return "Unknown Date";
    }
  }
}

/**
 * ReceiptsScreen component - displays receipts grouped by date sections
 */
export default function ReceiptsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Use React Query hook
  const { data: receipts = [], refetch, isRefetching } = useReceipts();

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
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeB - timeA;
      });

    return [...sortedSections, ...remainingSections];
  }, [receipts]);

  const sectionListData = useMemo<
    { title: string; data: SectionItem[] }[]
  >(() => {
    return sections.map((section) => ({
      title: section.title,
      data: [{ type: "section" as const, section }],
    }));
  }, [sections]);

  const getReceiptDisplayInfo = (item: StoredReceipt) => {
    const hasCustomTitle = item.name && item.name !== item.merchant.name;
    const displayTitle = hasCustomTitle ? item.name : item.merchant.name;
    return { hasCustomTitle, displayTitle };
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
      <View className="px-1 pt-0 mb-1">
        <ThemedText className="text-[13px] font-semibold uppercase tracking-widest opacity-60">
          {section.title}
        </ThemedText>
      </View>
    );
  };

  const renderSectionContainer = (section: ReceiptSection) => {
    return (
      <View
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(255, 255, 255, 1)",
          borderWidth: colorScheme === "light" ? 1 : 0,
          borderColor:
            colorScheme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
        }}
      >
        {section.data.map((item, index) => {
          const { hasCustomTitle, displayTitle } = getReceiptDisplayInfo(item);
          const isToday = section.title === "Today";
          const separatorColor =
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)";
          const pressedBg =
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.03)";

          const handlePress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/(app)/receipt/${item.id}`);
          };

          return (
            <View key={item.id}>
              {index > 0 && (
                <View
                  className="h-[1px] mx-4"
                  style={{ backgroundColor: separatorColor }}
                />
              )}
              <Pressable
                cssInterop={false}
                onPress={handlePress}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  backgroundColor: pressed ? pressedBg : "transparent",
                })}
              >
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
                      {formatCurrency(item.totals.total, item.totals.currency)}
                    </ThemedText>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <ThemedText
                      size="sm"
                      lightColor={Colors.light.icon}
                      darkColor={Colors.dark.icon}
                    >
                      {formatReceiptDateTime(
                        item.transaction.datetime,
                        isToday
                      )}
                    </ThemedText>
                    {hasCustomTitle && (
                      <ThemedText
                        size="sm"
                        lightColor={Colors.light.icon}
                        darkColor={Colors.dark.icon}
                      >
                        {item.merchant.name}
                      </ThemedText>
                    )}
                  </View>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSectionFooter = () => <View className="h-8" />;

  const renderSectionItem = ({
    item,
  }: {
    item: SectionItem;
    index: number;
    section: { title: string; data: SectionItem[] };
  }) => {
    if (item.type === "section") {
      return (
        <View key={item.section.title || "default"}>
          {renderSectionContainer(item.section)}
        </View>
      );
    }
    return null;
  };

  return (
    <View className="flex-1">
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        sections={sectionListData}
        renderItem={renderSectionItem}
        renderSectionHeader={({ section }) => {
          const originalSection =
            section.data[0]?.type === "section"
              ? section.data[0].section
              : null;
          return (
            <View className="mb-1">
              {originalSection &&
                renderSectionHeader({ section: originalSection })}
            </View>
          );
        }}
        renderSectionFooter={renderSectionFooter}
        keyExtractor={(item, index) => {
          if (item.type === "section") {
            return `section-${item.section.title || index}`;
          }
          return `item-${index}`;
        }}
        contentContainerClassName="px-5 pt-5 pb-[100px]"
        className="flex-1"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
        ListEmptyComponent={
          <View className="justify-center items-center px-8 py-4 flex-1">
            <ThemedText
              style={{
                textAlign: "center",
                opacity: 0.7,
                fontSize: 16,
              }}
            >
              No receipts yet. Tap the camera icon to scan your first receipt!
            </ThemedText>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={null}
      />
      <Toolbar bottom={16}>
        <ToolbarButton
          onPress={handleScanReceipt}
          icon="camera.fill"
          label="Scan"
          variant="glass"
        />
        <ToolbarButton
          onPress={handleManualEntry}
          icon="text.cursor"
          variant="glass"
        />
      </Toolbar>
    </View>
  );
}
