/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt detail screen with toolbar, content, and footer
 */

import { useState, useLayoutEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReceipt, useDeleteReceipt } from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  MerchantInfoCard,
  TransactionDetailsCard,
  ItemsCard,
  TotalsCard,
  ReturnInfoCard,
  ReceiptHeader,
  SplitSummaryCard,
  useScannedBarcode,
  shouldShowReturnInfo,
  BarcodeModal,
} from "@/components/receipt-detail";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { StoredReceipt, Friend } from "@/utils/storage";

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
    <View style={[styles.container, styles.centerContent]}>
      <ActivityIndicator size="large" />
    </View>
  );
}

function ReceiptNotFoundState() {
  return (
    <View style={[styles.container, styles.centerContent]}>
      <ThemedText>Receipt not found</ThemedText>
    </View>
  );
}

// ============================================================================
// Receipt Content Component
// ============================================================================

function ReceiptContent({
  receipt,
  friends,
  showRawReturnText,
  onToggleFormat,
  isDark,
}: {
  receipt: StoredReceipt;
  friends: Friend[];
  showRawReturnText: boolean;
  onToggleFormat: () => void;
  isDark: boolean;
}) {
  return (
    <ScrollView
      style={[styles.scrollView]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: 32, paddingBottom: 140 },
      ]}
      automaticallyAdjustContentInsets
    >
      <MerchantInfoCard receipt={receipt} />
      <TransactionDetailsCard receipt={receipt} />
      <View
        style={[
          styles.itemsTotalsCard,
          {
            backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          },
        ]}
      >
        <ItemsCard receipt={receipt} />
        <TotalsCard receipt={receipt} />
      </View>
      {receipt.splitData && (
        <SplitSummaryCard receipt={receipt} friends={friends} />
      )}
      {shouldShowReturnInfo(receipt.returnInfo) && (
        <ReturnInfoCard
          receipt={receipt}
          showRawReturnText={showRawReturnText}
          onToggleFormat={onToggleFormat}
        />
      )}
    </ScrollView>
  );
}

// ============================================================================
// Footer Component
// ============================================================================

function ReceiptFooter({
  isDark,
  onShare,
  onEdit,
}: {
  isDark: boolean;
  onShare: () => void;
  onEdit: () => void;
}) {
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: isDark
            ? "rgba(21, 23, 24, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
          borderTopColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.05)",
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.footerButtonSecondary,
          {
            backgroundColor: isDark ? Colors.dark.surface : "#F5F5F5",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
        onPress={onShare}
      >
        <SymbolView
          name="square.and.arrow.up"
          tintColor={isDark ? Colors.dark.text : Colors.light.text}
          style={styles.footerIcon}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.footerButtonPrimary,
          {
            backgroundColor: isDark ? "#FFFFFF" : Colors.light.text,
          },
        ]}
        onPress={onEdit}
      >
        <SymbolView
          name="doc.text"
          tintColor={isDark ? Colors.dark.background : "#FFFFFF"}
          style={styles.footerIcon}
        />
        <ThemedText
          size="base"
          weight="bold"
          style={{
            color: isDark ? Colors.dark.background : "#FFFFFF",
            marginLeft: 8,
          }}
        >
          View Original Receipt
        </ThemedText>
      </TouchableOpacity>
    </View>
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
  const barcodeModalRef = useRef<BottomSheetModal>(null);

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
    <View style={styles.container}>
      <ThemedView style={styles.container}>
        <ReceiptContent
          receipt={receipt}
          friends={friends}
          showRawReturnText={showRawReturnText}
          onToggleFormat={toggleReturnTextFormat}
          isDark={isDark}
        />
      </ThemedView>
      <ReceiptFooter
        isDark={isDark}
        onShare={handleShare}
        onEdit={handleEdit}
      />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  itemsTotalsCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 16,
  },
  footerButtonSecondary: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerButtonPrimary: {
    flex: 1,
    height: 56,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  footerIcon: {
    width: 24,
    height: 24,
  },
});
