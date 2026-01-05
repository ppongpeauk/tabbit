/**
 * @author Composer
 * @description Create group screen with image picker, name, and description
 */

import { useState } from "react";
import {
  View,
  ScrollView,
  Alert,
  Image,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useForm, Controller } from "react-hook-form";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import {
  createGroup,
  getGroupIconUploadUrl,
  uploadImageToPresignedUrl,
  confirmGroupIconUpload,
} from "@/utils/api";

interface CreateGroupFormData {
  name: string;
  description: string;
}

export default function CreateGroupScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGroupFormData>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const requestImagePermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your photo library to select a group icon."
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(null);
  };

  const onSubmit = async (data: CreateGroupFormData) => {
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Create the group first
      const createResult = await createGroup({
        name: data.name,
        description: data.description || undefined,
      });

      if (!createResult.success || !createResult.group) {
        throw new Error(createResult.message || "Failed to create group");
      }

      const groupId = createResult.group.id;

      // Upload icon if one was selected
      if (selectedImage) {
        try {
          // Get file extension from URI
          const extension =
            selectedImage.split(".").pop()?.toLowerCase() || "jpg";
          const contentType = `image/${
            extension === "jpg" ? "jpeg" : extension
          }`;

          // Get presigned upload URL
          const uploadUrlResult = await getGroupIconUploadUrl(
            groupId,
            extension
          );

          if (
            !uploadUrlResult.success ||
            !uploadUrlResult.uploadUrl ||
            !uploadUrlResult.fields ||
            !uploadUrlResult.key
          ) {
            throw new Error(
              uploadUrlResult.message || "Failed to get upload URL"
            );
          }

          // Upload image to S3
          const uploadResult = await uploadImageToPresignedUrl(
            uploadUrlResult.uploadUrl,
            uploadUrlResult.fields,
            selectedImage,
            contentType
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.message || "Failed to upload image");
          }

          // Confirm upload and update group
          const confirmResult = await confirmGroupIconUpload(
            groupId,
            uploadUrlResult.key
          );

          if (!confirmResult.success) {
            console.warn(
              "Group created but icon confirmation failed:",
              confirmResult.message
            );
          }
        } catch (iconError) {
          // Group was created but icon upload failed - still show success
          console.error("Icon upload failed:", iconError);
          // Still navigate to group dashboard even if icon upload failed
          console.warn("Icon upload failed, but group was created");
          router.replace(`/(app)/(tabs)/(groups)/${groupId}`);
          return;
        }
      }

      // Navigate to the newly created group dashboard
      router.replace(`/(app)/(tabs)/(groups)/${groupId}`);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create group. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      }}
      behavior="padding"
    >
      <ScrollView
        contentContainerClassName="flex-grow items-center"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full px-5 pt-5 pb-10">
          {/* Image Picker Section */}
          <View className="w-full mb-6">
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => ({
                width: 120,
                height: 120,
                borderRadius: 16,
                borderWidth: 1,
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {selectedImage ? (
                <View className="w-full h-full relative">
                  <Image
                    source={{ uri: selectedImage }}
                    className="w-full h-full rounded-2xl"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    className="absolute top-2 right-2"
                    onPress={removeImage}
                    hitSlop={8}
                  >
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(0, 0, 0, 0.7)"
                          : "rgba(255, 255, 255, 0.9)",
                      }}
                    >
                      <SymbolView
                        name="xmark"
                        tintColor={
                          isDark ? Colors.dark.text : Colors.light.text
                        }
                        size={12}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="items-center justify-center gap-2">
                  <SymbolView
                    name="photo.fill"
                    tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                    size={32}
                  />
                  <ThemedText
                    size="sm"
                    className="text-xs opacity-60"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    Tap to add icon
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </View>

          {/* Form Section */}
          <View className="w-full">
            <Controller
              control={control}
              rules={{
                required: "Group name is required",
                minLength: {
                  value: 1,
                  message: "Group name must be at least 1 character",
                },
                maxLength: {
                  value: 50,
                  message: "Group name must be less than 50 characters",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label="Group Name"
                  placeholder="Enter group name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  leftIcon={
                    <SymbolView
                      name="person.2.fill"
                      tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                    />
                  }
                />
              )}
              name="name"
            />
            {errors.name && (
              <ThemedText
                className="-mt-3 mb-4 ml-1"
                style={{ color: "#FF3B30" }}
                size="sm"
              >
                {errors.name.message}
              </ThemedText>
            )}

            <Controller
              control={control}
              rules={{
                maxLength: {
                  value: 200,
                  message: "Description must be less than 200 characters",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label="Description (Optional)"
                  placeholder="What's this group about?"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  autoCorrect={true}
                  editable={!isSubmitting}
                  className="min-h-[100px] pt-3"
                  leftIcon={
                    <SymbolView
                      name="text.alignleft"
                      tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                    />
                  }
                />
              )}
              name="description"
            />
            {errors.description && (
              <ThemedText
                className="-mt-3 mb-4 ml-1"
                style={{ color: "#FF3B30" }}
                size="sm"
              >
                {errors.description.message}
              </ThemedText>
            )}

            <Button
              variant="primary"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              className="mt-2"
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)

