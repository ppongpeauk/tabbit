import { View, TouchableOpacity, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatMerchantAddress } from "./utils";
import { getCategoryEmoji, getCategoryName } from "@/utils/categories";
import { useAddressHandler } from "./hooks";
import type { StoredReceipt } from "@/utils/storage";
import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { AppleMaps } from "expo-maps";

interface MerchantInfoCardProps {
  receipt: StoredReceipt;
  isCollaborator: boolean;
  onShare: () => void;
  onMerchantPress: () => void;
  onCurrencyPress?: () => void;
}

function AddressMap({ address, isDark }: { address: StoredReceipt["merchant"]["address"]; isDark: boolean }) {
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const handleAddressPress = useAddressHandler();

  useEffect(() => {
    if (!address?.line1) {
      setIsLoading(false);
      return;
    }

    const geocodeAddress = async () => {
      try {
        const addressString = [
          address.line1,
          address.city,
          address.state,
          address.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        const results = await Location.geocodeAsync(addressString);
        if (results.length > 0) {
          setCoordinates({
            latitude: results[0].latitude,
            longitude: results[0].longitude,
          });
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    geocodeAddress();
  }, [address]);

  if (!address?.line1 || isLoading || !coordinates) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleAddressPress(address)}
      className="h-32 overflow-hidden"
      style={{
        backgroundColor: isDark
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
      }}
    >
      <View pointerEvents="none" style={{ flex: 1 }}>
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={{
            coordinates: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            },
            zoom: 16,
          }}
          markers={[
            {
              id: "merchant-location",
              coordinates: {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              },
            },
          ]}
          uiSettings={{
            compassEnabled: false,
            myLocationButtonEnabled: false,
            scaleBarEnabled: false,
            togglePitchEnabled: false,
          }}
          properties={{
            mapType: AppleMaps.MapType.STANDARD,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

function HeroSection({ receipt, isDark, onMerchantPress }: { receipt: StoredReceipt; isDark: boolean; onMerchantPress: () => void }) {
  const handleAddressPress = useAddressHandler();
  const merchantAddress = formatMerchantAddress(receipt.merchant.address);
  const hasAddress = Boolean(receipt.merchant.address?.line1);
  const receiptTitle = receipt.name?.trim() || "";
  const merchantName = receipt.merchant.name?.trim() || "";
  const merchantLogo = receipt.merchant.logo;
  const [logoError, setLogoError] = useState(false);

  return (
    <View
      className={`px-4 pt-6 pb-4 ${merchantLogo && !logoError ? "gap-4" : "gap-0"}`}
    >
      <TouchableOpacity
        onPress={onMerchantPress}
        activeOpacity={0.7}
        className="flex flex-row items-center gap-4"
      >
        {merchantLogo && !logoError ? (
          <Image
            source={{ uri: merchantLogo }}
            resizeMode="contain"
            onError={() => setLogoError(true)}
            className="w-16 h-16 border-2 border-gray-200 dark:border-gray-800 rounded-2xl"
          />
        ) : null}
        <ThemedText size="xl" weight="bold" family="sans" className="text-left flex-1">
          {receiptTitle || merchantName}
        </ThemedText>
        <SymbolView
          name="chevron.right"
          tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
          style={{ width: 16, height: 16 }}
        />
      </TouchableOpacity>
      {hasAddress ? (
        <TouchableOpacity
          onPress={() => handleAddressPress(receipt.merchant.address!)}
          activeOpacity={0.7}
          className="items-start"
        >
          <ThemedText
            size="base"
            className="text-left"
            style={{
              color: isDark ? Colors.dark.subtle : Colors.light.icon,
            }}
          >
            {merchantAddress}
          </ThemedText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function MetadataGrid({
  receipt,
  isDark,
  onCurrencyPress,
}: {
  receipt: StoredReceipt;
  isDark: boolean;
  onCurrencyPress?: () => void;
}) {
  const date = new Date(receipt.transaction.datetime || receipt.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const categoryRaw = receipt.merchant.category?.[0] || "OTHER";
  const category = getCategoryName(categoryRaw);
  const categoryEmoji = getCategoryEmoji(categoryRaw);
  const total = receipt.totals.total || 0;
  const currency = receipt.totals.currency || "USD";

  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const subtleColor = isDark ? Colors.dark.subtle : Colors.light.icon;

  return (
    <View className="px-6 pt-5 pb-6">
      <View className="flex-row gap-4 mb-6">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <SymbolView
              name="calendar"
              tintColor={iconColor}
              style={{ width: 20, height: 20 }}
            />
            <ThemedText
              size="sm"
              weight="semibold"
              style={{ color: subtleColor }}
            >
              Date
            </ThemedText>
          </View>
          <ThemedText size="base" weight="semibold" family="sans">
            {formattedDate}
          </ThemedText>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <SymbolView
              name="tag.fill"
              tintColor={iconColor}
              style={{ width: 20, height: 20 }}
            />
            <ThemedText
              size="sm"
              weight="semibold"
              style={{ color: subtleColor }}
            >
              Category
            </ThemedText>
          </View>
          <View className="flex-row items-start gap-2">
            <ThemedText size="base">{categoryEmoji}</ThemedText>
            <ThemedText size="base" weight="semibold" family="sans">
              {category}
            </ThemedText>
          </View>
        </View>
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <SymbolView
              name="creditcard.fill"
              tintColor={iconColor}
              style={{ width: 20, height: 20 }}
            />
            <ThemedText
              size="sm"
              weight="semibold"
              style={{ color: subtleColor }}
            >
              Total Amount
            </ThemedText>
          </View>
          <ThemedText size="base" weight="semibold" family="sans">
            ${total.toFixed(2)}
          </ThemedText>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <SymbolView
              name="globe"
              tintColor={iconColor}
              style={{ width: 20, height: 20 }}
            />
            <ThemedText
              size="sm"
              weight="semibold"
              style={{ color: subtleColor }}
            >
              Currency
            </ThemedText>
          </View>
          {onCurrencyPress ? (
            <TouchableOpacity
              onPress={onCurrencyPress}
              activeOpacity={0.7}
              className="flex-row items-center gap-2"
            >
              <ThemedText size="base" weight="semibold" family="sans">
                {currency}
              </ThemedText>
              <SymbolView
                name="chevron.right"
                tintColor={subtleColor}
                style={{ width: 14, height: 14 }}
              />
            </TouchableOpacity>
          ) : (
            <ThemedText size="base" weight="semibold" family="sans">
              {currency}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

export function MerchantInfoCard({
  receipt,
  isCollaborator,
  onShare,
  onMerchantPress,
  onCurrencyPress,
}: MerchantInfoCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className="rounded-[20px] overflow-hidden border"
      style={{
        backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
        borderColor: isDark
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
      }}
    >
      {receipt.merchant.address?.line1 ? (
        <AddressMap address={receipt.merchant.address} isDark={isDark} />
      ) : null}

      <HeroSection
        receipt={receipt}
        isDark={isDark}
        onMerchantPress={onMerchantPress}
      />

      <View
        className="h-px mx-6"
        style={{
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        }}
      />

      <MetadataGrid
        receipt={receipt}
        isDark={isDark}
        onCurrencyPress={onCurrencyPress}
      />

      {isCollaborator && (
        <>
          <View
            className="h-px"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onShare}
            className="p-4 flex-row items-center gap-3"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
            }}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)",
              }}
            >
              <SymbolView
                name="square.and.arrow.up"
                tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                style={{ width: 22, height: 22 }}
              />
            </View>
            <View className="flex-1">
              <ThemedText size="base" weight="semibold">
                Share Receipt
              </ThemedText>
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.subtle : Colors.light.icon,
                }}
              >
                Tap to share this receipt with others
              </ThemedText>
            </View>
            <SymbolView
              name="chevron.right"
              tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
              style={{ width: 14, height: 14 }}
            />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
