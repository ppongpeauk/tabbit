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
  Dimensions,
  Text,
  ActivityIndicator,
  useColorScheme,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GUIDE_PADDING = 40;
const GUIDE_WIDTH = SCREEN_WIDTH - GUIDE_PADDING * 2;
const GUIDE_HEIGHT = GUIDE_WIDTH * (5 / 3); // 3:4 aspect ratio
const BRACKET_LENGTH = 30;
const BRACKET_THICKNESS = 2;

/**
 * Corner bracket component for receipt centering guide
 */
function CornerBracket({
  position,
}: {
  position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
}) {
  const isLeft = position === "topLeft" || position === "bottomLeft";
  const isTop = position === "topLeft" || position === "topRight";

  const horizontalStyle = {
    width: BRACKET_LENGTH,
    height: BRACKET_THICKNESS,
    ...(isTop ? { top: 0 } : { bottom: 0 }),
    ...(isLeft ? { left: 0 } : { right: 0 }),
  };

  const verticalStyle = {
    width: BRACKET_THICKNESS,
    height: BRACKET_LENGTH,
    ...(isTop ? { top: 0 } : { bottom: 0 }),
    ...(isLeft ? { left: 0 } : { right: 0 }),
  };

  return (
    <View
      style={[
        styles.bracketContainer,
        {
          top: isTop ? 0 : undefined,
          bottom: isTop ? undefined : 0,
          left: isLeft ? 0 : undefined,
          right: isLeft ? undefined : 0,
        },
      ]}
    >
      <View style={[styles.bracketLine, horizontalStyle]} />
      <View style={[styles.bracketLine, verticalStyle]} />
    </View>
  );
}

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const colorScheme = useColorScheme();
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

        // Scan the receipt immediately
        const response = await scanReceipt(photo.uri);

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

        // Receipt detected - navigate to create screen
        router.back();
        setTimeout(() => {
          router.push({
            pathname: "/create",
            params: {
              imageUri: photo.uri,
              barcodes: response.barcodes
                ? JSON.stringify(response.barcodes)
                : undefined,
            },
          });
        }, 100);
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

  const pickImage = async () => {
    if (processing) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setProcessing(true);
        // Scan the receipt immediately
        const response = await scanReceipt(result.assets[0].uri);

        if (!response.success || !response.receipt) {
          // No receipt detected - show alert and re-enable
          setProcessing(false);
          Alert.alert(
            "No Receipt Detected",
            response.message ||
              "No receipt was detected in the image. Please try again with a clearer image of a receipt.",
            [{ text: "OK" }]
          );
          return;
        }

        // Receipt detected - navigate to create screen
        router.back();
        setTimeout(() => {
          router.push({
            pathname: "/create",
            params: {
              imageUri: result.assets[0].uri,
              barcodes: response.barcodes
                ? JSON.stringify(response.barcodes)
                : undefined,
            },
          });
        }, 100);
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
      <View style={styles.guideOverlay}>
        <View
          style={[
            styles.guideFrame,
            {
              width: GUIDE_WIDTH,
              height: GUIDE_HEIGHT,
            },
          ]}
        >
          <CornerBracket position="topLeft" />
          <CornerBracket position="topRight" />
          <CornerBracket position="bottomLeft" />
          <CornerBracket position="bottomRight" />
        </View>
      </View>
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          Make sure the receipt is in focus and follows the guide.
        </Text>
      </View>
      <View style={styles.controls}>
        <PlatformPressable onPress={toggleFlash} disabled={processing}>
          <GlassView
            style={[
              styles.controlButton,
              processing && styles.controlButtonDisabled,
            ]}
          >
            <SymbolView
              name={flash === "on" ? "bolt.fill" : "bolt.slash.fill"}
              tintColor={processing ? "#999" : Colors.dark.text}
              size={32}
            />
          </GlassView>
        </PlatformPressable>

        <PlatformPressable
          onPress={takePicture}
          disabled={processing}
          style={processing && styles.captureButtonDisabled}
        >
          <GlassView
            style={[
              styles.captureButton,
              processing && styles.captureButtonProcessing,
            ]}
          >
            {processing ? (
              <ActivityIndicator
                size="small"
                color={
                  colorScheme === "dark" ? Colors.dark.text : Colors.light.text
                }
                style={styles.activityIndicator}
              />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </GlassView>
        </PlatformPressable>

        <PlatformPressable onPress={pickImage} disabled={processing}>
          <GlassView
            style={[
              styles.controlButton,
              processing && styles.controlButtonDisabled,
            ]}
          >
            <SymbolView
              name="photo.fill"
              tintColor={processing ? "#999" : Colors.dark.text}
              size={32}
            />
          </GlassView>
        </PlatformPressable>
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
  controlButtonDisabled: {
    opacity: 0.5,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 36,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  captureButtonProcessing: {
    backgroundColor: "#ccc",
    borderColor: "rgba(0, 0, 0, 0.2)",
    opacity: 0.7,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
  },
  activityIndicator: {
    position: "absolute",
  },
  allowButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#0a7ea4",
    justifyContent: "center",
    alignItems: "center",
  },
  guideOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 84,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  guideFrame: {
    position: "relative",
  },
  bracketContainer: {
    position: "absolute",
    width: BRACKET_LENGTH,
    height: BRACKET_LENGTH,
  },
  bracketLine: {
    position: "absolute",
    backgroundColor: "#fff",
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
