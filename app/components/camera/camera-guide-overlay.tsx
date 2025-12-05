import { View, StyleSheet, Dimensions } from "react-native";
import { CornerBracket } from "./corner-bracket";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GUIDE_PADDING = 40;

export interface CameraGuideOverlayProps {
  /** Aspect ratio of the guide (width/height). Default: 3/4 for receipts */
  aspectRatio?: number;
  /** Custom guide width. If not provided, uses screen width minus padding */
  guideWidth?: number;
}

/**
 * Camera guide overlay with corner brackets for centering
 */
export function CameraGuideOverlay({
  aspectRatio = 3 / 4,
  guideWidth = SCREEN_WIDTH - GUIDE_PADDING * 2,
}: CameraGuideOverlayProps) {
  const guideHeight = guideWidth / aspectRatio;

  return (
    <View style={styles.guideOverlay}>
      <View
        style={[
          styles.guideFrame,
          {
            width: guideWidth,
            height: guideHeight,
          },
        ]}
      >
        <CornerBracket position="topLeft" />
        <CornerBracket position="topRight" />
        <CornerBracket position="bottomLeft" />
        <CornerBracket position="bottomRight" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
