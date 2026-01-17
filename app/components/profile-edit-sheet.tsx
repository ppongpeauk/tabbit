import { useState, useEffect, useCallback } from "react";
import { ScrollView, View, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { getPresignedUrl } from "@/utils/api";
import type React from "react";
import type { User } from "@/contexts/auth-context";

interface ProfileEditSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  user: User | null;
  onSave: (updates: { name: string; imageUri?: string | null }) => Promise<void>;
  onClose: () => void;
}

export function ProfileEditSheet({
  bottomSheetRef,
  user,
  onSave,
  onClose,
}: ProfileEditSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [name, setName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageKey, setOriginalImageKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const loadProfileImage = useCallback(async (imageKey: string) => {
    try {
      setLoadingImage(true);
      const result = await getPresignedUrl(imageKey);
      if (result.success && result.url) {
        setOriginalImage(result.url);
        setSelectedImage(result.url);
      } else {
        setOriginalImage(null);
        setSelectedImage(null);
      }
    } catch (error) {
      console.error("Failed to load profile image:", error);
      setOriginalImage(null);
      setSelectedImage(null);
    } finally {
      setLoadingImage(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      const imageKey = user.image || null;
      setOriginalImageKey(imageKey);
      if (imageKey) {
        loadProfileImage(imageKey);
      } else {
        setOriginalImage(null);
        setSelectedImage(null);
      }
    }
  }, [user, loadProfileImage]);

  const hasChanges = useCallback(() => {
    const nameChanged = name.trim() !== (user?.name || "");
    const imageChanged = selectedImage !== originalImage;
    return nameChanged || imageChanged;
  }, [name, selectedImage, originalImage, user?.name]);

  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your photo library to select a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges()) {
      bottomSheetRef.current?.dismiss();
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const isNewImage = selectedImage && selectedImage.startsWith("file://");
      const isRemoved = selectedImage === null && originalImageKey !== null;
      const imageUri = isNewImage ? selectedImage : (isRemoved ? null : undefined);

      await onSave({
        name: name.trim(),
        imageUri,
      });

      bottomSheetRef.current?.dismiss();
      onClose();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [name, selectedImage, originalImageKey, hasChanges, onSave, bottomSheetRef, onClose]);

  const handleDiscard = useCallback(() => {
    if (hasChanges()) {
      Alert.alert(
        "Discard Changes?",
        "Are you sure you want to discard your changes?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: async () => {
              if (user) {
                setName(user.name || "");
                const imageKey = user.image || null;
                setOriginalImageKey(imageKey);
                if (imageKey) {
                  await loadProfileImage(imageKey);
                } else {
                  setOriginalImage(null);
                  setSelectedImage(null);
                }
              }
              bottomSheetRef.current?.dismiss();
              onClose();
            },
          },
        ]
      );
    } else {
      bottomSheetRef.current?.dismiss();
      onClose();
    }
  }, [hasChanges, user, loadProfileImage, bottomSheetRef, onClose]);

  const isValid = name.trim().length > 0;
  const hasUnsavedChanges = hasChanges();

  return (
    <TrueSheet
      ref={bottomSheetRef}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      scrollable
    >
      <ScrollView
        contentContainerClassName="px-6 py-8"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <ThemedText size="lg" weight="semibold">
              Edit Profile
            </ThemedText>
          </View>
        </View>

        {/* Profile Picture Section */}
        <View className="items-center mb-6">
          <View className="relative">
            {loadingImage ? (
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
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
            ) : selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                className="w-24 h-24 rounded-full"
                style={{ backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }}
              />
            ) : (
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
                }}
              >
                <SymbolView
                  name="person.crop.circle.fill"
                  size={64}
                  tintColor={isDark ? Colors.dark.text : Colors.light.text}
                />
              </View>
            )}

            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.7}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center"
              style={{
                backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
              }}
            >
              <SymbolView
                name="camera.fill"
                size={16}
                tintColor={isDark ? "#000000" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>

          {selectedImage && (
            <Button
              onPress={handleRemoveImage}
              variant="ghost"
              size="sm"
              className="mt-3"
            >
              Remove Photo
            </Button>
          )}
        </View>

        {/* Name Input */}
        <FormTextInput
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          autoFocus={false}
        />

        <View className="flex-row gap-3 mt-4">
          <Button
            onPress={handleDiscard}
            disabled={isSaving}
            variant="secondary"
            className="flex-1"
            fullWidth
          >
            Discard
          </Button>

          <Button
            onPress={handleSave}
            disabled={!isValid || isSaving || !hasUnsavedChanges}
            variant="primary"
            loading={isSaving}
            className="flex-1"
            fullWidth
          >
            Save
          </Button>
        </View>
      </ScrollView>
    </TrueSheet>
  );
}
