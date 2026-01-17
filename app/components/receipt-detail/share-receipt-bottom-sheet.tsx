/**
 * @author Composer
 * @description Bottom sheet for sharing receipts with QR code and native share options
 */

import { useCallback, useMemo } from "react";
import { View, TouchableOpacity, Share } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import {
  BarcodeCreatorView,
  BarcodeFormat,
} from "react-native-barcode-creator";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/button";
import type React from "react";
import { WEB_BASE_URL } from "@/utils/config";

interface ShareReceiptBottomSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receiptId: string;
  receiptName?: string;
}

export function ShareReceiptBottomSheet({
  bottomSheetRef,
  receiptId,
  receiptName,
}: ShareReceiptBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const shareUrl = useMemo(() => {
    return `${WEB_BASE_URL}/receipts/${receiptId}`;
  }, [receiptId]);

  const shareMessage = useMemo(() => {
    const name = receiptName ? `"${receiptName}"` : "this receipt";
    return `Check out ${name} on Tabbit!\n\n${shareUrl}`;
  }, [receiptName, shareUrl]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleShare = useCallback(async () => {
    if (!receiptId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        url: shareUrl,
        title: receiptName || "Share Receipt",
        message: shareMessage,
      });
    } catch (error) {
      console.error("Failed to share receipt:", error);
    }
  }, [receiptId, shareUrl, shareMessage, receiptName]);

  if (!receiptId) return null;

  return (
    <TrueSheet
      ref={bottomSheetRef}
    // backgroundColor={
    //   isDark ? Colors.dark.background : Colors.light.background
    // }
    >
      <View className="flex-1 px-6 pt-8 pb-10">
        {/* Header with close button */}
        <View className="flex-row justify-between items-center mb-8">
          <ThemedText size="xl" weight="bold">
            Share Receipt
          </ThemedText>
          <TouchableOpacity
            onPress={handleClose}
            className="p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SymbolView
              name="xmark.circle.fill"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
              size={28}
            />
          </TouchableOpacity>
        </View>

        {/* QR Code Section */}
        <View className="items-center mb-8">
          <View
            className="p-5 rounded-3xl items-center justify-center mb-4"
            style={{
              backgroundColor: "white",
              borderColor: isDark ? "white" : "black",
              borderWidth: 4,
            }}
          >
            <BarcodeCreatorView
              value={shareUrl}
              format={BarcodeFormat.QR}
              background="white"
              foregroundColor="black"
              style={{ width: 200, height: 200 }}
            />
          </View>
          <ThemedText
            size="base"
            className="text-center text-neutral-500 dark:text-neutral-400"
            style={{
              color: isDark ? Colors.dark.icon : Colors.light.icon,
            }}
          >
            Show this QR code to your friends.
          </ThemedText>
        </View>

        {/* Share Button */}
        <View className="w-full">
          <Button
            variant="secondary"
            onPress={handleShare}
            fullWidth
            leftIcon={
              <SymbolView
                name="square.and.arrow.up"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
                size={20}
              />
            }
          >
            More Options
          </Button>
        </View>
      </View>
    </TrueSheet>
  );
}
