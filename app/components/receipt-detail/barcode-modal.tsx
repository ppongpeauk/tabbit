/**
 * @author Composer
 * @description Modal component for displaying return barcode/QR code
 */

import { useCallback, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type React from "react";
import { BarcodeDisplay } from "./barcode-display";

interface BarcodeModalProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
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

  const snapPoints = useMemo(() => ["50%"], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        animatedIndex={props.animatedIndex}
        animatedPosition={props.animatedPosition}
        style={props.style}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={{
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark
          ? "rgba(255, 255, 255, 0.3)"
          : "rgba(0, 0, 0, 0.3)",
      }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.contentContainer}>
        <View style={styles.header}>
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
      </BottomSheetView>
    </BottomSheetModal>
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
