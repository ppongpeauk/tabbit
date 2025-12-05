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
    <View>
      {/* Map Preview */}
      {Platform.OS === "ios" && (
        <View style={styles.mapContainer}>
          <AppleMaps.View
            style={styles.map}
            cameraPosition={{
              coordinates: {
                latitude: 37.7749, // Default to SF, would need geocoding
                longitude: -122.4194,
              },
              zoom: 15,
            }}
            markers={[
              {
                coordinates: {
                  latitude: 37.7749,
                  longitude: -122.4194,
                },
                title: receipt.merchant.name,
                systemImage: "mappin",
              },
            ]}
            properties={{
              isMyLocationEnabled: false,
            }}
            uiSettings={{
              myLocationButtonEnabled: false,
              compassEnabled: false,
              scaleBarEnabled: false,
              togglePitchEnabled: false,
            }}
          />
          <TouchableOpacity
            style={styles.mapOverlay}
            onPress={() => handleAddressPress(receipt.merchant.address!)}
            activeOpacity={1}
          />
        </View>
      )}
      <ThemedText
        size="2xl"
        weight="bold"
        family="sans"
        style={{ marginTop: 16 }}
      >
        {receipt.merchant.name}
      </ThemedText>

      {/* Phone Number */}
      {receipt.merchant.phone && (
        <TouchableOpacity
          onPress={() => handlePhonePress(receipt.merchant.phone!)}
          activeOpacity={0.7}
          style={styles.phoneRow}
        >
          <SymbolView
            name="phone"
            tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            style={styles.phoneIcon}
          />
          <ThemedText size="lg" style={{ flex: 1 }}>
            {receipt.merchant.phone}
          </ThemedText>
          <SymbolView
            name="arrow.up.right.square"
            tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            style={styles.externalIcon}
          />
        </TouchableOpacity>
      )}

      {/* Address with Map */}
      {hasAddress && (
        <View style={styles.addressSection}>
          <TouchableOpacity
            onPress={() => handleAddressPress(receipt.merchant.address!)}
            activeOpacity={0.7}
          >
            <View style={styles.addressRow}>
              <ThemedText size="base" style={styles.addressText}>
                {merchantAddress}
              </ThemedText>
              <SymbolView
                name="arrow.up.right.square"
                tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                style={styles.externalIcon}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  addressSection: {
    gap: 12,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressText: {
    flex: 1,
    flexShrink: 1,
  },
  externalIcon: {
    width: 16,
    height: 16,
  },
  mapContainer: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneIcon: {
    width: 20,
    height: 20,
  },
});
