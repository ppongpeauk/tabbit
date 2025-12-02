/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Return information card component
 */

import { View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { formatReturnByDate } from "@/utils/format";
import {
  getCardStyle,
  hasBulletPointData,
  formatReturnPolicyBullets,
  getRawReturnText,
} from "./utils";
import { BarcodeDisplay } from "./barcode-display";
import type { StoredReceipt } from "@/utils/storage";

interface ReturnInfoCardProps {
  receipt: StoredReceipt;
  showRawReturnText: boolean;
  onToggleFormat: () => void;
}

export function ReturnInfoCard({
  receipt,
  showRawReturnText,
  onToggleFormat,
}: ReturnInfoCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  if (!receipt.returnInfo) return null;

  const canToggle = hasBulletPointData(receipt.returnInfo);
  const CardWrapper = canToggle ? TouchableOpacity : View;
  const wrapperProps = canToggle
    ? { activeOpacity: 0.7, onPress: onToggleFormat }
    : {};

  return (
    <CardWrapper {...wrapperProps} style={[styles.card, getCardStyle(isDark)]}>
      <View style={styles.returnInfoHeader}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          Return Information
        </ThemedText>
        {canToggle && (
          <SymbolView
            name={showRawReturnText ? "text.alignleft" : "list.bullet"}
            tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            style={styles.toggleIcon}
          />
        )}
      </View>
      {(receipt.returnInfo.returnPolicyText ||
        receipt.returnInfo.returnPolicyRawText) && (
        <ThemedText size="sm" style={{ opacity: 0.8, marginBottom: 8 }}>
          {canToggle
            ? showRawReturnText
              ? getRawReturnText(receipt.returnInfo)
              : formatReturnPolicyBullets(receipt.returnInfo.returnPolicyText)
            : getRawReturnText(receipt.returnInfo)}
        </ThemedText>
      )}
      {receipt.returnInfo.returnByDate && (
        <View style={styles.detailRow}>
          <ThemedText size={15} style={{ opacity: 0.7 }}>
            Return By
          </ThemedText>
          <ThemedText size={15} weight="semibold">
            {formatReturnByDate(receipt.returnInfo.returnByDate)}
          </ThemedText>
        </View>
      )}
      {receipt.returnInfo.exchangeByDate && (
        <View style={styles.detailRow}>
          <ThemedText size={15} style={{ opacity: 0.7 }}>
            Exchange By
          </ThemedText>
          <ThemedText size={15} weight="semibold">
            {formatReturnByDate(receipt.returnInfo.exchangeByDate)}
          </ThemedText>
        </View>
      )}
      {receipt.returnInfo.returnBarcode && (
        <View style={styles.barcodeSection}>
          <ThemedText size={15} style={{ opacity: 0.7, marginBottom: 8 }}>
            Return Code
          </ThemedText>
          <BarcodeDisplay value={receipt.returnInfo.returnBarcode} />
        </View>
      )}
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  returnInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleIcon: {
    width: 18,
    height: 18,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  barcodeSection: {
    marginTop: 8,
  },
});

