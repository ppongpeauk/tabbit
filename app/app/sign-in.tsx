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

interface SignInFormData {
  email: string;
  password: string;
}

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, signInWithEmail } = useAuth();
  const navigationState = useRootNavigationState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user && navigationState?.key) {
      router.replace("/(app)/(tabs)/(receipts)");
    }
  }, [user, navigationState]);

  const onSubmit = async (data: SignInFormData) => {
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signInWithEmail(data.email, data.password);
      router.replace("/(app)/(tabs)/(receipts)");
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Sign In Failed",
        error instanceof Error ? error.message : "Invalid email or password"
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

          <Button
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            loading={isSubmitting}
            fullWidth
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>

          <Button
            variant="ghost"
            onPress={() => router.push("/forgot-password")}
            disabled={isSubmitting}
            fullWidth
            style={styles.forgotPasswordButton}
          >
            Forgot Password?
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
  forgotPasswordButton: {
    marginTop: 8,
  },
});
