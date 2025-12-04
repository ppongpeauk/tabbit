import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { GlassView } from "expo-glass-effect";

export interface CameraCaptureButtonProps {
  onPress: () => void;
  processing?: boolean;
  disabled?: boolean;
}

/**
 * Camera capture button with fixed colors regardless of color scheme
 */
export function CameraCaptureButton({
  onPress,
  processing = false,
  disabled = false,
}: CameraCaptureButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || processing}
      style={disabled && styles.captureButtonDisabled}
    >
      <GlassView
        style={[
          styles.captureButton,
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
          <View style={styles.captureButtonInner} />
        )}
      </GlassView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});






