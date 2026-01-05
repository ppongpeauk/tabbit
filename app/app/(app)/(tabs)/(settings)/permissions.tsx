/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description App permissions management screen
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Linking,
  Alert,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";

type PermissionStatus = "granted" | "denied" | "undetermined" | "checking";

interface PermissionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: PermissionStatus;
  onRequest: () => Promise<void>;
  onOpenSettings?: () => void;
}

const normalizePermissionStatus = (status: string): PermissionStatus => {
  return status === "granted"
    ? "granted"
    : status === "denied"
    ? "denied"
    : "undetermined";
};

export default function PermissionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    ImagePicker.useMediaLibraryPermissions();
  const [contactsPermission, setContactsPermission] =
    useState<PermissionStatus>("checking");
  const [isRequesting, setIsRequesting] = useState<string | null>(null);

  const getPermissionStatus = (
    permission: { granted: boolean; canAskAgain?: boolean } | null
  ): PermissionStatus => {
    if (!permission) return "checking";
    return permission.granted
      ? "granted"
      : permission.canAskAgain !== false
      ? "undetermined"
      : "denied";
  };

  const checkContactsPermission = useCallback(async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      setContactsPermission(normalizePermissionStatus(status));
    } catch (error) {
      console.error("Error checking contacts permission:", error);
      setContactsPermission("undetermined");
    }
  }, []);

  useEffect(() => {
    checkContactsPermission();
  }, [checkContactsPermission]);

  useFocusEffect(
    useCallback(() => {
      checkContactsPermission();
    }, [checkContactsPermission])
  );

  const showPermissionDeniedAlert = (message: string) => {
    Alert.alert("Permission Denied", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => Linking.openSettings(),
      },
    ]);
  };

  const handlePermissionRequest = async (
    permissionId: string,
    requestFn: () => Promise<{ granted: boolean } | { status: string }>,
    deniedMessage: string,
    onStatusUpdate?: (status: PermissionStatus) => void
  ) => {
    setIsRequesting(permissionId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await requestFn();
      const granted =
        "granted" in result
          ? result.granted
          : normalizePermissionStatus(
              "status" in result ? result.status : ""
            ) === "granted";

      if ("status" in result && onStatusUpdate) {
        onStatusUpdate(normalizePermissionStatus(result.status));
      }

      if (!granted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showPermissionDeniedAlert(deniedMessage);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error(`Error requesting ${permissionId} permission:`, error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (onStatusUpdate) {
        onStatusUpdate("undetermined");
      }
    } finally {
      setIsRequesting(null);
    }
  };

  const handleRequestCamera = () =>
    handlePermissionRequest(
      "camera",
      requestCameraPermission,
      "Camera permission is required to scan receipts. You can enable it in Settings."
    );

  const handleRequestMediaLibrary = () =>
    handlePermissionRequest(
      "mediaLibrary",
      requestMediaLibraryPermission,
      "Photo library permission is required to select receipt images. You can enable it in Settings."
    );

  const handleRequestContacts = () =>
    handlePermissionRequest(
      "contacts",
      Contacts.requestPermissionsAsync,
      "Contacts permission is required to import contacts as friends. You can enable it in Settings.",
      setContactsPermission
    );

  const getActionButtonStyle = (pressed: boolean) => ({
    backgroundColor: pressed
      ? colorScheme === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.03)"
      : colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.05)",
  });

  const permissions: PermissionItem[] = [
    {
      id: "camera",
      title: "Camera",
      description:
        "Allows you to scan receipts and food items directly using your device's camera.",
      icon: "camera.fill",
      status: getPermissionStatus(cameraPermission),
      onRequest: handleRequestCamera,
    },
    {
      id: "mediaLibrary",
      title: "Photo Library",
      description:
        "Allows you to select receipt images from your photo library to scan.",
      icon: "photo.fill",
      status: getPermissionStatus(mediaLibraryPermission),
      onRequest: handleRequestMediaLibrary,
    },
    {
      id: "contacts",
      title: "Contacts",
      description:
        "Allows you to import contacts from your device to add them as friends for splitting expenses.",
      icon: "person.2.fill",
      status: contactsPermission,
      onRequest: handleRequestContacts,
    },
  ];

  const getIconColor = (status: PermissionStatus) => {
    if (status === "granted") return "#34C759";
    if (status === "denied") return "#FF3B30";
    return isDark ? Colors.dark.icon : Colors.light.icon;
  };

  const renderPermissionItem = (permission: PermissionItem) => {
    const { status } = permission;
    const isGranted = status === "granted";
    const isDenied = status === "denied";
    const isLoading = isRequesting === permission.id;
    const canRequest = status === "undetermined" || status === "checking";

    return (
      <View
        key={permission.id}
        className="rounded-xl p-4 gap-4 border"
        style={{
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(255, 255, 255, 1)",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        }}
      >
        <View className="flex-row gap-3">
          <View className="w-10 h-10 rounded-full items-center justify-center">
            <SymbolView
              name={permission.icon as unknown as SymbolViewProps["name"]}
              size={24}
              tintColor={getIconColor(status)}
            />
          </View>
          <View className="flex-1">
            <ThemedText size="base" weight="bold" family="sans">
              {permission.title}
            </ThemedText>
            <ThemedText size="sm" family="sans">
              {permission.description}
            </ThemedText>
          </View>
        </View>
        <View className="items-end">
          {isGranted ? (
            <View className="flex-row items-center gap-1.5">
              <SymbolView
                name="checkmark.circle.fill"
                size={20}
                tintColor="#34C759"
              />
              <ThemedText
                size="sm"
                weight="bold"
                family="sans"
                style={{ color: "#34C759" }}
              >
                Granted
              </ThemedText>
            </View>
          ) : isDenied ? (
            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                },
                getActionButtonStyle(pressed),
              ]}
            >
              <ThemedText size="sm" weight="bold" family="sans">
                Open Settings
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={permission.onRequest}
              disabled={isLoading || !canRequest}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  opacity: isLoading || !canRequest ? 0.5 : 1,
                },
                getActionButtonStyle(pressed),
              ]}
            >
              <ThemedText size="sm" weight="bold" family="sans">
                {isLoading ? "Requesting..." : "Grant Permission"}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView className="flex-1">
      <ScrollView
        contentContainerClassName="px-5 pt-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <ThemedText size="lg" weight="bold" family="sans">
            App Permissions
          </ThemedText>
          <ThemedText size="sm" family="sans">
            Tabbit needs certain permissions to work properly. We only use these
            features when needed—your data is never shared.
          </ThemedText>
        </View>

        <View className="gap-4 mb-8">
          {permissions.map(renderPermissionItem)}
        </View>

        <View
          className="pt-4 border-t"
          style={{
            borderTopColor:
              colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
          }}
        >
          <ThemedText
            size="sm"
            style={{
              fontFamily: Fonts.sans,
              textAlign: "center",
              opacity: 0.6,
              lineHeight: 20,
            }}
          >
            If you&apos;ve denied a permission, you can enable it in your
            device&apos;s Settings app.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
