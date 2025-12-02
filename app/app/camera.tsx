/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Camera modal screen for scanning receipts
 */

import { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Text,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { GlassView } from "expo-glass-effect";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { PlatformPressable } from "@react-navigation/elements";
import { scanReceipt } from "@/utils/api";
import { hashImage } from "@/utils/hash";
import { findReceiptByImageHash } from "@/utils/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CameraGuideOverlay,
  CameraCaptureButton,
  CameraControlButton,
} from "@/components/camera";

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
          padding: 20,
        }}
      >
        <ThemedText type="default">
          We need your permission to use the camera to scan receipts.
        </ThemedText>
        <TouchableOpacity
          style={styles.allowButton}
          onPress={requestPermission}
        >
          <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#fff">
            Allow
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
  };

  const takePicture = async () => {
    if (cameraRef.current && !processing) {
      try {
        setProcessing(true);
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

        // Scan the receipt immediately
        const response = await scanReceipt(photo.uri);

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
      const storageKey = `@recipio:scan_result:${imageUri}`;
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

        // Scan the receipt immediately
        const response = await scanReceipt(imageUri);

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
  allowButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#0a7ea4",
    justifyContent: "center",
    alignItems: "center",
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
