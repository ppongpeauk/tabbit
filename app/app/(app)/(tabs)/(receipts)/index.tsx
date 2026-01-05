import { useCallback, useMemo } from "react";
import { ThemedText } from "@/components/themed-text";
import {
  SectionList,
  TouchableOpacity,
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
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Toolbar, ToolbarButton } from "@/components/toolbar";

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
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      }).format(date);
    } catch (error) {
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

  const getReceiptDisplayInfo = (item: StoredReceipt) => {
    const hasCustomTitle = item.name && item.name !== item.merchant.name;
    const displayTitle = hasCustomTitle ? item.name : item.merchant.name;
    return { hasCustomTitle, displayTitle };
  };

  const renderReceiptItem = ({
    item,
    section,
  }: SectionListRenderItemInfo<StoredReceipt, ReceiptSection>) => {
    const { hasCustomTitle, displayTitle } = getReceiptDisplayInfo(item);
    const isToday = section.title === "Today";

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(app)/receipt/${item.id}`);
    };

    return (
      <TouchableOpacity
        className="flex-row py-2 gap-3"
        activeOpacity={0.7}
        onPress={handlePress}
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
              {formatReceiptDateTime(item.transaction.datetime, isToday)}
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
      <View className="py-3 pt-5 pb-1">
        <ThemedText
          weight="semibold"
          family="sans"
          size="sm"
          style={{
            textTransform: "uppercase",
            letterSpacing: 0.5,
            opacity: 0.6,
          }}
        >
          {section.title}
        </ThemedText>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        sections={sections}
        renderItem={renderReceiptItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20 }}
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
      />
      <Toolbar bottom={8}>
        <ToolbarButton
          onPress={handleScanReceipt}
          icon="camera.fill"
          label="Scan"
          variant="glass"
        />
        <ToolbarButton
          onPress={handleManualEntry}
          icon="pencil.and.list.clipboard"
          variant="glass"
        />
      </Toolbar>
    </View>
  );
}
