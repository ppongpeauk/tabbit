import { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  Text,
  ActivityIndicator,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SymbolView } from "expo-symbols";
import { GlassView } from "expo-glass-effect";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { PlatformPressable } from "@react-navigation/elements";
import { scanBarcodeImage } from "@/utils/api";
import {
  CameraGuideOverlay,
  CameraCaptureButton,
  CameraControlButton,
} from "@/components/camera";

export default function BarcodeScannerScreen() {
  const params = useLocalSearchParams<{ onScan?: string }>();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
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
          We need your permission to use the camera to scan barcodes.
        </ThemedText>
        <PlatformPressable
          style={styles.allowButton}
          onPress={requestPermission}
        >
          <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#fff">
            Allow
          </ThemedText>
        </PlatformPressable>
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
        console.log("[BarcodeScanner] Photo taken:", photo);

        // Send image to server for barcode detection
        const response = await scanBarcodeImage(photo.uri);

        if (
          !response.success ||
          !response.barcodes ||
          response.barcodes.length === 0
        ) {
          // No barcode detected - show alert and re-enable button
          setProcessing(false);
          Alert.alert(
            "No Barcode Detected",
            response.message ||
              "No barcode or QR code was detected in the image. Please try again with a clearer image.",
            [{ text: "OK" }]
          );
          return;
        }

        // Barcode detected - get the first barcode value
        const barcodeValue = response.barcodes[0].content;

        // Store the scanned barcode temporarily in AsyncStorage
        // The param name is determined by the onScan param passed to this screen
        const paramName = params.onScan || "scannedBarcode";
        const storageKey = `@tabbit:scanned_barcode:${paramName}`;

        try {
          // Store the barcode temporarily
          await AsyncStorage.setItem(storageKey, barcodeValue);

          // Navigate back - the previous screen will read from storage
          router.back();
        } catch (error) {
          console.error("Failed to store scanned barcode:", error);
          setProcessing(false);
          Alert.alert("Error", "Failed to save barcode. Please try again.");
        }
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
        />

        <CameraCaptureButton
          onPress={takePicture}
          processing={processing}
          disabled={processing}
        />

        <View style={styles.controlButton} />
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
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
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
