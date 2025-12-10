import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { ScrollView, StyleSheet, View, Alert } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getReceipts,
  getFriends,
  deleteReceipt,
  type StoredReceipt,
  type Friend,
} from "@/utils/storage";
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
import { useHeaderHeight } from "@react-navigation/elements";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
    scannedBarcode?: string;
  }>();
  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showRawReturnText, setShowRawReturnText] = useState(false);
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const barcodeModalRef = useRef<BottomSheetModal>(null);
  useEffect(() => {
    const loadData = async () => {
      const [receipts, loadedFriends] = await Promise.all([
        getReceipts(),
        getFriends(),
      ]);
      const found = receipts.find((r) => r.id === id);
      setReceipt(found || null);
      setFriends(loadedFriends);
    };
    loadData();
  }, [id]);

  // Handle scanned barcode from barcode scanner
  useScannedBarcode({
    receipt,
    receiptId: id,
    onReceiptUpdate: setReceipt,
  });

  const handleDelete = useCallback(async () => {
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
          onPress: async () => {
            try {
              await deleteReceipt(id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              router.back();
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                "Error",
                "Failed to delete receipt. Please try again."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [id]);

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

  useLayoutEffect(() => {
    navigation.setOptions(
      ReceiptHeader({
        receipt,
        colorScheme: colorScheme || "light",
        onEdit: handleEdit,
        onShare: handleShare,
        onSplit: handleSplit,
        onScanBarcode: handleScanBarcode,
        onShowBarcode: handleShowBarcode,
        onDelete: handleDelete,
      })
    );
  }, [
    navigation,
    colorScheme,
    handleDelete,
    handleScanBarcode,
    handleShowBarcode,
    handleEdit,
    handleShare,
    handleSplit,
    receipt,
  ]);

  const toggleReturnTextFormat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRawReturnText((prev) => !prev);
  }, []);

  if (!receipt) {
    return (
      <View style={styles.container}>
        <ThemedText>Receipt not found</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedView style={styles.container}>
        <ScrollView
          style={[styles.scrollView, { paddingTop: headerHeight }]}
          contentContainerStyle={styles.contentContainer}
          automaticallyAdjustContentInsets
        >
          <MerchantInfoCard receipt={receipt} />
          <TransactionDetailsCard receipt={receipt} />
          <ItemsCard receipt={receipt} />
          <TotalsCard receipt={receipt} />
          {receipt.splitData && (
            <SplitSummaryCard receipt={receipt} friends={friends} />
          )}
          {shouldShowReturnInfo(receipt.returnInfo) && (
            <ReturnInfoCard
              receipt={receipt}
              showRawReturnText={showRawReturnText}
              onToggleFormat={toggleReturnTextFormat}
            />
          )}
        </ScrollView>
      </ThemedView>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
});
