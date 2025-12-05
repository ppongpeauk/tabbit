/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Forgot password screen with email input for password reset
 */

import { useState } from "react";
import { View, StyleSheet, Alert, ScrollView } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { API_BASE_URL } from "@/utils/config";

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(`${API_BASE_URL}/auth/forget-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to send reset email");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Reset Link Sent",
        "If an account exists with this email, you'll receive a password reset link shortly.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send reset email"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View
            style={[
              styles.imagePlaceholder,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "#E5E5E5",
              },
            ]}
          />
          <ThemedText
            family="serif"
            weight="bold"
            style={styles.title}
            size="2xl"
          >
            Reset Password
          </ThemedText>
          <ThemedText
            style={[
              styles.subtitle,
              {
                color: isDark
                  ? Colors.dark.text + "CC"
                  : Colors.light.text + "CC",
              },
            ]}
            size="base"
          >
            Enter your email and we&apos;ll send you a reset link
          </ThemedText>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Controller
            control={control}
            rules={{
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="Email"
                placeholder="Enter your email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                leftIcon={
                  <SymbolView
                    name="envelope.fill"
                    tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                  />
                }
              />
            )}
            name="email"
          />
          {errors.email && (
            <ThemedText
              style={[styles.errorText, { color: "#FF3B30" }]}
              size="sm"
            >
              {errors.email.message}
            </ThemedText>
          )}

          <Button
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            loading={isSubmitting}
            fullWidth
            style={styles.submitButton}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>

          <Button
            variant="ghost"
            onPress={() => router.back()}
            disabled={isSubmitting}
            fullWidth
            style={styles.backButton}
          >
            Back to Sign In
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: "center",
  },
  headerSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 48,
  },
  imagePlaceholder: {
    width: "50%",
    minWidth: 100,
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 24,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  formSection: {
    width: "100%",
  },
  errorText: {
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 8,
  },
});
