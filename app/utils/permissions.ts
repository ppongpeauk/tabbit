import * as Contacts from "expo-contacts";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";

export type PermissionStatus = "granted" | "denied" | "undetermined";

function normalizePermissionStatus(status: string): PermissionStatus {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting contacts permission:", error);
    return false;
  }
}

export async function hasContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error checking contacts permission:", error);
    return false;
  }
}

export async function getContactsPermissionStatus(): Promise<PermissionStatus> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return normalizePermissionStatus(status);
  } catch (error) {
    console.error("Error getting contacts permission status:", error);
    return "undetermined";
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting camera permission:", error);
    return false;
  }
}

export async function hasCameraPermission(): Promise<boolean> {
  try {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error checking camera permission:", error);
    return false;
  }
}

export async function getCameraPermissionStatus(): Promise<PermissionStatus> {
  try {
    const { status } = await Camera.getCameraPermissionsAsync();
    return normalizePermissionStatus(status);
  } catch (error) {
    console.error("Error getting camera permission status:", error);
    return "undetermined";
  }
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting media library permission:", error);
    return false;
  }
}

export async function hasMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error checking media library permission:", error);
    return false;
  }
}

export async function getMediaLibraryPermissionStatus(): Promise<PermissionStatus> {
  try {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return normalizePermissionStatus(status);
  } catch (error) {
    console.error("Error getting media library permission status:", error);
    return "undetermined";
  }
}

export async function requestPermissionWithFallback(
  requestFn: () => Promise<{ status: string } | { granted: boolean }>,
  checkFn: () => Promise<boolean>
): Promise<boolean> {
  const alreadyGranted = await checkFn();
  if (alreadyGranted) return true;

  try {
    const result = await requestFn();
    const granted =
      "granted" in result
        ? result.granted
        : normalizePermissionStatus("status" in result ? result.status : "") ===
          "granted";

    if (granted) return true;

    return await checkFn();
  } catch (error) {
    console.error("Error in requestPermissionWithFallback:", error);
    return false;
  }
}
