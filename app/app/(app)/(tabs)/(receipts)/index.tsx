import { useCallback, useMemo } from "react";
import { ThemedText } from "@/components/themed-text";
import {
  Pressable,
  View,
  RefreshControl,
  Alert,
  Image,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeleteReceipt, useReceipts } from "@/hooks/use-receipts";
import type { StoredReceipt } from "@/utils/storage";
import { formatCurrency, formatReceiptDateTime } from "@/utils/format";
import * as Haptics from "expo-haptics";
import { Toolbar, ToolbarButton } from "@/components/toolbar";
import moment from "moment";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { SymbolView } from "expo-symbols";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface ReceiptSection {
  title: string;
  data: StoredReceipt[];
}

type FlashListItem = string | StoredReceipt;

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
      ? "Return period expired"
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
  const deleteReceipt = useDeleteReceipt();

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

  const handleDeleteReceipt = useCallback(
    (id: string, closeSwipeable: () => void) => {
      Alert.alert("Delete receipt?", "This cannot be undone.", [
        {
          text: "Cancel",
          style: "cancel",
          onPress: closeSwipeable,
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            closeSwipeable();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteReceipt.mutate(id);
          },
        },
      ]);
    },
    [deleteReceipt]
  );

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

  // Convert sections to flat array for FlashList: [sectionTitle, receipt1, receipt2, sectionTitle2, receipt3, ...]
  const flashListData = useMemo<FlashListItem[]>(() => {
    const flatData: FlashListItem[] = [];
    sections.forEach((section) => {
      flatData.push(section.title);
      flatData.push(...section.data);
    });
    return flatData;
  }, [sections]);

  // Calculate sticky header indices
  const stickyHeaderIndices = useMemo<number[]>(() => {
    return flashListData
      .map((item, index) => {
        if (typeof item === "string") {
          return index;
        }
        return null;
      })
      .filter((item): item is number => item !== null);
  }, [flashListData]);

  const getReceiptDisplayInfo = (item: StoredReceipt) => {
    const hasCustomTitle = item.name && item.name !== item.merchant.name;
    const displayTitle = hasCustomTitle ? item.name : item.merchant.name;
    return { hasCustomTitle, displayTitle };
  };

  // Track which section each receipt belongs to for rendering context
  const receiptSectionMap = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    sections.forEach((section) => {
      section.data.forEach((receipt) => {
        map.set(receipt.id, section.title);
      });
    });
    return map;
  }, [sections]);

  // Track section data for each receipt to know if it's first/last
  const receiptSectionDataMap = useMemo<Map<string, { section: ReceiptSection; index: number }>>(() => {
    const map = new Map();
    sections.forEach((section) => {
      section.data.forEach((receipt, index) => {
        map.set(receipt.id, { section, index });
      });
    });
    return map;
  }, [sections]);

  const renderSectionHeader = useCallback((title: string) => {
    return (
      <View className="px-1 pt-0 mb-1">
        <ThemedText className="text-[13px] font-semibold uppercase tracking-widest opacity-60">
          {title}
        </ThemedText>
      </View>
    );
  }, []);

  const renderReceiptItem = useCallback((item: StoredReceipt, index: number, isFirstInSection: boolean, isLastInSection: boolean) => {
    const { displayTitle } = getReceiptDisplayInfo(item);
    const sectionTitle = receiptSectionMap.get(item.id) || "";
    const isToday = sectionTitle === "Today";

    const separatorColor =
      colorScheme === "dark"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)";
    const rowBaseBg = isDark ? Colors.dark.surface : Colors.light.surface;
    const pressedBg =
      colorScheme === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.03)";
    const merchantLogo = item.merchant.logo;

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(app)/receipt/${item.id}`);
    };

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
          renderRightActions={(_, __, swipeableMethods) => (
            <View
              className="h-full justify-center items-center"
              style={{
                backgroundColor: "#EF4444",
              }}
            >
              <Pressable
                cssInterop={false}
                className="h-full w-full justify-center items-center px-4"
                onPress={() =>
                  handleDeleteReceipt(item.id, swipeableMethods.close)
                }
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
          )}
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
                    {formatCurrency(item.totals.total, item.totals.currency)}
                  </ThemedText>
                </View>
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    {displayTitle !== item.merchant.name && (
                      <ThemedText
                        size="sm"
                        lightColor={Colors.light.icon}
                        darkColor={Colors.dark.icon}
                      >
                        {item.merchant.name}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText
                    size="sm"
                    lightColor={Colors.light.icon}
                    darkColor={Colors.dark.icon}
                  >
                    {formatReceiptDateTime(item.transaction.datetime, isToday)}
                  </ThemedText>
                </View>
                {(() => {
                  const returnDateInfo = getReturnDateInfo(
                    item.returnInfo?.returnByDate
                  );
                  if (!returnDateInfo) {
                    return null;
                  }

                  const iconColor = returnDateInfo.isUrgent
                    ? "#F97316"
                    : isDark
                      ? Colors.dark.icon
                      : Colors.light.icon;
                  const textColor = returnDateInfo.isUrgent
                    ? "#F97316"
                    : isDark
                      ? Colors.dark.icon
                      : Colors.light.icon;

                  return (
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      {Platform.OS === "ios" ? (
                        <SymbolView
                          name={
                            returnDateInfo.isUrgent
                              ? "exclamationmark.triangle.fill"
                              : "arrow.uturn.backward"
                          }
                          tintColor={iconColor}
                          style={{ width: 12, height: 12 }}
                        />
                      ) : (
                        <MaterialIcons
                          name={returnDateInfo.isUrgent ? "warning" : "undo"}
                          size={12}
                          color={iconColor}
                        />
                      )}
                      <ThemedText
                        size="sm"
                        lightColor={textColor}
                        darkColor={textColor}
                      >
                        {returnDateInfo.text}
                      </ThemedText>
                    </View>
                  );
                })()}
              </View>
            </View>
          </Pressable>
        </ReanimatedSwipeable>
      </View>
    );
  }, [colorScheme, isDark, receiptSectionMap, handleDeleteReceipt]);

  const renderItem = useCallback(
    ({ item, index }: { item: FlashListItem; index: number }) => {
      if (typeof item === "string") {
        // Render section header
        const sectionIndex = sections.findIndex((s) => s.title === item);
        const isFirstSection = sectionIndex === 0;

        return (
          <View>
            {!isFirstSection && <View className="h-4" />}
            {renderSectionHeader(item)}
          </View>
        );
      } else {
        // Render receipt item
        const sectionData = receiptSectionDataMap.get(item.id);
        if (!sectionData) {
          return renderReceiptItem(item, index, false, false);
        }

        const { section, index: receiptIndex } = sectionData;
        const isFirstInSection = receiptIndex === 0;
        const isLastInSection = receiptIndex === section.data.length - 1;
        const isOnlyReceipt = section.data.length === 1;

        // Determine container styling based on position
        // Apply border only to first and last receipts to create container effect
        const containerStyle: {
          backgroundColor: string;
          borderRadius?: number;
          borderTopLeftRadius?: number;
          borderTopRightRadius?: number;
          borderBottomLeftRadius?: number;
          borderBottomRightRadius?: number;
          borderWidth?: number;
          borderColor?: string;
          borderTopWidth?: number;
          borderBottomWidth?: number;
          borderLeftWidth?: number;
          borderRightWidth?: number;
        } = {
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(255, 255, 255, 1)",
        };

        if (colorScheme === "light") {
          if (isOnlyReceipt) {
            containerStyle.borderRadius = 12;
            containerStyle.borderWidth = 1;
            containerStyle.borderColor = "rgba(0, 0, 0, 0.1)";
          } else if (isFirstInSection) {
            containerStyle.borderTopLeftRadius = 12;
            containerStyle.borderTopRightRadius = 12;
            containerStyle.borderWidth = 1;
            containerStyle.borderColor = "rgba(0, 0, 0, 0.1)";
            containerStyle.borderBottomWidth = 0;
          } else if (isLastInSection) {
            containerStyle.borderBottomLeftRadius = 12;
            containerStyle.borderBottomRightRadius = 12;
            containerStyle.borderTopWidth = 0;
            containerStyle.borderLeftWidth = 1;
            containerStyle.borderRightWidth = 1;
            containerStyle.borderBottomWidth = 1;
            containerStyle.borderColor = "rgba(0, 0, 0, 0.1)";
          } else {
            // Middle receipts: only side borders
            containerStyle.borderLeftWidth = 1;
            containerStyle.borderRightWidth = 1;
            containerStyle.borderTopWidth = 0;
            containerStyle.borderBottomWidth = 0;
            containerStyle.borderColor = "rgba(0, 0, 0, 0.1)";
          }
        } else {
          // Dark mode: no border, just rounded corners
          if (isOnlyReceipt) {
            containerStyle.borderRadius = 12;
          } else if (isFirstInSection) {
            containerStyle.borderTopLeftRadius = 12;
            containerStyle.borderTopRightRadius = 12;
          } else if (isLastInSection) {
            containerStyle.borderBottomLeftRadius = 12;
            containerStyle.borderBottomRightRadius = 12;
          }
        }

        return (
          <View style={containerStyle} className="overflow-hidden">
            {renderReceiptItem(item, index, isFirstInSection, isLastInSection)}
          </View>
        );
      }
    },
    [
      sections,
      colorScheme,
      receiptSectionDataMap,
      renderSectionHeader,
      renderReceiptItem,
    ]
  );

  const getItemType = useCallback(
    (item: FlashListItem) => {
      return typeof item === "string" ? "sectionHeader" : "row";
    },
    []
  );

  const keyExtractor = useCallback(
    (item: FlashListItem, index: number) => {
      if (typeof item === "string") {
        return `section-${item}-${index}`;
      }
      return `receipt-${item.id}`;
    },
    []
  );

  return (
    <View className="flex-1">
      <FlashList
        data={flashListData}
        renderItem={renderItem}
        getItemType={getItemType}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 64,
        }}
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
        stickyHeaderIndices={stickyHeaderIndices}
        contentInsetAdjustmentBehavior="automatic"

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
