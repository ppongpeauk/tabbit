import { View, TouchableOpacity, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatMerchantAddress } from "./utils";
import { useAddressHandler } from "./hooks";
import type { StoredReceipt } from "@/utils/storage";
import { useState } from "react";

interface MerchantInfoCardProps {
  receipt: StoredReceipt;
}

export function MerchantInfoCard({ receipt }: MerchantInfoCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const handleAddressPress = useAddressHandler();
  const merchantAddress = formatMerchantAddress(receipt.merchant.address);
  const hasAddress = Boolean(receipt.merchant.address?.line1);
  const receiptTitle = receipt.name?.trim() || "";
  const merchantName = receipt.merchant.name?.trim() || "";
  const merchantLogo = receipt.merchant.logo; // Plaid enriched logo
  const [logoError, setLogoError] = useState(false);
  const showMerchantName =
    Boolean(receiptTitle) &&
    Boolean(merchantName) &&
    receiptTitle !== merchantName;

  if (!receiptTitle) {
    return null;
  }

  const subtleColor = isDark ? Colors.dark.subtle : Colors.light.icon;

  return (
    <View className="items-center gap-1">
      {/* Merchant Logo from Plaid Enrich */}
      {merchantLogo && !logoError ? (
        <View className="mb-2">
          <Image
            source={{ uri: merchantLogo }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
            }}
            resizeMode="contain"
            onError={() => setLogoError(true)}
          />
        </View>
      ) : null}
      <ThemedText
        size="3xl"
        weight="semibold"
        family="serif"
        className="text-center"
      >
        {receiptTitle}
      </ThemedText>
      {showMerchantName ? (
        <ThemedText
          size="sm"
          className="text-center"
          style={{ color: subtleColor }}
        >
          {merchantName}
        </ThemedText>
      ) : null}
      {hasAddress ? (
        <TouchableOpacity
          onPress={() => handleAddressPress(receipt.merchant.address!)}
          activeOpacity={0.7}
          className="flex-row items-center gap-1"
        >
          <SymbolView
            name="location.fill"
            tintColor={subtleColor}
            style={{ width: 14, height: 14 }}
          />
          <ThemedText size="sm" style={{ color: subtleColor }}>
            {merchantAddress}
          </ThemedText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
