import { View, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { formatReturnByDate } from "@/utils/format";
import {
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

/**
 * Check if return policy text has content
 */
function hasPolicyTextContent(
  returnPolicyText?: string | string[],
  returnPolicyRawText?: string
): boolean {
  if (returnPolicyRawText?.trim()) return true;
  if (!returnPolicyText) return false;
  return Array.isArray(returnPolicyText)
    ? returnPolicyText.length > 0
    : returnPolicyText.trim().length > 0;
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
  const hasPolicyText = hasPolicyTextContent(
    receipt.returnInfo.returnPolicyText,
    receipt.returnInfo.returnPolicyRawText
  );

  const policyTextContent = canToggle
    ? showRawReturnText
      ? getRawReturnText(receipt.returnInfo)
      : formatReturnPolicyBullets(receipt.returnInfo.returnPolicyText)
    : getRawReturnText(receipt.returnInfo);

  const CardWrapper = canToggle ? TouchableOpacity : View;
  const wrapperProps = canToggle
    ? { activeOpacity: 0.7, onPress: onToggleFormat }
    : {};

  return (
    <CardWrapper
      {...wrapperProps}
      className={`rounded-[20px] p-4 gap-1 border ${
        isDark ? "bg-[#1A1D1E] border-white/5" : "bg-white border-black/5"
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View className="flex-row justify-between items-center">
        <ThemedText size="xl" weight="bold" className="mb-1">
          Return Information
        </ThemedText>
        {canToggle && (
          <SymbolView
            name={showRawReturnText ? "text.alignleft" : "list.bullet"}
            tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            style={{ width: 18, height: 18 }}
          />
        )}
      </View>

      {hasPolicyText && (
        <ThemedText size="sm" className="opacity-80 mb-2">
          {policyTextContent}
        </ThemedText>
      )}

      {receipt.returnInfo.returnByDate && (
        <View className="flex-row justify-between items-center py-2">
          <ThemedText size={15} className="opacity-70">
            Return By
          </ThemedText>
          <ThemedText size={15} weight="semibold">
            {formatReturnByDate(receipt.returnInfo.returnByDate)}
          </ThemedText>
        </View>
      )}

      {receipt.returnInfo.exchangeByDate && (
        <View className="flex-row justify-between items-center py-2">
          <ThemedText size={15} className="opacity-70">
            Exchange By
          </ThemedText>
          <ThemedText size={15} weight="semibold">
            {formatReturnByDate(receipt.returnInfo.exchangeByDate)}
          </ThemedText>
        </View>
      )}

      {receipt.returnInfo.returnBarcode?.trim() && (
        <View className="mt-2">
          <ThemedText size={15} className="opacity-70 mb-2">
            Return Code
          </ThemedText>
          <BarcodeDisplay
            value={receipt.returnInfo.returnBarcode}
            format={receipt.returnInfo.returnBarcodeFormat}
          />
        </View>
      )}
    </CardWrapper>
  );
}
