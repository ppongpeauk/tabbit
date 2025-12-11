/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Barcode scanner screen for scanning barcodes and QR codes
 */

import { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  Text,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fonts } from "@/constants/theme";
import { scanBarcodeImage } from "@/utils/api";
import {
  CameraGuideOverlay,
  CameraCaptureButton,
  CameraControlButton,
  CameraPermissionPrompt,
  CameraButton,
} from "@/components/camera";

export default function BarcodeScannerScreen() {
  const params = useLocalSearchParams<{ onScan?: string }>();
  const [facing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <CameraPermissionPrompt
        description="We need access to your camera to scan barcodes and QR codes. Your privacy is important to us—we only use the camera when you're actively scanning."
        iconName="barcode.viewfinder"
        onRequestPermission={requestPermission}
      />
    );
  }

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
  };

  const processImage = async (imageUri: string) => {
    try {
      setProcessing(true);
      setFrozenFrame(imageUri);
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

      // Store the scanned barcode temporarily in AsyncStorage
      // The param name is determined by the onScan param passed to this screen
      const paramName = params.onScan || "scannedBarcode";
      const storageKey = `@tabbit:scanned_barcode:${paramName}`;
      const formatKey = `@tabbit:scanned_barcode_format:${paramName}`;

      try {
        // Store the barcode value and format temporarily
        await AsyncStorage.setItem(storageKey, barcodeValue);
        await AsyncStorage.setItem(formatKey, barcodeFormat);

        // Navigate back - the previous screen will read from storage
        router.back();
      } catch (error) {
        console.error("Failed to store scanned barcode:", error);
        setProcessing(false);
        setFrozenFrame(null);
        Alert.alert("Error", "Failed to save barcode. Please try again.");
      }
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
  };

  const takePicture = async () => {
    if (cameraRef.current && !processing) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        console.log("[BarcodeScanner] Photo taken:", photo);
        await processImage(photo.uri);
      } catch (error) {
        setProcessing(false);
        setFrozenFrame(null);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to capture image. Please try again."
        );
      }
    }
  };

  const pickImage = async () => {
    if (processing) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      {frozenFrame ? (
        <Image source={{ uri: frozenFrame }} style={styles.camera} />
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash}
        />
      )}
      <View style={styles.topControls}>
        <CameraButton
          onPress={() => router.back()}
          variant="close"
          iconName="close"
        />
      </View>
      <CameraGuideOverlay aspectRatio={1} />
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          Position the barcode or QR code within the guide and tap the button to
          capture.
        </Text>
        {processing && (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator size="small" color="#333" />
            <Text style={styles.scanningText}>Processing...</Text>
          </View>
        )}
      </View>
      <View style={styles.controls}>
        <CameraControlButton
          onPress={toggleFlash}
          iconName={flash === "on" ? "bolt.fill" : "bolt.slash.fill"}
          disabled={processing}
          size="large"
        />

        <CameraCaptureButton
          onPress={takePicture}
          processing={processing}
          disabled={processing}
        />

        {__DEV__ ? (
          <CameraControlButton
            onPress={pickImage}
            iconName="photo.fill"
            disabled={processing}
            size="large"
          />
        ) : (
          <View style={styles.controlButton} />
        )}
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
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
    marginBottom: 8,
  },
  scanningIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanningText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
});
