/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt detail screen - mobile optimized
 */

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  ScrollView,
  StyleSheet,
  View,
  Image,
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getReceipts,
  deleteReceipt,
  updateReceipt,
  type StoredReceipt,
} from "@/utils/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { ContextMenu, Host, Button } from "@expo/ui/swift-ui";
import { AppleMaps } from "expo-maps";
import { formatCurrency, formatDate } from "@/utils/format";

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
    scannedBarcode?: string;
  }>();
  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

  useEffect(() => {
    const loadReceipt = async () => {
      const receipts = await getReceipts();
      const found = receipts.find((r) => r.id === id);
      setReceipt(found || null);
    };
    loadReceipt();
  }, [id]);

  // Handle scanned barcode from barcode scanner
  useFocusEffect(
    useCallback(() => {
      const checkForScannedBarcode = async () => {
        try {
          const storageKey = "@recipio:scanned_barcode:scannedBarcode";
          const scannedBarcodeValue = await AsyncStorage.getItem(storageKey);

          if (scannedBarcodeValue && receipt) {
            // Update receipt with scanned barcode
            const updatedReceipt = {
              ...receipt,
              returnInfo: {
                ...receipt.returnInfo,
                returnBarcode: scannedBarcodeValue,
                hasReturnBarcode: true,
              },
            };
            await updateReceipt(id, {
              returnInfo: updatedReceipt.returnInfo,
            });
            setReceipt(updatedReceipt);
            // Clear the stored barcode to avoid re-triggering
            await AsyncStorage.removeItem(storageKey);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          console.error("Failed to read scanned barcode:", error);
        }
      };

      checkForScannedBarcode();
    }, [receipt, id])
  );

  const handleDelete = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Receipt",
      "Are you sure you want to delete this receipt? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReceipt(id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              router.back();
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                "Error",
                "Failed to delete receipt. Please try again."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [id]);

  const handleScanBarcode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/barcode-scanner",
      params: { onScan: "scannedBarcode" },
    });
  }, []);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/${id}/edit`);
  }, [id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: receipt?.name || receipt?.merchant.name || "Receipt Details",
      headerTitle: () => (
        <View style={{ flexDirection: "column", alignItems: "center" }}>
          <ThemedText size="base" weight="bold" family="sans">
            {receipt?.name || receipt?.merchant.name || "Receipt Details"}
          </ThemedText>
          <ThemedText size="xs" family="sans">
            {receipt?.items.length || 0} Items{" • "}
            {formatDate(receipt?.transaction.datetime || "", false)}
            {" • "}
            {formatCurrency(
              receipt?.totals.total || 0,
              receipt?.totals.currency || "USD"
            )}{" "}
            {receipt?.totals.currency || "USD"}
          </ThemedText>
        </View>
      ),
      headerRight: () => (
        <Host>
          <ContextMenu>
            <ContextMenu.Items>
              <Button systemImage="pencil" onPress={handleEdit}>
                Edit Receipt
              </Button>
              <Button
                systemImage="qrcode.viewfinder"
                onPress={handleScanBarcode}
              >
                Scan Return Barcode
              </Button>
              <Button
                systemImage="trash"
                onPress={handleDelete}
                role="destructive"
              >
                Delete Receipt
              </Button>
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <HeaderButton
                style={{
                  alignContent: "center",
                  justifyContent: "center",
                }}
              >
                <SymbolView
                  name="ellipsis"
                  tintColor={
                    colorScheme === "dark"
                      ? Colors.dark.text
                      : Colors.light.text
                  }
                />
              </HeaderButton>
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      ),
    });
  }, [
    navigation,
    colorScheme,
    handleDelete,
    handleScanBarcode,
    handleEdit,
    receipt,
  ]);

  const handlePhonePress = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phoneNumber = phone.replace(/[^\d+]/g, "");
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", "Unable to make phone call");
    });
  }, []);

  const handleAddressPress = useCallback(
    (address: NonNullable<StoredReceipt["merchant"]["address"]>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const addressString = [
        address.line1,
        address.city,
        address.state,
        address.postalCode,
      ]
        .filter(Boolean)
        .join(", ");

      // Open in Apple Maps (iOS) or Google Maps (Android)
      const url = Platform.select({
        ios: `maps://maps.apple.com/?q=${encodeURIComponent(addressString)}`,
        android: `geo:0,0?q=${encodeURIComponent(addressString)}`,
      });

      if (url) {
        Linking.openURL(url).catch(() => {
          // Fallback to web maps
          const webUrl = `https://maps.apple.com/?q=${encodeURIComponent(
            addressString
          )}`;
          Linking.openURL(webUrl).catch(() => {
            Alert.alert("Error", "Unable to open maps");
          });
        });
      }
    },
    []
  );

  if (!receipt) {
    return (
      <View style={styles.container}>
        <ThemedText>Receipt not found</ThemedText>
      </View>
    );
  }

  const isDark = colorScheme === "dark";
  const merchantAddress = receipt.merchant.address
    ? [
        receipt.merchant.address.line1,
        receipt.merchant.address.city,
        receipt.merchant.address.state,
        receipt.merchant.address.postalCode,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const hasAddress = receipt.merchant.address?.line1;

  return (
    <View style={styles.container}>
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          automaticallyAdjustContentInsets
        >
          {/* Receipt Image */}
          {/* {receipt.imageUri && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: receipt.imageUri }} style={styles.image} />
            </View>
          )} */}

          {/* Merchant Info Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                borderWidth: 1,
              },
            ]}
          >
            <ThemedText size="xl" weight="bold" family="serif">
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
                <ThemedText size="base" style={{ flex: 1 }}>
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
                    <ThemedText size="sm">{merchantAddress}</ThemedText>
                    <SymbolView
                      name="arrow.up.right.square"
                      tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                      style={styles.externalIcon}
                    />
                  </View>
                </TouchableOpacity>

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
                      onPress={() =>
                        handleAddressPress(receipt.merchant.address!)
                      }
                      activeOpacity={1}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Transaction Details Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                borderWidth: 1,
              },
            ]}
          >
            <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
              Transaction Details
            </ThemedText>
            <View style={styles.detailRow}>
              <ThemedText size={15} style={{ opacity: 0.7 }}>
                Date & Time
              </ThemedText>
              <ThemedText size={15} weight="semibold">
                {formatDate(receipt.transaction.datetime)}
              </ThemedText>
            </View>
            {receipt.merchant.receiptNumber && (
              <View style={styles.detailRow}>
                <ThemedText size={15} style={{ opacity: 0.7 }}>
                  Receipt #
                </ThemedText>
                <ThemedText size={15} weight="semibold">
                  {receipt.merchant.receiptNumber}
                </ThemedText>
              </View>
            )}
            {receipt.transaction.transactionId && (
              <View style={styles.detailRow}>
                <ThemedText size={15} style={{ opacity: 0.7 }}>
                  Transaction #
                </ThemedText>
                <ThemedText size={15} weight="semibold">
                  {receipt.transaction.transactionId}
                </ThemedText>
              </View>
            )}
            {receipt.transaction.paymentMethod && (
              <View style={styles.detailRow}>
                <ThemedText size={15} style={{ opacity: 0.7 }}>
                  Payment
                </ThemedText>
                <ThemedText size={15} weight="semibold">
                  {receipt.transaction.paymentMethod}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Items Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                borderWidth: 1,
              },
            ]}
          >
            <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
              Items ({receipt.items.length})
            </ThemedText>
            {receipt.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <ThemedText
                    size="base"
                    weight="semibold"
                    style={{ marginBottom: 4 }}
                  >
                    {item.name}
                  </ThemedText>
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    {item.quantity} ×{" "}
                    {formatCurrency(item.unitPrice, receipt.totals.currency)}
                    {item.category && ` • ${item.category}`}
                  </ThemedText>
                </View>
                <ThemedText size="base" weight="semibold">
                  {formatCurrency(item.totalPrice, receipt.totals.currency)}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Totals Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                borderWidth: 1,
              },
            ]}
          >
            <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
              Totals
            </ThemedText>
            <View style={styles.totalRow}>
              <ThemedText size={15} style={{ opacity: 0.7 }}>
                Subtotal
              </ThemedText>
              <ThemedText size={15} weight="semibold">
                {formatCurrency(
                  receipt.totals.subtotal,
                  receipt.totals.currency
                )}
              </ThemedText>
            </View>
            {receipt.totals.taxBreakdown &&
            receipt.totals.taxBreakdown.length > 0 ? (
              receipt.totals.taxBreakdown.map((taxItem, index) => (
                <View key={index} style={styles.totalRow}>
                  <ThemedText size={15} style={{ opacity: 0.7 }}>
                    {taxItem.label}
                  </ThemedText>
                  <ThemedText size={15} weight="semibold">
                    {formatCurrency(taxItem.amount, receipt.totals.currency)}
                  </ThemedText>
                </View>
              ))
            ) : (
              <View style={styles.totalRow}>
                <ThemedText size={15} style={{ opacity: 0.7 }}>
                  Tax
                </ThemedText>
                <ThemedText size={15} weight="semibold">
                  {formatCurrency(receipt.totals.tax, receipt.totals.currency)}
                </ThemedText>
              </View>
            )}
            <View
              style={[
                styles.totalRow,
                styles.totalRowFinal,
                {
                  borderTopWidth: 1,
                  borderTopColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <ThemedText size="lg" weight="bold" family="serif">
                Total
              </ThemedText>
              <ThemedText size="lg" weight="bold" family="serif">
                {formatCurrency(receipt.totals.total, receipt.totals.currency)}
              </ThemedText>
            </View>
            {receipt.totals.amountPaid !== undefined && (
              <View style={styles.totalRow}>
                <ThemedText size={15} style={{ opacity: 0.7 }}>
                  Amount Paid
                </ThemedText>
                <ThemedText size={15} weight="semibold">
                  {formatCurrency(
                    receipt.totals.amountPaid,
                    receipt.totals.currency
                  )}
                </ThemedText>
              </View>
            )}
            {receipt.totals.changeDue !== undefined &&
              receipt.totals.changeDue > 0 && (
                <View style={styles.totalRow}>
                  <ThemedText size={15} style={{ opacity: 0.7 }}>
                    Change
                  </ThemedText>
                  <ThemedText size={15} weight="semibold">
                    {formatCurrency(
                      receipt.totals.changeDue,
                      receipt.totals.currency
                    )}
                  </ThemedText>
                </View>
              )}
          </View>

          {/* Return Info Card */}
          {!!receipt.returnInfo?.returnPolicyText && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                  borderWidth: 1,
                },
              ]}
            >
              <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
                Return Information
              </ThemedText>
              {receipt.returnInfo.returnPolicyText && (
                <ThemedText size="sm" style={{ opacity: 0.8, marginBottom: 8 }}>
                  {receipt.returnInfo.returnPolicyText}
                </ThemedText>
              )}
              {receipt.returnInfo.returnByDate && (
                <View style={styles.detailRow}>
                  <ThemedText size={15} style={{ opacity: 0.7 }}>
                    Return By
                  </ThemedText>
                  <ThemedText size={15} weight="semibold">
                    {receipt.returnInfo.returnByDate}
                  </ThemedText>
                </View>
              )}
              {receipt.returnInfo.returnBarcode && (
                <View style={styles.detailRow}>
                  <ThemedText size={15} style={{ opacity: 0.7 }}>
                    Return Code
                  </ThemedText>
                  <ThemedText size={15} weight="semibold">
                    {receipt.returnInfo.returnBarcode}
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 16,
  },
  imageContainer: {
    width: "100%",
    height: 300,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
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
  addressIcon: {
    width: 20,
    height: 20,
  },
  externalIcon: {
    width: 16,
    height: 16,
  },
  mapContainer: {
    width: "100%",
    height: 150,
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalRowFinal: {
    marginTop: 8,
    paddingTop: 12,
  },
});
