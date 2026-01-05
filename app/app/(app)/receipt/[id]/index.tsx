/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt detail screen with toolbar, content, and footer
 */

import { useState, useLayoutEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import {
  ScrollView,
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  NotesCard,
  useScannedBarcode,
  shouldShowReturnInfo,
  BarcodeModal,
} from "@/components/receipt-detail";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type { StoredReceipt, Friend } from "@/utils/storage";
import { Toolbar, ToolbarButton } from "@/components/toolbar";

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
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 24,
        gap: 16,
        paddingTop: 24,
        paddingBottom: 140,
      }}
      automaticallyAdjustContentInsets
    >
      <MerchantInfoCard receipt={receipt} />
      <TransactionDetailsCard receipt={receipt} />
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
      {receipt.splitData ? (
        <SplitSummaryCard receipt={receipt} friends={friends} />
      ) : null}
      {shouldShowReturnInfo(receipt.returnInfo) ? (
        <ReturnInfoCard
          receipt={receipt}
          showRawReturnText={showRawReturnText}
          onToggleFormat={onToggleFormat}
        />
      ) : null}
      <NotesCard receipt={receipt} />
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
          isDark={isDark}
        />
      </ThemedView>
      <Toolbar bottom={Math.max(insets.bottom, 20)}>
        <ToolbarButton
          onPress={handleShare}
          icon="square.and.arrow.up"
          variant="secondary"
        />
        <ToolbarButton onPress={handleEdit} icon="pencil" variant="secondary" />
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
