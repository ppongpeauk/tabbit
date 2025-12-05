import { useState, useRef } from "react";
import { View, StyleSheet, Platform, Alert, Text } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { GlassView } from "expo-glass-effect";
import { Colors, Fonts } from "@/constants/theme";
import { PlatformPressable } from "@react-navigation/elements";
import { scanReceipt } from "@/utils/api";
import { hashImage } from "@/utils/hash";
import { findReceiptByImageHash } from "@/utils/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CameraGuideOverlay,
  CameraCaptureButton,
  CameraControlButton,
  CameraPermissionPrompt,
} from "@/components/camera";
import { useLimits } from "@/hooks/use-limits";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { presentPaywall } from "@/utils/paywall";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/contexts/auth-context";

const TOKEN_STORAGE_KEY = "tabbit.token";

export default function CameraScreen() {
  const [facing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { checkScanLimit, refresh: refreshLimits } = useLimits();
  const { isPro } = useRevenueCat();
  const { user } = useAuth();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <CameraPermissionPrompt
        description="We need access to your camera to scan receipts. Your privacy is important to us—we only use the camera when you're actively scanning."
        onRequestPermission={requestPermission}
      />
    );
  }

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
  };

  const takePicture = async () => {
    if (cameraRef.current && !processing) {
      try {
        setProcessing(true);

        // Check scan limit for free users
        if (!isPro) {
          const limitCheck = await checkScanLimit();
          if (!limitCheck.allowed) {
            setProcessing(false);
            Alert.alert(
              "Scan Limit Reached",
              limitCheck.reason ||
                "You've reached your monthly scan limit. Upgrade to Pro for unlimited scans.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Upgrade to Pro",
                  onPress: async () => {
                    await presentPaywall();
                  },
                },
              ]
            );
            return;
          }
        }

        const photo = await cameraRef.current.takePictureAsync();
        console.log("Photo taken:", photo);

        // Hash the image and check for duplicates
        try {
          const imageHash = await hashImage(photo.uri);
          const existingReceipt = await findReceiptByImageHash(imageHash);

          if (existingReceipt) {
            setProcessing(false);
            Alert.alert(
              "Duplicate Receipt Detected",
              "It seems like you already added this receipt. Would you like to proceed anyway?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {},
                },
                {
                  text: "Proceed",
                  onPress: async () => {
                    setProcessing(true);
                    // Continue with scanning
                    const response = await scanReceipt(photo.uri);
                    await handleScanResponse(response, photo.uri);
                  },
                },
              ]
            );
            return;
          }
        } catch (hashError) {
          // If hashing fails, log but continue with scanning
          console.warn("Failed to hash image for duplicate check:", hashError);
        }

        // Get auth token for limit checking
        const token = user
          ? await SecureStore.getItemAsync(TOKEN_STORAGE_KEY)
          : undefined;

        // Scan the receipt immediately
        const response = await scanReceipt(photo.uri, {
          token: token ?? undefined,
        });

        // Check if limit was exceeded during scan
        if (!response.success && response.limitExceeded) {
          setProcessing(false);
          await refreshLimits();
          Alert.alert(
            "Scan Limit Reached",
            response.message ||
              "You've reached your monthly scan limit. Upgrade to Pro for unlimited scans.",
            [
              { text: "OK" },
              {
                text: "Upgrade to Pro",
                onPress: async () => {
                  await presentPaywall();
                },
              },
            ]
          );
          return;
        }

        // Refresh limits after successful scan
        if (response.success && user) {
          await refreshLimits();
        }

        await handleScanResponse(response, photo.uri);
      } catch (error) {
        setProcessing(false);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to process image. Please try again."
        );
      }
    }
  };

  const handleScanResponse = async (
    response: Awaited<ReturnType<typeof scanReceipt>>,
    imageUri: string
  ) => {
    if (!response.success || !response.receipt) {
      // No receipt detected - show alert and re-enable button
      setProcessing(false);
      Alert.alert(
        "No Receipt Detected",
        response.message ||
          "No receipt was detected in the image. Please try again with a clearer image of a receipt.",
        [{ text: "OK" }]
      );
      return;
    }

    // Store receipt data temporarily to avoid re-scanning in create screen
    try {
      const storageKey = `@tabbit:scan_result:${imageUri}`;
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          receipt: response.receipt,
          barcodes: response.barcodes,
        })
      );
    } catch (error) {
      console.warn("Failed to store scan result:", error);
      // Continue anyway - create screen will scan again
    }

    // Receipt detected - navigate to create screen
    router.back();
    setTimeout(() => {
      router.push({
        pathname: "/create",
        params: {
          imageUri,
          barcodes: response.barcodes
            ? JSON.stringify(response.barcodes)
            : undefined,
        },
      });
    }, 100);
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

        // Check scan limit for free users
        if (!isPro) {
          const limitCheck = await checkScanLimit();
          if (!limitCheck.allowed) {
            setProcessing(false);
            Alert.alert(
              "Scan Limit Reached",
              limitCheck.reason ||
                "You've reached your monthly scan limit. Upgrade to Pro for unlimited scans.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Upgrade to Pro",
                  onPress: async () => {
                    await presentPaywall();
                  },
                },
              ]
            );
            return;
          }
        }

        const imageUri = result.assets[0].uri;

        // Hash the image and check for duplicates
        try {
          const imageHash = await hashImage(imageUri);
          const existingReceipt = await findReceiptByImageHash(imageHash);

          if (existingReceipt) {
            setProcessing(false);
            Alert.alert(
              "Duplicate Receipt Detected",
              "It seems like you already added this receipt. Would you like to proceed anyway?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {},
                },
                {
                  text: "Proceed",
                  onPress: async () => {
                    setProcessing(true);
                    // Continue with scanning
                    const response = await scanReceipt(imageUri);
                    await handleScanResponse(response, imageUri);
                  },
                },
              ]
            );
            return;
          }
        } catch (hashError) {
          // If hashing fails, log but continue with scanning
          console.warn("Failed to hash image for duplicate check:", hashError);
        }

        // Get auth token for limit checking
        const token = user
          ? await SecureStore.getItemAsync(TOKEN_STORAGE_KEY)
          : undefined;

        // Scan the receipt immediately
        const response = await scanReceipt(imageUri, {
          token: token ?? undefined,
        });

        // Check if limit was exceeded during scan
        if (!response.success && response.limitExceeded) {
          setProcessing(false);
          await refreshLimits();
          Alert.alert(
            "Scan Limit Reached",
            response.message ||
              "You've reached your monthly scan limit. Upgrade to Pro for unlimited scans.",
            [
              { text: "OK" },
              {
                text: "Upgrade to Pro",
                onPress: async () => {
                  await presentPaywall();
                },
              },
            ]
          );
          return;
        }

        // Refresh limits after successful scan
        if (response.success && user) {
          await refreshLimits();
        }

        await handleScanResponse(response, imageUri);
      } catch (error) {
        setProcessing(false);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to process image. Please try again."
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
      />
      <View style={styles.topControls}>
        <PlatformPressable onPress={() => router.back()}>
          <GlassView style={styles.closeButton}>
            <SymbolView name="xmark" tintColor={Colors.dark.text} />
          </GlassView>
        </PlatformPressable>
      </View>
      <CameraGuideOverlay aspectRatio={3 / 5} />
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          Make sure the receipt is in focus and follows the guide.
        </Text>
      </View>
      <View style={styles.controls}>
        <CameraControlButton
          onPress={toggleFlash}
          iconName={flash === "on" ? "bolt.fill" : "bolt.slash.fill"}
          disabled={processing}
        />

        <CameraCaptureButton
          onPress={takePicture}
          processing={processing}
          disabled={processing}
        />

        <CameraControlButton
          onPress={pickImage}
          iconName="photo.fill"
          disabled={processing}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  camera: {
    flex: 1,
    backgroundColor: "#111",
  },
  topControls: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === "ios" ? 50 : 30,
    paddingTop: 20,
  },
  instructionContainer: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  instructionText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    fontFamily: Fonts.sans,
  },
});
