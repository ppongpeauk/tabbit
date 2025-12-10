import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { updateReceipt, type StoredReceipt } from "@/utils/storage";

interface UseScannedBarcodeProps {
  receipt: StoredReceipt | null;
  receiptId: string;
  onReceiptUpdate: (updatedReceipt: StoredReceipt) => void;
}

export function useScannedBarcode({
  receipt,
  receiptId,
  onReceiptUpdate,
}: UseScannedBarcodeProps) {
  useFocusEffect(
    useCallback(() => {
      const checkForScannedBarcode = async () => {
        try {
          const storageKey = "@tabbit:scanned_barcode:scannedBarcode";
          const formatKey = "@tabbit:scanned_barcode_format:scannedBarcode";
          const scannedBarcodeValue = await AsyncStorage.getItem(storageKey);
          const scannedBarcodeFormat = await AsyncStorage.getItem(formatKey);

          if (scannedBarcodeValue && receipt) {
            const updatedReceipt = {
              ...receipt,
              returnInfo: {
                ...receipt.returnInfo,
                returnBarcode: scannedBarcodeValue,
                returnBarcodeFormat: scannedBarcodeFormat || undefined,
                hasReturnBarcode: true,
              },
            };
            await updateReceipt(receiptId, {
              returnInfo: updatedReceipt.returnInfo,
            });
            onReceiptUpdate(updatedReceipt);
            await AsyncStorage.removeItem(storageKey);
            await AsyncStorage.removeItem(formatKey);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          console.error("Failed to read scanned barcode:", error);
        }
      };

      checkForScannedBarcode();
    }, [receipt, receiptId, onReceiptUpdate])
  );
}
