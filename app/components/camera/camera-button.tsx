/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Shareable camera button component without glassview/blur effects
 */

import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { PlatformPressable } from "@react-navigation/elements";
import { Colors } from "@/constants/theme";

export interface CameraButtonProps {
  onPress: () => void;
  disabled?: boolean;
  variant?: "control" | "capture" | "close";
  iconName?: string;
  processing?: boolean;
  size?: "small" | "medium" | "large";
}

// Map SF Symbols to Material Icons
const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  "bolt.fill": "flash-on",
  "bolt.slash.fill": "flash-off",
  "photo.fill": "photo-library",
  xmark: "close",
  "camera.fill": "camera-alt",
  "barcode.viewfinder": "qr-code-scanner",
  close: "close",
};

const sizeMap = {
  small: { button: 48, icon: 24 },
  medium: { button: 64, icon: 28 },
  large: { button: 70, icon: 32 },
};

/**
 * Shareable camera button component without glassview/blur effects
 */
export function CameraButton({
  onPress,
  disabled = false,
  variant = "control",
  iconName,
  processing = false,
  size = variant === "capture" ? "large" : "small",
}: CameraButtonProps) {
  const dimensions = sizeMap[size];
  const materialIconName = iconName
    ? iconMap[iconName] || "help-outline"
    : undefined;

  const buttonContent = () => {
    if (variant === "capture") {
      return (
        <View
          style={[
            styles.captureButton,
            {
              width: dimensions.button,
              height: dimensions.button,
              borderRadius: dimensions.button / 2,
            },
            (processing || disabled) && styles.captureButtonProcessing,
          ]}
        >
          {processing ? (
            <ActivityIndicator
              size="small"
              color="#333"
              style={styles.activityIndicator}
            />
          ) : (
            <View
              style={[
                styles.captureButtonInner,
                {
                  width: dimensions.button - 6,
                  height: dimensions.button - 6,
                  borderRadius: (dimensions.button - 6) / 2,
                },
              ]}
            />
          )}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.controlButton,
          {
            width: dimensions.button,
            height: dimensions.button,
            borderRadius: dimensions.button / 2,
          },
          disabled && styles.controlButtonDisabled,
        ]}
      >
        {materialIconName && (
          <MaterialIcons
            name={materialIconName}
            size={dimensions.icon}
            color={disabled ? "#999" : Colors.dark.text}
          />
        )}
      </View>
    );
  };

  const ButtonWrapper = variant === "capture" ? Pressable : PlatformPressable;

  return (
    <ButtonWrapper
      onPress={onPress}
      disabled={disabled || processing}
      style={disabled && variant === "capture" && styles.captureButtonDisabled}
    >
      {buttonContent()}
    </ButtonWrapper>
  );
}

const styles = StyleSheet.create({
  controlButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  captureButton: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  captureButtonProcessing: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    opacity: 0.7,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    backgroundColor: "#fff",
  },
  activityIndicator: {
    position: "absolute",
  },
});
