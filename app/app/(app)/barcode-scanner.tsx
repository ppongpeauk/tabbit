/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Barcode scanner screen - wrapper for unified camera component
 */

import { CameraScreen } from "./camera";

export default function BarcodeScannerScreen() {
  return <CameraScreen mode="barcode" />;
}
