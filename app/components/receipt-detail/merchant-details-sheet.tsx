/**
 * @description Bottom sheet for displaying merchant details
 */

import { useState, useEffect, useCallback } from "react";
import { ScrollView, View, TouchableOpacity, Image, Linking, Alert } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { AppleMaps } from "expo-maps";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { formatMerchantAddress, useAddressHandler, usePhoneHandler } from "./";
import { getCategoryName, getCategoryEmoji } from "@/utils/categories";
import type { StoredReceipt } from "@/utils/storage";
import type React from "react";

interface MerchantDetailsSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receipt: StoredReceipt;
  onClose: () => void;
}

export function MerchantDetailsSheet({
  bottomSheetRef,
  receipt,
  onClose,
}: MerchantDetailsSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const handleAddressPress = useAddressHandler();
  const handlePhonePress = usePhoneHandler();
  const merchantAddress = formatMerchantAddress(receipt.merchant.address);
  const hasAddress = Boolean(receipt.merchant.address?.line1);
  const merchantName = receipt.merchant.name?.trim() || "";
  const merchantLogo = receipt.merchant.logo;
  const merchantPhone = receipt.merchant.phone;
  const merchantWebsite = receipt.merchant.website;
  const categoryRaw = receipt.merchant.category?.[0] || "OTHER";
  const category = getCategoryName(categoryRaw);
  const categoryEmoji = getCategoryEmoji(categoryRaw);
  const [logoError, setLogoError] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);

  // Geocode address for map
  useEffect(() => {
    if (!receipt.merchant.address?.line1) {
      setIsLoadingMap(false);
      return;
    }

    const geocodeAddress = async () => {
      try {
        const addressString = [
          receipt.merchant.address?.line1,
          receipt.merchant.address?.city,
          receipt.merchant.address?.state,
          receipt.merchant.address?.postalCode,
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
        setIsLoadingMap(false);
      }
    };

    geocodeAddress();
  }, [receipt.merchant.address]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
    onClose();
  }, [bottomSheetRef, onClose]);

  const handlePhoneNumberPress = useCallback(() => {
    if (merchantPhone) {
      handlePhonePress(merchantPhone);
    }
  }, [merchantPhone, handlePhonePress]);

  const handleWebsitePress = useCallback(() => {
    if (merchantWebsite) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const url = merchantWebsite.startsWith("http")
        ? merchantWebsite
        : `https://${merchantWebsite}`;
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Unable to open website");
      });
    }
  }, [merchantWebsite]);

  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const subtleColor = isDark ? Colors.dark.subtle : Colors.light.icon;

  return (
    <TrueSheet
      ref={bottomSheetRef}
      detents={['auto']}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      scrollable
    >
      <ScrollView
        contentContainerClassName="px-6 py-8"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <ThemedText size="xl" weight="bold">
            Merchant Info
          </ThemedText>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SymbolView
              name="xmark.circle.fill"
              tintColor={iconColor}
              size={28}
            />
          </TouchableOpacity>
        </View>

        {/* Merchant Logo and Name */}
        <View className="items-center mb-6">
          {merchantLogo && !logoError ? (
            <View className="mb-4">
              <Image
                className="w-24 h-24 rounded-2xl border-2 border-gray-200 dark:border-gray-800"
                source={{ uri: merchantLogo }}
                resizeMode="contain"
                onError={() => setLogoError(true)}
              />
            </View>
          ) : null}
          <ThemedText size="2xl" weight="semibold" family="sans" className={`text-center ${merchantLogo ? "" : "my-8"}`}>
            {merchantName}
          </ThemedText>
        </View>

        {/* Details Section */}
        <View className="gap-4">
          {/* Address */}
          {hasAddress ? (
            <TouchableOpacity
              onPress={() => handleAddressPress(receipt.merchant.address!)}
              activeOpacity={0.7}
              className="flex-row items-start gap-3"
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
                  name="location.fill"
                  tintColor={iconColor}
                  style={{ width: 20, height: 20 }}
                />
              </View>
              <View className="flex-1">
                <ThemedText
                  size="sm"
                  weight="semibold"
                  style={{ color: subtleColor }}
                >
                  Address
                </ThemedText>
                <ThemedText size="base" weight="semibold" family="sans">
                  {merchantAddress}
                </ThemedText>
              </View>
              <SymbolView
                name="chevron.right"
                tintColor={subtleColor}
                style={{ width: 16, height: 16 }}
              />
            </TouchableOpacity>
          ) : null}

          {/* Phone */}
          {merchantPhone ? (
            <TouchableOpacity
              onPress={handlePhoneNumberPress}
              activeOpacity={0.7}
              className="flex-row items-start gap-3"
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
                  name="phone.fill"
                  tintColor={iconColor}
                  style={{ width: 20, height: 20 }}
                />
              </View>
              <View className="flex-1">
                <ThemedText
                  size="sm"
                  weight="semibold"
                  style={{ color: subtleColor }}
                >
                  Phone
                </ThemedText>
                <ThemedText size="base" weight="semibold" family="sans">
                  {merchantPhone}
                </ThemedText>
              </View>
              <SymbolView
                name="chevron.right"
                tintColor={subtleColor}
                style={{ width: 16, height: 16 }}
              />
            </TouchableOpacity>
          ) : null}

          {/* Website */}
          {merchantWebsite ? (
            <TouchableOpacity
              onPress={handleWebsitePress}
              activeOpacity={0.7}
              className="flex-row items-start gap-3"
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
                  name="globe"
                  tintColor={iconColor}
                  style={{ width: 20, height: 20 }}
                />
              </View>
              <View className="flex-1">
                <ThemedText
                  size="sm"
                  weight="semibold"
                  style={{ color: subtleColor }}
                >
                  Website
                </ThemedText>
                <ThemedText size="base" weight="semibold" family="sans">
                  {merchantWebsite}
                </ThemedText>
              </View>
              <SymbolView
                name="chevron.right"
                tintColor={subtleColor}
                style={{ width: 16, height: 16 }}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </TrueSheet>
  );
}
