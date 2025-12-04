import { StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import { GlassView } from "expo-glass-effect";
import { PlatformPressable } from "@react-navigation/elements";
import { Colors } from "@/constants/theme";

export interface CameraControlButtonProps {
  onPress: () => void;
  iconName: string;
  disabled?: boolean;
}

/**
 * Camera control button for actions like flash toggle, gallery picker, etc.
 */
export function CameraControlButton({
  onPress,
  iconName,
  disabled = false,
}: CameraControlButtonProps) {
  return (
    <PlatformPressable onPress={onPress} disabled={disabled}>
      <GlassView
        style={[
          styles.controlButton,
          disabled && styles.controlButtonDisabled,
        ]}
      >
        <SymbolView
          name={iconName}
          tintColor={disabled ? "#999" : Colors.dark.text}
          size={32}
        />
      </GlassView>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
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
});








