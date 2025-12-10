import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useUpdateReceipt } from "@/hooks/use-receipts";
import type { StoredReceipt } from "@/utils/storage";

interface UseScannedBarcodeProps {
  receipt: StoredReceipt | null;
  receiptId: string;
  onReceiptUpdate: () => void;
}

export function useScannedBarcode({
  receipt,
  receiptId,
  onReceiptUpdate,
}: UseScannedBarcodeProps) {
  const updateReceiptMutation = useUpdateReceipt();

  useFocusEffect(
    useCallback(() => {
      const checkForScannedBarcode = async () => {
        try {
          const storageKey = "@tabbit:scanned_barcode:scannedBarcode";
          const formatKey = "@tabbit:scanned_barcode_format:scannedBarcode";
          const scannedBarcodeValue = await AsyncStorage.getItem(storageKey);
          const scannedBarcodeFormat = await AsyncStorage.getItem(formatKey);

          if (scannedBarcodeValue && receipt) {
            updateReceiptMutation.mutate(
              {
                id: receiptId,
                updates: {
                  returnInfo: {
                    ...receipt.returnInfo,
                    returnBarcode: scannedBarcodeValue,
                    returnBarcodeFormat: scannedBarcodeFormat || undefined,
                    hasReturnBarcode: true,
                  },
                },
              },
              {
                onSuccess: () => {
                  onReceiptUpdate();
                  AsyncStorage.removeItem(storageKey);
                  AsyncStorage.removeItem(formatKey);
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                },
                onError: (error) => {
                  console.error(
                    "Failed to update receipt with barcode:",
                    error
                  );
                },
              }
            );
          }
        } catch (error) {
          console.error("Failed to read scanned barcode:", error);
        }
      };

      checkForScannedBarcode();
    }, [receipt, receiptId, onReceiptUpdate, updateReceiptMutation])
  );
}
