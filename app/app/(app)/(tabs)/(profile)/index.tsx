/**
 * @author Composer
 * @description Profile screen showing basic user info
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { View, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { SymbolView } from "expo-symbols";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ProfileEditSheet } from "@/components/profile-edit-sheet";
import { FriendShareBottomSheet } from "@/components/friend-share-bottom-sheet";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import {
  updateUser,
  getUserProfileUploadUrl,
  confirmUserProfileUpload,
  uploadImageToPresignedUrl,
  getPresignedUrl,
} from "@/utils/api";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import { Button } from "@/components/button";

const DEFAULT_NAME = "Your Name";
const DEFAULT_USERNAME = "username";

function getUsername(email?: string): string {
  if (!email) {
    return DEFAULT_USERNAME;
  }
  const [localPart] = email.split("@");
  return localPart || DEFAULT_USERNAME;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, refreshUser } = useAuth();
  const displayName = user?.name || DEFAULT_NAME;
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const editSheetRef = useRef<TrueSheet>(null);
  const friendShareSheetRef = useRef<TrueSheet>(null);

  const loadProfileImage = useCallback(async (imageKey: string) => {
    try {
      setLoadingImage(true);
      const result = await getPresignedUrl(imageKey);
      if (result.success && result.url) {
        setProfileImageUrl(result.url);
      }
    } catch (error) {
      console.error("Failed to load profile image:", error);
    } finally {
      setLoadingImage(false);
    }
  }, []);

  useEffect(() => {
    if (user?.image) {
      loadProfileImage(user.image);
    } else {
      setProfileImageUrl(null);
    }
  }, [user?.image, loadProfileImage]);

  const handleEditPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    editSheetRef.current?.present();
  }, []);

  const handleAddFriendPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    friendShareSheetRef.current?.present();
  }, []);

  const handleSave = useCallback(
    async (updates: { name: string; imageUri?: string | null }) => {
      if (!user) return;

      let imageKey: string | null = null;
      if (updates.imageUri !== undefined) {
        if (updates.imageUri) {
          const extension = updates.imageUri.split(".").pop()?.toLowerCase() || "jpg";

          const uploadUrlResult = await getUserProfileUploadUrl(user.id, extension);
          if (!uploadUrlResult.success || !uploadUrlResult.uploadUrl || !uploadUrlResult.fields || !uploadUrlResult.key) {
            throw new Error(uploadUrlResult.message || "Failed to get upload URL");
          }

          let imageUri = updates.imageUri;
          const lowerUri = imageUri.toLowerCase();
          if (lowerUri.endsWith(".heic") || lowerUri.endsWith(".heif")) {
            const converted = await ImageManipulator.manipulateAsync(
              imageUri,
              [],
              {
                compress: 0.9,
                format: ImageManipulator.SaveFormat.JPEG,
              }
            );
            imageUri = converted.uri;
          }

          const contentType = extension === "png" ? "image/png" : "image/jpeg";

          const uploadResult = await uploadImageToPresignedUrl(
            uploadUrlResult.uploadUrl,
            uploadUrlResult.fields,
            imageUri,
            contentType
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.message || "Failed to upload image");
          }

          const confirmResult = await confirmUserProfileUpload(
            user.id,
            uploadUrlResult.key
          );

          if (!confirmResult.success) {
            throw new Error(confirmResult.message || "Failed to confirm upload");
          }

          imageKey = uploadUrlResult.key;
        } else {
          imageKey = null;
        }
      }

      const updateData: { name?: string; image?: string | null } = {
        name: updates.name,
      };

      if (updates.imageUri !== undefined) {
        updateData.image = imageKey;
      }

      const result = await updateUser(user.id, updateData);

      if (!result.success) {
        throw new Error(result.message || "Failed to update profile");
      }

      if (refreshUser) {
        await refreshUser();
      }

      if (updates.imageUri !== undefined) {
        if (imageKey) {
          await loadProfileImage(imageKey);
        } else {
          setProfileImageUrl(null);
        }
      }
    },
    [user, refreshUser, loadProfileImage]
  );

  return (
    <ThemedView className="flex-1">
      <View className="items-center px-6 pt-24">
        {loadingImage ? (
          <View
            className="w-28 h-28 rounded-full items-center justify-center mb-4"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)",
            }}
          >
            <ActivityIndicator
              size="small"
              color={isDark ? Colors.dark.text : Colors.light.text}
            />
          </View>
        ) : profileImageUrl ? (
          <Image
            source={{ uri: profileImageUrl }}
            className="w-28 h-28 rounded-full mb-4"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)",
            }}
          />
        ) : (
          <View
            className="w-28 h-28 rounded-full items-center justify-center mb-4"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)",
            }}
          >
            <SymbolView
              name="person.crop.circle.fill"
              size={92}
              tintColor={isDark ? Colors.dark.text : Colors.light.text}
            />
          </View>
        )}
        <ThemedText size="xl" weight="bold" className="mb-4">
          {displayName}
        </ThemedText>

        {user && (
          <View className="flex-row gap-3 mt-0">
            <Button
              onPress={handleEditPress}
              variant="secondary"
              size="base"
              className="flex-1"
              leftIcon={
                <SymbolView
                  name="square.and.pencil"
                  size={18}
                  tintColor={isDark ? Colors.dark.text : Colors.light.text}
                />
              }
            >
              Edit Profile
            </Button>
            <Button
              onPress={handleAddFriendPress}
              variant="secondary"
              size="base"
              className="flex-1"
              leftIcon={
                <SymbolView
                  name="person.badge.plus"
                  size={18}
                  tintColor={isDark ? Colors.dark.text : Colors.light.text}
                />
              }
            >
              Add Friend
            </Button>
          </View>
        )}
      </View>

      <ProfileEditSheet
        bottomSheetRef={editSheetRef}
        user={user}
        onSave={handleSave}
        onClose={() => { }}
      />
      <FriendShareBottomSheet bottomSheetRef={friendShareSheetRef} />
    </ThemedView>
  );
}
