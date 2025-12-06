import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useForm, Controller } from "react-hook-form";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { HeaderButton } from "@react-navigation/elements";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as ImagePicker from "expo-image-picker";
import {
  getGroup,
  getPresignedUrl,
  updateGroup,
  deleteGroup,
  getGroupIconUploadUrl,
  confirmGroupIconUpload,
  uploadImageToPresignedUrl,
  type Group,
} from "@/utils/api";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth-context";

interface EditGroupFormData {
  name: string;
  description: string;
}

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const navigation = useNavigation();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditGroupFormData>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const loadGroup = useCallback(async () => {
    if (!id) return;

    try {
      const result = await getGroup(id);
      if (result.success && result.group) {
        setGroup(result.group);
        reset({
          name: result.group.name,
          description: result.group.description || "",
        });

        if (result.group.iconKey) {
          try {
            const urlResult = await getPresignedUrl(result.group.iconKey);
            if (urlResult.success && urlResult.url) {
              setIconUrl(urlResult.url);
              setSelectedImage(urlResult.url);
            }
          } catch (error) {
            console.error("Failed to load group icon:", error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load group:", error);
    } finally {
      setLoading(false);
    }
  }, [id, reset]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton onPress={() => router.back()}>
          <SymbolView
            name="xmark"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator
              size="small"
              color={isDark ? Colors.dark.text : Colors.light.text}
            />
          ) : (
            <ThemedText
              size="base"
              style={{
                color: isDark ? Colors.dark.tint : Colors.light.tint,
              }}
            >
              Save
            </ThemedText>
          )}
        </HeaderButton>
      ),
    });
  }, [navigation, isDark, isSubmitting, handleSubmit]);

  const pickImage = async () => {
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

  const onSubmit = async (data: EditGroupFormData) => {
    if (!group || !id) return;

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await updateGroup(id, {
        name: data.name,
        description: data.description || undefined,
      });

      if (!result.success) {
        throw new Error(result.message || "Failed to update group");
      }

      const currentIconUrl = iconUrl;
      const hasNewImage = selectedImage && selectedImage !== currentIconUrl;
      const removedImage = !selectedImage && currentIconUrl;

      if (hasNewImage) {
        try {
          const extension =
            selectedImage.split(".").pop()?.toLowerCase() || "jpg";
          const contentType = `image/${
            extension === "jpg" ? "jpeg" : extension
          }`;

          const uploadUrlResult = await getGroupIconUploadUrl(id, extension);
          if (
            uploadUrlResult.success &&
            uploadUrlResult.uploadUrl &&
            uploadUrlResult.fields &&
            uploadUrlResult.key
          ) {
            const uploadResult = await uploadImageToPresignedUrl(
              uploadUrlResult.uploadUrl,
              uploadUrlResult.fields,
              selectedImage,
              contentType
            );

            if (uploadResult.success) {
              await confirmGroupIconUpload(id, uploadUrlResult.key);
            }
          }
        } catch (iconError) {
          console.error("Icon upload failed:", iconError);
        }
      } else if (removedImage) {
        // TODO: Implement icon removal API if available
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to update group. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!group || !id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              const result = await deleteGroup(id);
              if (!result.success) {
                throw new Error(result.message || "Failed to delete group");
              }
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              router.replace("/(app)/(tabs)/(groups)");
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "Failed to delete group. Please try again."
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [group, id]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? Colors.dark.text : Colors.light.text}
        />
      </View>
    );
  }

  if (!group) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <ThemedText size="lg" weight="semibold">
          Group not found
        </ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Picker Section */}
        <View style={styles.imageSection}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [
              styles.imagePicker,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {selectedImage ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={removeImage}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.removeButtonInner,
                      {
                        backgroundColor: isDark
                          ? "rgba(0, 0, 0, 0.7)"
                          : "rgba(255, 255, 255, 0.9)",
                      },
                    ]}
                  >
                    <SymbolView
                      name="xmark"
                      tintColor={isDark ? Colors.dark.text : Colors.light.text}
                      size={12}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <SymbolView
                  name="photo"
                  tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                  size={48}
                />
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                    marginTop: 8,
                  }}
                >
                  Tap to add icon
                </ThemedText>
              </View>
            )}
          </Pressable>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
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
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter group name"
                autoFocus
                leftIcon={<SymbolView name="person.2.fill" />}
              />
            )}
            name="name"
          />
          {errors.name && (
            <ThemedText
              style={[styles.errorText, { color: "#FF3B30" }]}
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
                label="Description"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter description (optional)"
                multiline
                numberOfLines={3}
                leftIcon={<SymbolView name="text.alignleft" />}
              />
            )}
            name="description"
          />
          {errors.description && (
            <ThemedText
              style={[styles.errorText, { color: "#FF3B30" }]}
              size="sm"
            >
              {errors.description.message}
            </ThemedText>
          )}
        </View>

        {/* Delete Button */}
        <View style={styles.deleteSection}>
          <Button
            variant="outline"
            onPress={handleDelete}
            disabled={isDeleting || isSubmitting}
            style={[
              styles.deleteButton,
              {
                borderColor: "#FF3B30",
              },
            ]}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <ThemedText
                size="base"
                weight="semibold"
                style={{ color: "#FF3B30" }}
              >
                Delete Group
              </ThemedText>
            )}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  imageSection: {
    alignItems: "center",
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  removeButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  formSection: {
    gap: 16,
  },
  errorText: {
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  deleteSection: {
    marginTop: 8,
  },
  deleteButton: {
    borderWidth: 1,
  },
});
