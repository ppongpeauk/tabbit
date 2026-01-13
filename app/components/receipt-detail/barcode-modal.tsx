/**
 * @author Composer
 * @description Modal component for displaying return barcode/QR code
 */

import { useCallback, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type React from "react";
import { BarcodeDisplay } from "./barcode-display";

interface BarcodeModalProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  barcodeValue: string;
  barcodeFormat?: string;
}

export function BarcodeModal({
  bottomSheetRef,
  barcodeValue,
  barcodeFormat,
}: BarcodeModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Don't render if barcode value is invalid
  if (
    !barcodeValue ||
    typeof barcodeValue !== "string" ||
    barcodeValue.trim().length === 0
  ) {
    return null;
  }

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  return (
    <TrueSheet
      ref={bottomSheetRef}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      cornerRadius={24}
    >
      <View style={styles.contentContainer}>
        <View style={styles.header} className="mt-8">
          <ThemedText size="xl" weight="bold">
            Return Barcode
          </ThemedText>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SymbolView
              name="xmark.circle.fill"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
              size={28}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.barcodeContainer}>
          <BarcodeDisplay value={barcodeValue} format={barcodeFormat} />
        </View>
      </View>
    </TrueSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  closeButton: {
    padding: 4,
  },
  barcodeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
