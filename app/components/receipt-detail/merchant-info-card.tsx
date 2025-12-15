import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { AppleMaps } from "expo-maps";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatMerchantAddress, getCardStyle } from "./utils";
import { usePhoneHandler, useAddressHandler } from "./hooks";
import type { StoredReceipt } from "@/utils/storage";

interface MerchantInfoCardProps {
  receipt: StoredReceipt;
}

export function MerchantInfoCard({ receipt }: MerchantInfoCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const handlePhonePress = usePhoneHandler();
  const handleAddressPress = useAddressHandler();
  const merchantAddress = formatMerchantAddress(receipt.merchant.address);
  const hasAddress = receipt.merchant.address?.line1;

  return (
    <View style={styles.container}>
      <ThemedText
        size="3xl"
        weight="semibold"
        family="sans"
        style={styles.merchantName}
      >
        {receipt.merchant.name}
      </ThemedText>
      {hasAddress && (
        <TouchableOpacity
          onPress={() => handleAddressPress(receipt.merchant.address!)}
          activeOpacity={0.7}
          style={styles.locationRow}
        >
          <SymbolView
            name="location.fill"
            tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
            style={styles.locationIcon}
          />
          <ThemedText
            size="sm"
            style={{
              color: isDark ? Colors.dark.subtle : Colors.light.icon,
            }}
          >
            {merchantAddress}
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  merchantName: {
    textAlign: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationIcon: {
    width: 14,
    height: 14,
  },
});
