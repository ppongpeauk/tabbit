import { View, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { formatReturnByDate } from "@/utils/format";
import {
  hasBulletPointData,
  formatReturnPolicyBullets,
  getRawReturnText,
} from "./utils";
import { BarcodeDisplay } from "./barcode-display";
import type { StoredReceipt } from "@/utils/storage";
import moment from "moment";

interface ReturnInfoCardProps {
  receipt: StoredReceipt;
  showRawReturnText: boolean;
  onToggleFormat: () => void;
  isDark: boolean;
}

function isReturnPeriodExpired(returnByDate?: string): boolean {
  if (!returnByDate) {
    return false;
  }

  const returnDate = moment(returnByDate);
  if (!returnDate.isValid()) {
    return false;
  }

  const now = moment();
  return returnDate.isBefore(now, "day");
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
  isDark,
}: ReturnInfoCardProps) {
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

  const showReturnPeriodExpired = isReturnPeriodExpired(receipt.returnInfo?.returnByDate);
  const showKeepPhysicalReceipt = receipt.returnInfo?.shouldKeepPhysicalReceipt && !showReturnPeriodExpired;

  return (
    <View
      className={`rounded-[20px] overflow-hidden border ${isDark ? "bg-[#1A1D1E] border-white/5" : "bg-white border-black/5"
        }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <CardWrapper
        {...wrapperProps}
        className="p-4 gap-1"
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

      {/* Return Period Expired Section */}
      {showReturnPeriodExpired ? (
        <>
          <View
            className="h-px"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          />
          <View
            className="p-4"
            style={{
              backgroundColor: isDark
                ? "rgba(234, 179, 8, 0.15)"
                : "rgba(234, 179, 8, 0.08)",
            }}
          >
            <View className="flex-row items-start gap-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isDark
                    ? "rgba(234, 179, 8, 0.2)"
                    : "rgba(234, 179, 8, 0.15)",
                }}
              >
                <SymbolView
                  name="exclamationmark.triangle.fill"
                  tintColor="#EAB308"
                  style={{ width: 24, height: 24 }}
                />
              </View>
              <View className="flex-1">
                <ThemedText size="base" weight="semibold">
                  Return Period Passed
                </ThemedText>
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark
                      ? "rgba(255, 255, 255, 0.8)"
                      : "rgba(0, 0, 0, 0.7)",
                  }}
                >
                  The return period for this purchase has passed.
                </ThemedText>
              </View>
            </View>
          </View>
        </>
      ) : showKeepPhysicalReceipt ? (
        <>
          <View
            className="h-px"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          />
          <View
            className="p-4"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 149, 0, 0.15)"
                : "rgba(255, 149, 0, 0.08)",
            }}
          >
            <View className="flex-row items-start gap-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 149, 0, 0.2)"
                    : "rgba(255, 149, 0, 0.15)",
                }}
              >
                <SymbolView
                  name="doc.text"
                  tintColor="#FF9500"
                  style={{ width: 24, height: 24 }}
                />
              </View>
              <View className="flex-1">
                <ThemedText size="base" weight="semibold">
                  Keep Your Physical Receipt
                </ThemedText>
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark
                      ? "rgba(255, 255, 255, 0.8)"
                      : "rgba(0, 0, 0, 0.7)",
                  }}
                >
                  You&apos;ll need to show the physical receipt to return items.
                </ThemedText>
              </View>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
