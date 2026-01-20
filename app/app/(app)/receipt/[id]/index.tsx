/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt detail screen with hero layout, metadata grid, and content cards
 */

import {
  useState,
  useLayoutEffect,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import {
  ScrollView,
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import * as Linking from "expo-linking";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  useReceipt,
  useDeleteReceipt,
  useUpdateReceipt,
} from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { useAuth } from "@/contexts/auth-context";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  MerchantInfoCard,
  ItemsCard,
  TotalsCard,
  ReturnInfoCard,
  ReceiptHeader,
  SplitSummaryCard,
  ShareReceiptBottomSheet,
  NotesCard,
  useScannedBarcode,
  shouldShowReturnInfo,
  BarcodeModal,
  MerchantDetailsSheet,
  EditItemSheet,
  EditTotalsSheet,
} from "@/components/receipt-detail";
import { SplitDetailsSheet } from "@/app/(app)/split/details";
import { SplitFlowSheet } from "@/components/split/split-flow-sheet";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type { StoredReceipt, Friend as StorageFriend } from "@/utils/storage";
import { getReceiptPhotoUrl } from "@/utils/storage";
import { SymbolView } from "expo-symbols";
import { AppleMaps } from "expo-maps";
import * as Location from "expo-location";
import { getCategoryName, getCategoryEmoji } from "@/utils/categories";
import { isCollaborator } from "@/utils/storage";
import moment from "moment";

// ============================================================================
// Toolbar Setup Hook
// ============================================================================

function useReceiptToolbar({
  receipt,
  colorScheme,
  hasPhoto,
  currentUserId,
  onViewPhoto,
  onEdit,
  onShare,
  onSplit,
  onScanBarcode,
  onShowBarcode,
  onDelete,
  onSetVisibility,
}: {
  receipt: StoredReceipt | null;
  colorScheme: "light" | "dark" | null | undefined;
  hasPhoto: boolean;
  currentUserId?: string | null;
  onViewPhoto: () => void;
  onEdit: () => void;
  onShare: () => void;
  onSplit: () => void;
  onScanBarcode: () => void;
  onShowBarcode: () => void;
  onDelete: () => void;
  onSetVisibility: (visibility: "public" | "private") => void;
}) {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions(
      ReceiptHeader({
        receipt,
        colorScheme: colorScheme || "light",
        hasPhoto,
        currentUserId,
        onViewPhoto,
        onEdit,
        onShare,
        onSplit,
        onScanBarcode,
        onShowBarcode,
        onDelete,
        onSetVisibility,
      })
    );
  }, [
    navigation,
    colorScheme,
    receipt,
    hasPhoto,
    currentUserId,
    onViewPhoto,
    onEdit,
    onShare,
    onSplit,
    onScanBarcode,
    onShowBarcode,
    onDelete,
    onSetVisibility,
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

// Hero card components moved to MerchantInfoCard.tsx

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the return period has expired
 */
function isReturnPeriodExpired(returnByDate?: string): boolean {
  if (!returnByDate) {
    return false;
  }

  const returnDate = moment(returnByDate);
  if (!returnDate.isValid()) {
    return false;
  }

  const now = moment();
  return returnDate.isBefore(now, "day");
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
  onScanBarcode,
  isDark,
  onMerchantPress,
  onViewSplit,
  currentUserId,
  onItemPress,
  onTotalsPress,
}: {
  receipt: StoredReceipt;
  friends: StorageFriend[];
  showRawReturnText: boolean;
  onToggleFormat: () => void;
  onShare: () => void;
  onScanBarcode: () => void;
  isDark: boolean;
  onMerchantPress: () => void;
  onViewSplit?: () => void;
  currentUserId?: string | null;
  onItemPress?: (item: any, index: number) => void;
  onTotalsPress?: () => void;
}) {
  const isCollaboratorValue = isCollaborator(receipt, currentUserId);
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
      {/* Merchant Info Card */}
      <View className="px-6 mb-4">
        <MerchantInfoCard
          receipt={receipt}
          isCollaborator={isCollaboratorValue}
          onShare={onShare}
          onMerchantPress={onMerchantPress}
        />
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
          <ItemsCard
            receipt={receipt}
            onItemPress={onItemPress}
            isCollaborator={isCollaboratorValue}
          />
          <TotalsCard
            receipt={receipt}
            onTotalsPress={onTotalsPress}
            isCollaborator={isCollaboratorValue}
          />
        </View>
      </View>

      {/* Split Summary */}
      {receipt.splitData ? (
        <View className="px-6 mb-4">
          <SplitSummaryCard
            receipt={receipt}
            friends={friends}
            onPress={onViewSplit}
          />
        </View>
      ) : null}

      {!shouldShowReturnInfo(receipt.returnInfo) && isCollaboratorValue && (
        <View className="px-6 mb-4">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onScanBarcode}
            className={`rounded-[20px] p-4 gap-1 ${isDark ? "bg-[#1A1D1E]" : "bg-white"
              }`}
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.2)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.05)",
                }}
              >
                <SymbolView
                  name="qrcode.viewfinder"
                  tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                  style={{ width: 24, height: 24 }}
                />
              </View>
              <View className="flex-1">
                <ThemedText size="base" weight="semibold">
                  Add Return Information
                </ThemedText>
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.subtle : Colors.light.icon,
                  }}
                >
                  Scan return barcode to add return details
                </ThemedText>
              </View>
              <SymbolView
                name="chevron.right"
                tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
                style={{ width: 16, height: 16 }}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Return Info */}
      {shouldShowReturnInfo(receipt.returnInfo) ||
        isReturnPeriodExpired(receipt.returnInfo?.returnByDate) ||
        receipt.returnInfo?.shouldKeepPhysicalReceipt ? (
        <View className="px-6 mb-4">
          <ReturnInfoCard
            receipt={receipt}
            showRawReturnText={showRawReturnText}
            onToggleFormat={onToggleFormat}
            isDark={isDark}
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
  const params = useLocalSearchParams<{
    id: string | string[];
    scannedBarcode?: string;
  }>();
  // Handle case where id might be an array from route params
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [showRawReturnText, setShowRawReturnText] = useState(false);
  const colorScheme = useColorScheme();
  const barcodeModalRef = useRef<TrueSheet>(null);
  const shareBottomSheetRef = useRef<TrueSheet>(null);
  const merchantDetailsSheetRef = useRef<TrueSheet>(null);
  const splitDetailsSheetRef = useRef<TrueSheet>(null);
  const splitFlowSheetRef = useRef<TrueSheet>(null);
  const editItemSheetRef = useRef<TrueSheet>(null);
  const editTotalsSheetRef = useRef<TrueSheet>(null);

  const [editingItem, setEditingItem] = useState<{
    item: StoredReceipt["items"][0];
    index: number;
  } | null>(null);

  // React Query hooks
  const {
    data: receipt,
    isLoading: isLoadingReceipt,
    refetch: refetchReceipt,
  } = useReceipt(id);

  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
  const { user } = useAuth();
  const deleteReceiptMutation = useDeleteReceipt();
  const updateReceiptMutation = useUpdateReceipt();

  const isLoading = isLoadingReceipt || isLoadingFriends;
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const hasPhoto = Boolean(
    receipt?.appData?.images?.some((image) => Boolean(image.key || image.url))
  );

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

  const handleViewPhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isLoadingPhoto) {
      return;
    }

    if (!hasPhoto) {
      Alert.alert("No Photo", "No photo is attached to this receipt.");
      return;
    }

    setIsLoadingPhoto(true);
    try {
      const url = await getReceiptPhotoUrl(id);
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to load receipt photo"
      );
    } finally {
      setIsLoadingPhoto(false);
    }
  }, [hasPhoto, id, isLoadingPhoto]);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/(app)/receipt/[id]/edit",
      params: { id },
    });
  }, [id]);

  const handleShare = useCallback(async () => {
    if (!receipt) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Make receipt public before showing share sheet
      await updateReceiptMutation.mutateAsync({
        id: receipt.id,
        updates: { visibility: "public" },
      });
      // Open the share bottom sheet
      shareBottomSheetRef.current?.present();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to prepare receipt for sharing. Please try again."
      );
    }
  }, [receipt, updateReceiptMutation]);

  const handleSplit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    splitDetailsSheetRef.current?.present();
  }, []);

  const toggleReturnTextFormat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRawReturnText((prev) => !prev);
  }, []);

  const handleMerchantPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    merchantDetailsSheetRef.current?.present();
  }, []);

  const handleSetVisibility = useCallback(
    async (visibility: "public" | "private") => {
      if (!receipt) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await updateReceiptMutation.mutateAsync({
          id: receipt.id,
          updates: { visibility },
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Visibility Updated", `Successfully set visibility to ${visibility}.`);
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to update visibility. Please try again."
        );
      }
    },
    [receipt, updateReceiptMutation]
  );

  const handleUpdateItem = useCallback(
    async (updatedItem: StoredReceipt["items"][0]) => {
      if (!receipt || editingItem === null) return;
      const newItems = [...receipt.items];
      newItems[editingItem.index] = updatedItem;

      // Recalculate subtotal and total
      const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const total = subtotal + receipt.totals.tax + (receipt.totals.fees || 0);

      try {
        await updateReceiptMutation.mutateAsync({
          id: receipt.id,
          updates: {
            items: newItems,
            totals: {
              ...receipt.totals,
              subtotal,
              total,
            },
          },
        });
        setEditingItem(null);
      } catch (error) {
        Alert.alert("Error", "Failed to update item");
      }
    },
    [receipt, editingItem, updateReceiptMutation]
  );

  const handleUpdateTotals = useCallback(
    async (updates: Partial<StoredReceipt["totals"]>) => {
      if (!receipt) return;
      try {
        await updateReceiptMutation.mutateAsync({
          id: receipt.id,
          updates: {
            totals: {
              ...receipt.totals,
              ...updates,
            },
          },
        });
      } catch (error) {
        Alert.alert("Error", "Failed to update totals");
      }
    },
    [receipt, updateReceiptMutation]
  );

  // Setup toolbar
  useReceiptToolbar({
    receipt: receipt || null,
    colorScheme,
    hasPhoto,
    currentUserId: user?.id,
    onViewPhoto: handleViewPhoto,
    onEdit: handleEdit,
    onShare: handleShare,
    onSplit: handleSplit,
    onScanBarcode: handleScanBarcode,
    onShowBarcode: handleShowBarcode,
    onDelete: handleDelete,
    onSetVisibility: handleSetVisibility,
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
          onScanBarcode={handleScanBarcode}
          isDark={isDark}
          onMerchantPress={handleMerchantPress}
          onViewSplit={() => splitDetailsSheetRef.current?.present()}
          currentUserId={user?.id}
          onItemPress={(item, index) => {
            setEditingItem({ item, index });
            editItemSheetRef.current?.present();
          }}
          onTotalsPress={() => editTotalsSheetRef.current?.present()}
        />
      </ThemedView>
      {/* <Toolbar bottom={insets.bottom}>
        <ToolbarButton
          onPress={handleEdit}
          label="Edit"
          icon="square.and.pencil"
          variant="glass"
        />
        <ToolbarButton
          onPress={handleSplit}
          label="Split"
          icon="person.2.fill"
          variant="glass"
        />
        <ToolbarButton onPress={handleDelete} icon="trash" variant="danger" />
      </Toolbar> */}
      {receipt.returnInfo?.returnBarcode && (
        <BarcodeModal
          bottomSheetRef={barcodeModalRef}
          barcodeValue={receipt.returnInfo.returnBarcode}
          barcodeFormat={receipt.returnInfo.returnBarcodeFormat}
        />
      )}
      <ShareReceiptBottomSheet
        bottomSheetRef={shareBottomSheetRef}
        receiptId={receipt.id}
        receiptName={receipt.name || receipt.merchant.name}
      />
      <MerchantDetailsSheet
        bottomSheetRef={merchantDetailsSheetRef}
        receipt={receipt}
        onClose={() => { }}
      />
      {receipt && (
        <>
          <SplitDetailsSheet
            bottomSheetRef={splitDetailsSheetRef}
            receiptId={receipt.id}
            currentUserId={user?.id}
            onEdit={() => splitFlowSheetRef.current?.present()}
          />
          <SplitFlowSheet
            bottomSheetRef={splitFlowSheetRef}
            receiptId={receipt.id}
            onComplete={() => { }}
          />
        </>
      )}
      <EditItemSheet
        bottomSheetRef={editItemSheetRef}
        item={editingItem?.item || null}
        currency={receipt.totals.currency}
        onSave={handleUpdateItem}
        onClose={() => setEditingItem(null)}
      />
      <EditTotalsSheet
        bottomSheetRef={editTotalsSheetRef}
        receipt={receipt}
        onSave={handleUpdateTotals}
        onClose={() => { }}
      />
    </View>
  );
}
