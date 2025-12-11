/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Camera capture button with fixed colors regardless of color scheme
 */

import { CameraButton } from "./camera-button";

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
    <CameraButton
      onPress={onPress}
      processing={processing}
      disabled={disabled}
      variant="capture"
    />
  );
}
