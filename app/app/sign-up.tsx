import { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/auth-context";
import { router, useRootNavigationState } from "expo-router";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, signUpWithEmail } = useAuth();
  const navigationState = useRootNavigationState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  useEffect(() => {
    if (user && navigationState?.key) {
      router.replace("/(app)/(tabs)/(receipts)");
    }
  }, [user, navigationState]);

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signUpWithEmail(data.email, data.password, data.name);
      router.replace("/(app)/(tabs)/(receipts)");
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Sign Up Failed",
        error instanceof Error ? error.message : "An error occurred"
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
        showsVerticalScrollIndicator={false}
      >
        {/* Form Section */}
        <View style={styles.formSection}>
          <Controller
            control={control}
            rules={{
              required: "Name is required",
              minLength: {
                value: 1,
                message: "Name must be at least 1 character",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="Name"
                placeholder="Enter your name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting}
                leftIcon={
                  <SymbolView
                    name="person.fill"
                    tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                  />
                }
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

          <Controller
            control={control}
            rules={{
              required: "Password is required",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="Password"
                placeholder="Enter your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                leftIcon={
                  <SymbolView
                    name="lock.fill"
                    tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                  />
                }
                rightIcon={
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                  >
                    <SymbolView
                      name={showPassword ? "eye.slash.fill" : "eye.fill"}
                      tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                    />
                  </Pressable>
                }
              />
            )}
            name="password"
          />
          {errors.password && (
            <ThemedText
              style={[styles.errorText, { color: "#FF3B30" }]}
              size="sm"
            >
              {errors.password.message}
            </ThemedText>
          )}

          <Controller
            control={control}
            rules={{
              required: "Please confirm your password",
              validate: (value) =>
                value === password || "Passwords do not match",
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="Confirm Password"
                placeholder="Confirm your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                leftIcon={
                  <SymbolView
                    name="lock.fill"
                    tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                  />
                }
                rightIcon={
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={8}
                  >
                    <SymbolView
                      name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"}
                      tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                    />
                  </Pressable>
                }
              />
            )}
            name="confirmPassword"
          />
          {errors.confirmPassword && (
            <ThemedText
              style={[styles.errorText, { color: "#FF3B30" }]}
              size="sm"
            >
              {errors.confirmPassword.message}
            </ThemedText>
          )}

          <Button
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            loading={isSubmitting}
            fullWidth
          >
            {isSubmitting ? "Creating Account..." : "Sign Up"}
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
    paddingTop: 40,
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
  welcomeText: {
    textAlign: "center",
  },
  formSection: {
    width: "100%",
  },
  errorText: {
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
});
