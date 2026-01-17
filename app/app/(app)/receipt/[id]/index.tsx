/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt detail screen with hero layout, metadata grid, and content cards
 */

import {
  useState,
  useLayoutEffect,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import {
  ScrollView,
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Share,
} from "react-native";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  useReceipt,
  useDeleteReceipt,
  useUpdateReceipt,
} from "@/hooks/use-receipts";
import { useFriends } from "@/hooks/use-friends";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  ItemsCard,
  TotalsCard,
  ReturnInfoCard,
  ReceiptHeader,
  SplitSummaryCard,
  ShareReceiptCard,
  NotesCard,
  useScannedBarcode,
  shouldShowReturnInfo,
  BarcodeModal,
  formatMerchantAddress,
  useAddressHandler,
} from "@/components/receipt-detail";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type { StoredReceipt, Friend } from "@/utils/storage";
import { getReceiptPhotoUrl } from "@/utils/storage";
import { Toolbar, ToolbarButton } from "@/components/toolbar";
import { SymbolView } from "expo-symbols";
import { AppleMaps } from "expo-maps";
import * as Location from "expo-location";
import { WEB_BASE_URL } from "@/utils/config";
import { getCategoryName, getCategoryEmoji } from "@/utils/categories";

// ============================================================================
// Toolbar Setup Hook
// ============================================================================

function useReceiptToolbar({
  receipt,
  colorScheme,
  onViewPhoto,
  onEdit,
  onShare,
  onSplit,
  onScanBarcode,
  onShowBarcode,
  onDelete,
}: {
  receipt: StoredReceipt | null;
  colorScheme: "light" | "dark" | null | undefined;
  onViewPhoto: () => void;
  onEdit: () => void;
  onShare: () => void;
  onSplit: () => void;
  onScanBarcode: () => void;
  onShowBarcode: () => void;
  onDelete: () => void;
}) {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions(
      ReceiptHeader({
        receipt,
        colorScheme: colorScheme || "light",
        onViewPhoto,
        onEdit,
        onShare,
        onSplit,
        onScanBarcode,
        onShowBarcode,
        onDelete,
      })
    );
  }, [
    navigation,
    colorScheme,
    receipt,
    onViewPhoto,
    onEdit,
    onShare,
    onSplit,
    onScanBarcode,
    onShowBarcode,
    onDelete,
  ]);
}

// ============================================================================
// Loading & Error States
// ============================================================================

function ReceiptLoadingState() {
  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" />
    </View>
  );
}

function ReceiptNotFoundState() {
  return (
    <View className="flex-1 justify-center items-center">
      <ThemedText>Receipt not found</ThemedText>
    </View>
  );
}

// ============================================================================
// Map Component
// ============================================================================

interface AddressMapProps {
  address: StoredReceipt["merchant"]["address"];
  isDark: boolean;
}

function AddressMap({ address, isDark }: AddressMapProps) {
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

// ============================================================================
// Hero Section with Merchant Info
// ============================================================================

interface HeroSectionProps {
  receipt: StoredReceipt;
  isDark: boolean;
}

function HeroSection({ receipt, isDark }: HeroSectionProps) {
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
      <View className="flex flex-row items-center gap-4">
        {merchantLogo && !logoError ? (
          <Image
            source={{ uri: merchantLogo }}
            resizeMode="contain"
            onError={() => setLogoError(true)}
            className="w-16 h-16 border-2 border-gray-200 dark:border-gray-800 rounded-2xl"
          />
        ) : null}
        {/* Merchant Name */}
        <ThemedText size="xl" weight="bold" family="sans" className="text-left">
          {receiptTitle || merchantName}
        </ThemedText>
      </View>
      {/* Address */}
      {hasAddress ? (
        <TouchableOpacity
          onPress={() => handleAddressPress(receipt.merchant.address!)}
          activeOpacity={0.7}
          className="items-start"
        >
          <ThemedText
            size="base"
            className="text-center"
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

// ============================================================================
// Metadata Grid (Date, Category, Total, Currency)
// ============================================================================

interface MetadataGridProps {
  receipt: StoredReceipt;
  isDark: boolean;
}

function MetadataGrid({ receipt, isDark }: MetadataGridProps) {
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
      {/* First Row: Date and Category */}
      <View className="flex-row gap-4 mb-6">
        {/* Date */}
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

        {/* Category */}
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

      {/* Second Row: Total Amount and Currency */}
      <View className="flex-row gap-4">
        {/* Total Amount */}
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

        {/* Currency */}
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
          <ThemedText size="base" weight="semibold" family="sans">
            {currency}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Receipt Content Component
// ============================================================================

function ReceiptContent({
  receipt,
  friends,
  showRawReturnText,
  onToggleFormat,
  onShare,
  onScanBarcode,
  isDark,
}: {
  receipt: StoredReceipt;
  friends: Friend[];
  showRawReturnText: boolean;
  onToggleFormat: () => void;
  onShare: () => void;
  onScanBarcode: () => void;
  isDark: boolean;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: 140,
      }}
      automaticallyAdjustContentInsets
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Card containing merchant info and metadata */}
      <View className="px-6 mb-4">
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

          {/* Hero Section */}
          <HeroSection receipt={receipt} isDark={isDark} />

          {/* Separator */}
          <View
            className="h-px mx-6"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          />

          {/* Metadata Grid */}
          <MetadataGrid receipt={receipt} isDark={isDark} />
        </View>
      </View>

      {/* Share Receipt Card */}
      <View className="px-6 mb-4">
        <ShareReceiptCard onShare={onShare} />
      </View>

      {/* Items and Totals Card */}
      <View className="px-6 mb-4">
        <View
          className="rounded-[20px] p-6 border"
          style={{
            backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          }}
        >
          <ItemsCard receipt={receipt} />
          <TotalsCard receipt={receipt} />
        </View>
      </View>

      {/* Split Summary */}
      {receipt.splitData ? (
        <View className="px-6 mb-4">
          <SplitSummaryCard receipt={receipt} friends={friends} />
        </View>
      ) : null}

      {/* Scan Return Barcode Button - shown when no return info exists */}
      {!shouldShowReturnInfo(receipt.returnInfo) ? (
        <View className="px-6 mb-4">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onScanBarcode}
            className={`rounded-[20px] p-4 gap-1 ${
              isDark ? "bg-[#1A1D1E]" : "bg-white"
            }`}
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.2)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.05)",
                }}
              >
                <SymbolView
                  name="qrcode.viewfinder"
                  tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                  style={{ width: 24, height: 24 }}
                />
              </View>
              <View className="flex-1">
                <ThemedText size="base" weight="semibold">
                  Add Return Information
                </ThemedText>
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.subtle : Colors.light.icon,
                  }}
                >
                  Scan return barcode to add return details
                </ThemedText>
              </View>
              <SymbolView
                name="chevron.right"
                tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
                style={{ width: 16, height: 16 }}
              />
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Return Info */}
      {shouldShowReturnInfo(receipt.returnInfo) ? (
        <View className="px-6 mb-4">
          <ReturnInfoCard
            receipt={receipt}
            showRawReturnText={showRawReturnText}
            onToggleFormat={onToggleFormat}
          />
        </View>
      ) : null}

      {/* Notes */}
      <View className="px-6 mb-4">
        <NotesCard receipt={receipt} />
      </View>
    </ScrollView>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ReceiptDetailScreen() {
  const params = useLocalSearchParams<{
    id: string | string[];
    scannedBarcode?: string;
  }>();
  // Handle case where id might be an array from route params
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [showRawReturnText, setShowRawReturnText] = useState(false);
  const colorScheme = useColorScheme();
  const barcodeModalRef = useRef<TrueSheet>(null);
  const insets = useSafeAreaInsets();

  // React Query hooks
  const {
    data: receipt,
    isLoading: isLoadingReceipt,
    refetch: refetchReceipt,
  } = useReceipt(id);

  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
  const deleteReceiptMutation = useDeleteReceipt();
  const updateReceiptMutation = useUpdateReceipt();

  const isLoading = isLoadingReceipt || isLoadingFriends;
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const hasPhoto = Boolean(
    receipt?.appData?.images?.some((image) => Boolean(image.key || image.url))
  );

  // Handle scanned barcode from barcode scanner
  useScannedBarcode({
    receipt: receipt || null,
    receiptId: id,
    onReceiptUpdate: () => {
      refetchReceipt();
    },
  });

  // Event Handlers
  const handleDelete = useCallback(() => {
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
          onPress: () => {
            deleteReceiptMutation.mutate(id, {
              onSuccess: () => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                router.back();
              },
              onError: () => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                );
                Alert.alert(
                  "Error",
                  "Failed to delete receipt. Please try again."
                );
              },
            });
          },
        },
      ],
      { cancelable: true }
    );
  }, [id, deleteReceiptMutation]);

  const handleScanBarcode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/barcode-scanner",
      params: { onScan: "scannedBarcode" },
    });
  }, []);

  const handleShowBarcode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    barcodeModalRef.current?.present();
  }, []);

  const handleViewPhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isLoadingPhoto) {
      return;
    }

    if (!hasPhoto) {
      Alert.alert("No Photo", "No photo is attached to this receipt.");
      return;
    }

    setIsLoadingPhoto(true);
    try {
      const url = await getReceiptPhotoUrl(id);
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to load receipt photo"
      );
    } finally {
      setIsLoadingPhoto(false);
    }
  }, [hasPhoto, id, isLoadingPhoto]);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/(app)/receipt/[id]/edit",
      params: { id },
    });
  }, [id]);

  const handleShare = useCallback(async () => {
    if (!receipt) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateReceiptMutation.mutateAsync({
        id: receipt.id,
        updates: { visibility: "public" },
      });
      const shareUrl = `${WEB_BASE_URL}/receipts/${receipt.id}`;
      await Share.share({
        url: shareUrl,
        title: "Share Receipt",
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to share receipt. Please try again."
      );
    }
  }, [receipt, updateReceiptMutation]);

  const handleSplit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/split/details",
      params: { receiptId: id },
    });
  }, [id]);

  const toggleReturnTextFormat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRawReturnText((prev) => !prev);
  }, []);

  // Setup toolbar
  useReceiptToolbar({
    receipt: receipt || null,
    colorScheme,
    onViewPhoto: handleViewPhoto,
    onEdit: handleEdit,
    onShare: handleShare,
    onSplit: handleSplit,
    onScanBarcode: handleScanBarcode,
    onShowBarcode: handleShowBarcode,
    onDelete: handleDelete,
  });

  // Loading state
  if (isLoading) {
    return <ReceiptLoadingState />;
  }

  // Not found state
  if (!receipt) {
    return <ReceiptNotFoundState />;
  }

  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1">
      <ThemedView className="flex-1">
        <ReceiptContent
          receipt={receipt}
          friends={friends}
          showRawReturnText={showRawReturnText}
          onToggleFormat={toggleReturnTextFormat}
          onShare={handleShare}
          onScanBarcode={handleScanBarcode}
          isDark={isDark}
        />
      </ThemedView>
      <Toolbar bottom={insets.bottom}>
        <ToolbarButton
          onPress={handleEdit}
          label="Edit"
          icon="square.and.pencil"
          variant="secondary"
        />
        <ToolbarButton
          onPress={handleSplit}
          label="Split"
          icon="person.2.fill"
          variant="secondary"
        />
        <ToolbarButton onPress={handleDelete} icon="trash" variant="danger" />
      </Toolbar>
      {receipt.returnInfo?.returnBarcode && (
        <BarcodeModal
          bottomSheetRef={barcodeModalRef}
          barcodeValue={receipt.returnInfo.returnBarcode}
          barcodeFormat={receipt.returnInfo.returnBarcodeFormat}
        />
      )}
    </View>
  );
}
