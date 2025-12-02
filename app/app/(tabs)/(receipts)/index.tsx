/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipts screen
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { ThemedText } from "@/components/themed-text";
import {
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getReceipts, type StoredReceipt } from "@/utils/storage";
import { formatCurrency, formatReceiptDateTime } from "@/utils/format";
import { GlassView } from "expo-glass-effect";
import { ContextMenu, Host, Button } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";

interface ReceiptSection {
  title: string;
  data: StoredReceipt[];
}

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
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    return "Last Week";
  } else if (diffDays <= 30) {
    return "Last Month";
  } else {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  }
}

export default function ReceiptsScreen() {
  const [receipts, setReceipts] = useState<StoredReceipt[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const loadReceipts = useCallback(async () => {
    const data = await getReceipts();
    setReceipts(data);
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  useFocusEffect(
    useCallback(() => {
      loadReceipts();
    }, [loadReceipts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReceipts();
    setRefreshing(false);
  }, [loadReceipts]);

  const handleScanWithCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/camera");
  }, []);

  const handleManualEntry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("[ReceiptsScreen] Manual entry selected");
  }, []);

  const sections = useMemo<ReceiptSection[]>(() => {
    const grouped = new Map<string, StoredReceipt[]>();

    receipts.forEach((receipt) => {
      const sectionTitle = getSectionTitle(receipt.transaction.datetime);
      if (!grouped.has(sectionTitle)) {
        grouped.set(sectionTitle, []);
      }
      grouped.get(sectionTitle)!.push(receipt);
    });

    // Convert to array and sort sections
    const sectionOrder = ["Today", "Yesterday", "Last Week", "Last Month"];
    const sortedSections: ReceiptSection[] = [];

    // Add ordered sections first
    sectionOrder.forEach((title) => {
      if (grouped.has(title)) {
        sortedSections.push({
          title,
          data: grouped.get(title)!,
        });
        grouped.delete(title);
      }
    });

    // Add remaining sections (months) sorted by date
    const remainingSections: ReceiptSection[] = Array.from(grouped.entries())
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => {
        // Sort by the first receipt's date in each section
        const dateA = new Date(a.data[0]?.transaction.datetime || 0);
        const dateB = new Date(b.data[0]?.transaction.datetime || 0);
        return dateB.getTime() - dateA.getTime();
      });

    return [...sortedSections, ...remainingSections];
  }, [receipts]);

  const renderReceiptItem = ({
    item,
    section,
  }: {
    item: StoredReceipt;
    section: ReceiptSection;
  }) => {
    const isDark = colorScheme === "dark";
    const receiptEmoji = item.appData?.emoji || "🧾";

    const isToday = section.title === "Today";
    const hasCustomTitle = item.name && item.name !== item.merchant.name;
    const displayTitle = hasCustomTitle ? item.name : item.merchant.name;

    return (
      <TouchableOpacity
        style={[
          styles.receiptItem,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0)",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
        activeOpacity={0.7}
        onPress={() => {
          router.push(`/${item.id}`);
        }}
      >
        <View style={styles.receiptEmoji}>
          <ThemedText style={styles.emojiText}>{receiptEmoji}</ThemedText>
        </View>
        <View style={styles.receiptContent}>
          <View style={styles.receiptTopRow}>
            <View style={styles.receiptTitleContainer}>
              <ThemedText style={styles.receiptTitle} weight="bold">
                {displayTitle}
              </ThemedText>
              {hasCustomTitle && (
                <ThemedText style={styles.receiptMerchantName}>
                  {item.merchant.name}
                </ThemedText>
              )}
            </View>
            <ThemedText style={styles.receiptDateTime}>
              {formatReceiptDateTime(item.transaction.datetime, isToday)}
            </ThemedText>
          </View>
          <View style={styles.receiptBottomRow}>
            <ThemedText weight="semibold" style={styles.receiptTotal}>
              {formatCurrency(item.totals.total, item.totals.currency)}
            </ThemedText>
            <View style={styles.receiptBottomRight} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: ReceiptSection }) => {
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
        renderItem={({ item, section }) => renderReceiptItem({ item, section })}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={{
          flex: 1,
          backgroundColor:
            colorScheme === "dark"
              ? Colors.dark.background
              : Colors.light.background,
        }}
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
      <Host matchContents>
        <ContextMenu>
          <ContextMenu.Items>
            <Button systemImage="camera.fill" onPress={handleScanWithCamera}>
              Scan with Camera
            </Button>
            <Button systemImage="pencil" onPress={handleManualEntry}>
              Manual Entry
            </Button>
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <View style={styles.fabContainer}>
              <GlassView style={styles.fab}>
                <SymbolView
                  name="plus"
                  tintColor={
                    colorScheme === "dark"
                      ? Colors.dark.text
                      : Colors.light.text
                  }
                  size={24}
                />
              </GlassView>
            </View>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  receiptEmoji: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginRight: 12,
  },
  emojiText: {
    fontSize: 16,
  },
  receiptContent: {
    flex: 1,
  },
  receiptTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  receiptTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  receiptTitle: {
    fontSize: 16,
  },
  receiptMerchantName: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
  },
  receiptDateTime: {
    fontSize: 14,
    opacity: 0.7,
  },
  receiptBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  receiptTotal: {
    fontSize: 16,
  },
  receiptBottomRight: {
    width: 60,
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
  fabContainer: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
