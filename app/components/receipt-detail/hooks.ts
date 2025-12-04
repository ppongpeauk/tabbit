import { useCallback } from "react";
import { Alert, Linking, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import type { StoredReceipt } from "@/utils/storage";

/**
 * Hook for handling phone number press
 */
export function usePhoneHandler() {
  return useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phoneNumber = phone.replace(/[^\d+]/g, "");
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", "Unable to make phone call");
    });
  }, []);
}

/**
 * Hook for handling address press
 */
export function useAddressHandler() {
  return useCallback(
    (address: NonNullable<StoredReceipt["merchant"]["address"]>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const addressString = [
        address.line1,
        address.city,
        address.state,
        address.postalCode,
      ]
        .filter(Boolean)
        .join(", ");

      // Open in Apple Maps (iOS) or Google Maps (Android)
      const url = Platform.select({
        ios: `maps://maps.apple.com/?q=${encodeURIComponent(addressString)}`,
        android: `geo:0,0?q=${encodeURIComponent(addressString)}`,
      });

      if (url) {
        Linking.openURL(url).catch(() => {
          // Fallback to web maps
          const webUrl = `https://maps.apple.com/?q=${encodeURIComponent(
            addressString
          )}`;
          Linking.openURL(webUrl).catch(() => {
            Alert.alert("Error", "Unable to open maps");
          });
        });
      }
    },
    []
  );
}






