/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Corner bracket component for camera guide overlays
 */

import { View, StyleSheet } from "react-native";

const BRACKET_LENGTH = 30;
const BRACKET_THICKNESS = 2;

export type CornerBracketPosition =
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

export interface CornerBracketProps {
  position: CornerBracketPosition;
}

/**
 * Corner bracket component for receipt/barcode centering guide
 */
export function CornerBracket({ position }: CornerBracketProps) {
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

const styles = StyleSheet.create({
  bracketContainer: {
    position: "absolute",
    width: BRACKET_LENGTH,
    height: BRACKET_LENGTH,
  },
  bracketLine: {
    position: "absolute",
    backgroundColor: "#fff",
  },
});

