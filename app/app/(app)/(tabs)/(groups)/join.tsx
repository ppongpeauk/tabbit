/**
 * @author Composer
 * @description Join group screen with code input
 */

import { useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useForm, Controller } from "react-hook-form";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { joinGroup } from "@/utils/api";

interface JoinGroupFormData {
  code: string;
}

export default function JoinGroupScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinGroupFormData>({
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = async (data: JoinGroupFormData) => {
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Normalize code (remove spaces, convert to uppercase)
      const normalizedCode = data.code.replace(/\s/g, "").toUpperCase();

      // Join group via API
      const result = await joinGroup(normalizedCode);

      if (!result.success) {
        throw new Error(result.message || "Failed to join group");
      }

      Alert.alert("Success", "You've successfully joined the group!", [
        {
          text: "OK",
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to join group. Please check the code and try again."
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
          {/* Form Section */}
          <View className="w-full">
            <Controller
              control={control}
              rules={{
                required: "Group code is required",
                minLength: {
                  value: 4,
                  message: "Group code must be at least 4 characters",
                },
                pattern: {
                  value: /^[A-Z0-9\s-]+$/i,
                  message:
                    "Group code can only contain letters, numbers, and hyphens",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label="Group Code"
                  placeholder="Enter group code"
                  value={value}
                  onChangeText={(text) => {
                    // Auto-format: convert to uppercase and add spacing every 4 characters
                    const normalized = text.replace(/\s/g, "").toUpperCase();
                    const formatted =
                      normalized.match(/.{1,4}/g)?.join(" ") || normalized;
                    onChange(formatted);
                  }}
                  onBlur={onBlur}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  maxLength={20}
                  leftIcon={
                    <SymbolView
                      name="number"
                      tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                    />
                  }
                />
              )}
              name="code"
            />
            {errors.code && (
              <ThemedText
                className="-mt-3 mb-4 ml-1"
                style={{ color: "#FF3B30" }}
                size="sm"
              >
                {errors.code.message}
              </ThemedText>
            )}

            <ThemedText
              size="sm"
              className="-mt-2 mb-6 ml-1 opacity-60 leading-[18px]"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              }}
            >
              Ask the group creator for the code, or scan a QR code if
              available.
            </ThemedText>

            <Button
              variant="primary"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              className="mt-2"
            >
              {isSubmitting ? "Joining..." : "Join Group"}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)

