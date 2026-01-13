/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt detail screen with hero layout, metadata grid, and content cards
 */

import { useState, useLayoutEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import {
  ScrollView,
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReceipt, useDeleteReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  ItemsCard,
  TotalsCard,
  ReturnInfoCard,
  ReceiptHeader,
  SplitSummaryCard,
  NotesCard,
  useScannedBarcode,
  shouldShowReturnInfo,
  BarcodeModal,
  formatMerchantAddress,
  useAddressHandler,
} from "@/components/receipt-detail";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type { StoredReceipt, Friend } from "@/utils/storage";
import { Toolbar, ToolbarButton } from "@/components/toolbar";
import { SymbolView } from "expo-symbols";

// ============================================================================
// Toolbar Setup Hook
// ============================================================================

function useReceiptToolbar({
  receipt,
  colorScheme,
  onEdit,
  onShare,
  onSplit,
  onScanBarcode,
  onShowBarcode,
  onDelete,
}: {
  receipt: StoredReceipt | null;
  colorScheme: "light" | "dark" | null | undefined;
  onEdit: () => void;
  onShare: () => void;
  onSplit: () => void;
  onScanBarcode: () => void;
  onShowBarcode: () => void;
  onDelete: () => void;
}) {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions(
      ReceiptHeader({
        receipt,
        colorScheme: colorScheme || "light",
        onEdit,
        onShare,
        onSplit,
        onScanBarcode,
        onShowBarcode,
        onDelete,
      })
    );
  }, [
    navigation,
    colorScheme,
    receipt,
    onEdit,
    onShare,
    onSplit,
    onScanBarcode,
    onShowBarcode,
    onDelete,
  ]);
}

// ============================================================================
// Loading & Error States
// ============================================================================

function ReceiptLoadingState() {
  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" />
    </View>
  );
}

function ReceiptNotFoundState() {
  return (
    <View className="flex-1 justify-center items-center">
      <ThemedText>Receipt not found</ThemedText>
    </View>
  );
}

// ============================================================================
// Hero Section with Merchant Info
// ============================================================================

interface HeroSectionProps {
  receipt: StoredReceipt;
  isDark: boolean;
}

function HeroSection({ receipt, isDark }: HeroSectionProps) {
  const handleAddressPress = useAddressHandler();
  const merchantAddress = formatMerchantAddress(receipt.merchant.address);
  const hasAddress = Boolean(receipt.merchant.address?.line1);
  const receiptTitle = receipt.name?.trim() || "";
  const merchantName = receipt.merchant.name?.trim() || "";
  const merchantLogo = receipt.merchant.logo;
  const [logoError, setLogoError] = useState(false);

  return (
    <View className="px-4 py-4">
      {/* Merchant Logo */}
      {merchantLogo && !logoError ? (
        <View className="mb-4 items-center">
          <Image
            source={{ uri: merchantLogo }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 12,
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
            }}
            resizeMode="contain"
            onError={() => setLogoError(true)}
          />
        </View>
      ) : null}

      <View className="p-2">
        {/* Merchant Name */}
        <ThemedText
          size="2xl"
          weight="bold"
          family="sans"
          className="text-left"
        >
          {receiptTitle || merchantName}
        </ThemedText>

        {/* Address */}
        {hasAddress ? (
          <TouchableOpacity
            onPress={() => handleAddressPress(receipt.merchant.address!)}
            activeOpacity={0.7}
            className="items-start"
          >
            <ThemedText
              size="sm"
              className="text-center"
              style={{
                color: isDark ? Colors.dark.subtle : Colors.light.icon,
              }}
            >
              {merchantAddress}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================================
// Metadata Grid (Date, Category, Total, Currency)
// ============================================================================

interface MetadataGridProps {
  receipt: StoredReceipt;
  isDark: boolean;
}

function MetadataGrid({ receipt, isDark }: MetadataGridProps) {
  const date = new Date(receipt.transaction.datetime || receipt.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const category = receipt.merchant.category?.[0] || "Shopping";
  const categoryEmoji = getCategoryEmoji(category);
  const total = receipt.totals.total || 0;
  const currency = receipt.totals.currency || "USD";

  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const subtleColor = isDark ? Colors.dark.subtle : Colors.light.icon;

  return (
    <View className="px-6 pt-5 pb-6">
      {/* First Row: Date and Category */}
      <View className="flex-row gap-4 mb-6">
        {/* Date */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <SymbolView
              name="calendar"
              tintColor={iconColor}
              style={{ width: 20, height: 20 }}
            />
            <ThemedText
              size="sm"
              weight="semibold"
              style={{ color: subtleColor }}
            >
              Date
            </ThemedText>
          </View>
          <ThemedText size="base" weight="semibold" family="sans">
            {formattedDate}
          </ThemedText>
        </View>

        {/* Category */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <SymbolView
              name="tag.fill"
              tintColor={iconColor}
              style={{ width: 20, height: 20 }}
            />
            <ThemedText
              size="sm"
              weight="semibold"
              style={{ color: subtleColor }}
            >
              Category
            </ThemedText>
          </View>
          <View className="flex-row items-center gap-1">
            <ThemedText size="base">{categoryEmoji}</ThemedText>
            <ThemedText size="base" weight="semibold" family="sans">
              {category}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Second Row: Total Amount and Currency */}
      <View className="flex-row gap-4">
        {/* Total Amount */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <SymbolView
              name="creditcard.fill"
              tintColor={iconColor}
              style={{ width: 20, height: 20 }}
            />
            <ThemedText
              size="sm"
              weight="semibold"
              style={{ color: subtleColor }}
            >
              Total Amount
            </ThemedText>
          </View>
          <ThemedText size="base" weight="semibold" family="sans">
            ${total.toFixed(2)}
          </ThemedText>
        </View>

        {/* Currency */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <SymbolView
              name="globe"
              tintColor={iconColor}
              style={{ width: 20, height: 20 }}
            />
            <ThemedText
              size="sm"
              weight="semibold"
              style={{ color: subtleColor }}
            >
              Currency
            </ThemedText>
          </View>
          <ThemedText size="base" weight="semibold" family="sans">
            {currency}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Helper: Get Category Emoji
// ============================================================================

function getCategoryEmoji(category: string): string {
  const categoryMap: Record<string, string> = {
    Shopping: "🛍️",
    Groceries: "🛒",
    "Food & Drink": "🍽️",
    Dining: "🍽️",
    Transportation: "🚗",
    Entertainment: "🎬",
    Travel: "✈️",
    Health: "🏥",
    Services: "🔧",
    Other: "📋",
  };

  return categoryMap[category] || "🛍️";
}

// ============================================================================
// Receipt Content Component
// ============================================================================

function ReceiptContent({
  receipt,
  friends,
  showRawReturnText,
  onToggleFormat,
  onShare,
  isDark,
}: {
  receipt: StoredReceipt;
  friends: Friend[];
  showRawReturnText: boolean;
  onToggleFormat: () => void;
  onShare: () => void;
  isDark: boolean;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: 140,
      }}
      automaticallyAdjustContentInsets
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Card containing merchant info and metadata */}
      <View className="px-6 mb-4">
        <View
          className="rounded-[20px] overflow-hidden border"
          style={{
            backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Hero Section */}
          <HeroSection receipt={receipt} isDark={isDark} />

          {/* Separator */}
          <View
            className="h-px mx-6"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          />

          {/* Metadata Grid */}
          <MetadataGrid receipt={receipt} isDark={isDark} />
        </View>
      </View>

      {/* Items and Totals Card */}
      <View className="px-6 mb-4">
        <View
          className="rounded-[20px] p-6 border"
          style={{
            backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          }}
        >
          <ItemsCard receipt={receipt} />
          <TotalsCard receipt={receipt} />
        </View>
      </View>

      {/* Split Summary */}
      {receipt.splitData ? (
        <View className="px-6 mb-4">
          <SplitSummaryCard receipt={receipt} friends={friends} />
        </View>
      ) : null}

      {/* Return Info */}
      {shouldShowReturnInfo(receipt.returnInfo) ? (
        <View className="px-6 mb-4">
          <ReturnInfoCard
            receipt={receipt}
            showRawReturnText={showRawReturnText}
            onToggleFormat={onToggleFormat}
          />
        </View>
      ) : null}

      {/* Notes */}
      <View className="px-6 mb-4">
        <NotesCard receipt={receipt} />
      </View>
    </ScrollView>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
    scannedBarcode?: string;
  }>();
  const [showRawReturnText, setShowRawReturnText] = useState(false);
  const colorScheme = useColorScheme();
  const barcodeModalRef = useRef<TrueSheet>(null);
  const insets = useSafeAreaInsets();

  // React Query hooks
  const {
    data: receipt,
    isLoading: isLoadingReceipt,
    refetch: refetchReceipt,
  } = useReceipt(id);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
  const deleteReceiptMutation = useDeleteReceipt();

  const isLoading = isLoadingReceipt || isLoadingFriends;

  // Handle scanned barcode from barcode scanner
  useScannedBarcode({
    receipt: receipt || null,
    receiptId: id,
    onReceiptUpdate: () => {
      refetchReceipt();
    },
  });

  // Event Handlers
  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Receipt",
      "Are you sure you want to delete this receipt? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteReceiptMutation.mutate(id, {
              onSuccess: () => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                router.back();
              },
              onError: () => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                );
                Alert.alert(
                  "Error",
                  "Failed to delete receipt. Please try again."
                );
              },
            });
          },
        },
      ],
      { cancelable: true }
    );
  }, [id, deleteReceiptMutation]);

  const handleScanBarcode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/barcode-scanner",
      params: { onScan: "scannedBarcode" },
    });
  }, []);

  const handleShowBarcode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    barcodeModalRef.current?.present();
  }, []);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/(app)/receipt/[id]/edit",
      params: { id },
    });
  }, [id]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement share functionality
  }, []);

  const handleSplit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/split",
      params: { receiptId: id },
    });
  }, [id]);

  const toggleReturnTextFormat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRawReturnText((prev) => !prev);
  }, []);

  // Setup toolbar
  useReceiptToolbar({
    receipt: receipt || null,
    colorScheme,
    onEdit: handleEdit,
    onShare: handleShare,
    onSplit: handleSplit,
    onScanBarcode: handleScanBarcode,
    onShowBarcode: handleShowBarcode,
    onDelete: handleDelete,
  });

  // Loading state
  if (isLoading) {
    return <ReceiptLoadingState />;
  }

  // Not found state
  if (!receipt) {
    return <ReceiptNotFoundState />;
  }

  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1">
      <ThemedView className="flex-1">
        <ReceiptContent
          receipt={receipt}
          friends={friends}
          showRawReturnText={showRawReturnText}
          onToggleFormat={toggleReturnTextFormat}
          onShare={handleShare}
          isDark={isDark}
        />
      </ThemedView>
      <Toolbar bottom={insets.bottom}>
        <ToolbarButton
          onPress={handleEdit}
          label="Edit"
          icon="square.and.pencil"
          variant="secondary"
        />
        <ToolbarButton
          onPress={handleSplit}
          label="Split"
          icon="person.2.fill"
          variant="secondary"
        />
        <ToolbarButton onPress={handleDelete} icon="trash" variant="danger" />
      </Toolbar>
      {receipt.returnInfo?.returnBarcode && (
        <BarcodeModal
          bottomSheetRef={barcodeModalRef}
          barcodeValue={receipt.returnInfo.returnBarcode}
          barcodeFormat={receipt.returnInfo.returnBarcodeFormat}
        />
      )}
    </View>
  );
}
