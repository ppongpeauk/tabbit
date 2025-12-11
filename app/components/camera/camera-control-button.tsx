/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Camera control button for actions like flash toggle, gallery picker, etc.
 */

import { CameraButton } from "./camera-button";
import type { CameraButtonProps } from "./camera-button";

export interface CameraControlButtonProps {
  onPress: () => void;
  iconName: string;
  disabled?: boolean;
  size?: CameraButtonProps["size"];
}

/**
 * Camera control button for actions like flash toggle, gallery picker, etc.
 */
export function CameraControlButton({
  onPress,
  iconName,
  disabled = false,
  size = "small",
}: CameraControlButtonProps) {
  return (
    <CameraButton
      onPress={onPress}
      iconName={iconName}
      disabled={disabled}
      variant="control"
      size={size}
    />
  );
}
