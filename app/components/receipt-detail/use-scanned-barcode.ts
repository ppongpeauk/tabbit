/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Hook for handling scanned barcode updates
 */

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
          const storageKey = "@recipio:scanned_barcode:scannedBarcode";
          const scannedBarcodeValue = await AsyncStorage.getItem(storageKey);

          if (scannedBarcodeValue && receipt) {
            // Update receipt with scanned barcode
            const updatedReceipt = {
              ...receipt,
              returnInfo: {
                ...receipt.returnInfo,
                returnBarcode: scannedBarcodeValue,
                hasReturnBarcode: true,
              },
            };
            await updateReceipt(receiptId, {
              returnInfo: updatedReceipt.returnInfo,
            });
            onReceiptUpdate(updatedReceipt);
            // Clear the stored barcode to avoid re-triggering
            await AsyncStorage.removeItem(storageKey);
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

