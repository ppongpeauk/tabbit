/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Unified camera screen for scanning receipts and barcodes
 */

import { useState, useRef } from "react";
import {
  View,
  Platform,
  Alert,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Fonts } from "@/constants/theme";
import {
  scanReceipt,
  scanBarcodeImage,
  addFriendByToken,
  shareReceiptWithGroup,
} from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CameraGuideOverlay,
  CameraCaptureButton,
  CameraControlButton,
  CameraPermissionPrompt,
  CameraButton,
} from "@/components/camera";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/contexts/auth-context";
import { saveReceipt } from "@/utils/storage";

const TOKEN_STORAGE_KEY = "tabbit.token";

// Enable native barcode scanning (uses Expo's built-in scanner instead of server)
const USE_NATIVE_BARCODE_SCANNING = true;

type ScanMode = "receipt" | "barcode";

interface CameraScreenProps {
  mode?: ScanMode;
}

export function CameraScreen({ mode: propMode }: CameraScreenProps = {}) {
  const params = useLocalSearchParams<{ onScan?: string; groupId?: string }>();
  // Determine mode: prop > route name > default to receipt
  const mode: ScanMode =
    propMode || (params.onScan !== undefined ? "barcode" : "receipt");
  const isFriendScan = params.onScan === "friend";
  const groupId = params.groupId; // Get groupId from params for automatic group sharing

  const [facing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { user, clearAuthState } = useAuth();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <CameraPermissionPrompt
        description={
          mode === "barcode"
            ? "We need access to your camera to scan barcodes and QR codes. Your privacy is important to us—we only use the camera when you're actively scanning."
            : "We need access to your camera to scan receipts. Your privacy is important to us—we only use the camera when you're actively scanning."
        }
        iconName={mode === "barcode" ? "barcode.viewfinder" : undefined}
        onRequestPermission={requestPermission}
      />
    );
  }

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
  };

  const processReceiptImage = async (imageUri: string) => {
    // Get auth token
    const token = user
      ? await SecureStore.getItemAsync(TOKEN_STORAGE_KEY)
      : undefined;

    // Scan the receipt
    const response = await scanReceipt(imageUri, {
      token: token ?? undefined,
    });

    await handleReceiptScanResponse(response, imageUri);
  };

  const handleNativeBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    // If scanning for friend, process the token directly
    if (isFriendScan) {
      let token = result.data;

      // Extract token from web URL if it's a web link
      if (token.startsWith("http")) {
        try {
          const url = new URL(token);
          const tokenParam = url.searchParams.get("token");
          if (tokenParam) {
            token = tokenParam;
          }
        } catch {
          // If URL parsing fails, try to extract token from tabbit:// URL
          const tabbitMatch = token.match(/tabbit:\/\/add-friend\?token=([^&]+)/);
          if (tabbitMatch) {
            token = decodeURIComponent(tabbitMatch[1]);
          }
        }
      } else if (token.startsWith("tabbit://")) {
        // Extract token from tabbit:// URL
        const match = token.match(/tabbit:\/\/add-friend\?token=([^&]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }

      try {
        const response = await addFriendByToken(token);
        setProcessing(false);
        setScanned(false);

        if (response.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            "Friend Added",
            `You've successfully added ${response.friend?.friendName || "this user"} as a friend!`,
            [
              {
                text: "OK",
                onPress: () => {
                  router.back();
                },
              },
            ]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            "Failed to Add Friend",
            response.message || "Invalid or expired friend request token.",
            [
              {
                text: "Try Again",
                onPress: () => {
                  setScanned(false);
                },
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  router.back();
                },
              },
            ]
          );
        }
      } catch (error) {
        setProcessing(false);
        setScanned(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to add friend. Please try again."
        );
      }
      return;
    }

    // Normalize barcode type format (Expo uses formats like "qr", "ean13", etc.)
    // Convert to match server format (e.g., "QR_CODE", "EAN_13")
    const normalizeBarcodeType = (type: string): string => {
      const typeMap: Record<string, string> = {
        qr: "QR_CODE",
        ean13: "EAN_13",
        ean8: "EAN_8",
        upc_a: "UPC_A",
        upc_e: "UPC_E",
        code128: "CODE_128",
        code39: "CODE_39",
        code93: "CODE_93",
        codabar: "CODABAR",
        itf14: "ITF",
        datamatrix: "DATA_MATRIX",
        pdf417: "PDF417",
        aztec: "AZTEC",
      };
      return typeMap[type.toLowerCase()] || type.toUpperCase();
    };

    const barcodeValue = result.data;
    const barcodeFormat = normalizeBarcodeType(result.type);

    // Store the scanned barcode temporarily in AsyncStorage
    const paramName = params.onScan || "scannedBarcode";
    const storageKey = `@tabbit:scanned_barcode:${paramName}`;
    const formatKey = `@tabbit:scanned_barcode_format:${paramName}`;

    try {
      await AsyncStorage.setItem(storageKey, barcodeValue);
      await AsyncStorage.setItem(formatKey, barcodeFormat);
      setProcessing(false);
      router.back();
    } catch (error) {
      console.error("Failed to store scanned barcode:", error);
      setProcessing(false);
      setScanned(false);
      Alert.alert("Error", "Failed to save barcode. Please try again.");
    }
  };

  const processBarcodeImage = async (imageUri: string) => {
    const response = await scanBarcodeImage(imageUri);

    if (
      !response.success ||
      !response.barcodes ||
      response.barcodes.length === 0
    ) {
      setProcessing(false);
      setFrozenFrame(null);
      Alert.alert(
        "No Barcode Detected",
        response.message ||
        "No barcode or QR code was detected in the image. Please try again with a clearer image.",
        [{ text: "OK" }]
      );
      return;
    }

    // Barcode detected - get the first barcode value and format
    const barcodeData = response.barcodes[0];
    const barcodeValue = barcodeData.content;
    const barcodeFormat = barcodeData.type;

    // If scanning for friend, process the token directly
    if (isFriendScan) {
      let token = barcodeValue;

      // Extract token from web URL if it's a web link
      if (token.startsWith("http")) {
        try {
          const url = new URL(token);
          const tokenParam = url.searchParams.get("token");
          if (tokenParam) {
            token = tokenParam;
          }
        } catch {
          // If URL parsing fails, try to extract token from tabbit:// URL
          const tabbitMatch = token.match(/tabbit:\/\/add-friend\?token=([^&]+)/);
          if (tabbitMatch) {
            token = decodeURIComponent(tabbitMatch[1]);
          }
        }
      } else if (token.startsWith("tabbit://")) {
        // Extract token from tabbit:// URL
        const match = token.match(/tabbit:\/\/add-friend\?token=([^&]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }

      try {
        const friendResponse = await addFriendByToken(token);
        setProcessing(false);
        setFrozenFrame(null);

        if (friendResponse.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            "Friend Added",
            `You've successfully added ${friendResponse.friend?.friendName || "this user"} as a friend!`,
            [
              {
                text: "OK",
                onPress: () => {
                  router.back();
                },
              },
            ]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            "Failed to Add Friend",
            friendResponse.message || "Invalid or expired friend request token.",
            [{ text: "OK" }]
          );
        }
      } catch (error) {
        setProcessing(false);
        setFrozenFrame(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to add friend. Please try again."
        );
      }
      return;
    }

    // Store the scanned barcode temporarily in AsyncStorage
    const paramName = params.onScan || "scannedBarcode";
    const storageKey = `@tabbit:scanned_barcode:${paramName}`;
    const formatKey = `@tabbit:scanned_barcode_format:${paramName}`;

    try {
      await AsyncStorage.setItem(storageKey, barcodeValue);
      await AsyncStorage.setItem(formatKey, barcodeFormat);
      setProcessing(false);
      setFrozenFrame(null);
      router.back();
    } catch (error) {
      console.error("Failed to store scanned barcode:", error);
      setProcessing(false);
      setFrozenFrame(null);
      Alert.alert("Error", "Failed to save barcode. Please try again.");
    }
  };

  const processImage = async (imageUri: string) => {
    if (mode === "barcode") {
      await processBarcodeImage(imageUri);
    } else {
      await processReceiptImage(imageUri);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && !processing) {
      try {
        setProcessing(true);
        const photo = await cameraRef.current.takePictureAsync();
        const imageUri = photo.uri;
        setFrozenFrame(imageUri);
        await processImage(imageUri);
      } catch (error) {
        setProcessing(false);
        setFrozenFrame(null);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to process image. Please try again."
        );
      }
    }
  };

  const handleReceiptScanResponse = async (
    response: Awaited<ReturnType<typeof scanReceipt>>,
    imageUri: string
  ) => {
    setProcessing(false);
    setFrozenFrame(null);

    if (!response.success || !response.receipt) {
      if (response.authError) {
        await clearAuthState();
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please sign in again.",
          [{ text: "OK" }]
        );
        return;
      }

      Alert.alert(
        "No Receipt Detected",
        response.message ||
        "No receipt was detected in the image. Please try again with a clearer image of a receipt.",
        [{ text: "OK" }]
      );
      return;
    }

    // Create receipt directly and navigate to receipt details
    try {
      const receiptName = response.receipt.merchant.name || "Untitled Receipt";
      const savedReceipt = await saveReceipt(
        {
          name: receiptName,
          merchant: response.receipt.merchant,
          transaction: response.receipt.transaction,
          items: response.receipt.items,
          totals: response.receipt.totals,
          returnInfo: response.receipt.returnInfo,
          appData: response.receipt.appData,
          technical: response.receipt.technical,
        },
        { imageUri }
      );

      // If groupId is present, automatically share the receipt with the group
      if (groupId) {
        try {
          const shareResponse = await shareReceiptWithGroup(
            savedReceipt.id,
            groupId
          );

          if (shareResponse.success) {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            // Dismiss all and navigate to the receipt detail
            router.dismissAll();
            router.push(`/receipt/${savedReceipt.id}`);
          } else {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Error
            );
            Alert.alert(
              "Error Sharing with Group",
              shareResponse.message || "Failed to share receipt with group.",
              [
                {
                  text: "Continue",
                  onPress: () => {
                    router.dismissAll();
                    router.push(`/receipt/${savedReceipt.id}`);
                  },
                },
              ]
            );
          }
        } catch (error) {
          console.error("Error sharing receipt with group:", error);
          // Even if sharing fails, still navigate to the receipt
          router.dismissAll();
          router.push(`/receipt/${savedReceipt.id}`);
        }
      } else {
        // Dismiss camera modal and navigate to receipt detail screen
        router.dismissAll();
        router.push(`/receipt/${savedReceipt.id}`);
      }
    } catch (error) {
      console.error("Error saving receipt:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to save receipt. Please try again."
      );
    }
  };

  const pickImage = async () => {
    if (processing) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setProcessing(true);
        let imageUri = result.assets[0].uri;

        // Convert HEIC to JPEG if needed (for both display and processing)
        const lowerUri = imageUri.toLowerCase();
        if (lowerUri.endsWith(".heic") || lowerUri.endsWith(".heif")) {
          console.log("[Camera] Converting HEIC to JPEG");
          const converted = await ImageManipulator.manipulateAsync(
            imageUri,
            [],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );
          imageUri = converted.uri;
        }

        setFrozenFrame(imageUri);
        await processImage(imageUri);
      } catch (error) {
        setProcessing(false);
        setFrozenFrame(null);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to process image. Please try again."
        );
      }
    }
  };

  const isNativeBarcodeMode = mode === "barcode" && USE_NATIVE_BARCODE_SCANNING;

  return (
    <View className="flex-1 bg-neutral-900">
      {frozenFrame ? (
        <Image source={{ uri: frozenFrame }} style={StyleSheet.absoluteFill} />
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
          enableTorch={flash === "on"}
          onBarcodeScanned={
            isNativeBarcodeMode && !scanned && !processing
              ? handleNativeBarcodeScanned
              : undefined
          }
          barcodeScannerSettings={
            isNativeBarcodeMode
              ? {
                barcodeTypes: [
                  "qr",
                  "ean13",
                  "ean8",
                  "upc_a",
                  "upc_e",
                  "code128",
                  "code39",
                  "code93",
                  "codabar",
                  "itf14",
                  "datamatrix",
                  "pdf417",
                  "aztec",
                ],
              }
              : undefined
          }
        />
      )}
      <View className="absolute top-5 left-0 right-0 px-5 flex-row justify-start">
        <CameraButton
          onPress={() => router.back()}
          variant="close"
          iconName="close"
        />
      </View>
      <CameraGuideOverlay aspectRatio={mode === "barcode" ? 1 : 3 / 5} />
      <View className="absolute bottom-[140px] left-0 right-0 px-5 items-center">
        {mode === "barcode" ? (
          <>
            <Text
              className="text-white text-sm text-center mb-2"
              style={{ fontFamily: Fonts.sans }}
            >
              {isNativeBarcodeMode
                ? "Position the barcode or QR code within the guide. It will scan automatically."
                : "Position the barcode or QR code within the guide and tap the button to capture."}
            </Text>
            {processing && (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#333" />
                <Text
                  className="text-white text-sm"
                  style={{ fontFamily: Fonts.sans }}
                >
                  Processing...
                </Text>
              </View>
            )}
            {scanned && isNativeBarcodeMode && (
              <Text
                className="text-white text-sm text-center mt-2"
                style={{ fontFamily: Fonts.sans }}
              >
                Barcode scanned! Returning...
              </Text>
            )}
          </>
        ) : (
          <Text
            className="text-white text-sm text-center"
            style={{ fontFamily: Fonts.sans }}
          >
            Make sure the receipt is in focus and follows the guide.
          </Text>
        )}
      </View>
      <View
        className="absolute bottom-0 left-0 right-0 flex-row justify-between items-center px-10 pt-5"
        style={{ paddingBottom: Platform.OS === "ios" ? 50 : 30 }}
      >
        <CameraControlButton
          onPress={toggleFlash}
          iconName={flash === "on" ? "bolt.fill" : "bolt.slash.fill"}
          disabled={processing}
          size="large"
        />

        <CameraCaptureButton
          onPress={takePicture}
          processing={processing}
          disabled={processing || (isNativeBarcodeMode && scanned)}
        />

        {mode === "barcode" && !__DEV__ ? (
          <View className="w-[70px] h-[70px] rounded-[35px] justify-center items-center" />
        ) : (
          <CameraControlButton
            onPress={pickImage}
            iconName="photo.fill"
            disabled={processing}
            size="large"
          />
        )}
      </View>
    </View>
  );
}

export default function CameraScreenWrapper() {
  return <CameraScreen />;
}
