/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Welcome/start screen with social authentication options
 */

import { View, ActivityIndicator, Image, Alert } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/auth-context";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import GoogleIcon from "@/assets/images/brand/google.png";
import AppleIcon from "@/assets/images/brand/apple.png";
import { checkServerHealth } from "@/utils/api";

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <View
        className="flex-1 justify-between pt-[100px] pb-[60px] px-8"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? Colors.dark.tint : Colors.light.tint}
        />
      </View>
    );
  }

  // const handleGetStarted = () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //   router.push("/sign-up");
  // };

  // const handleSignIn = () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  //   router.push("/sign-in");
  // };

  const handleGoogleSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsCheckingServer(true);

      const startTime = Date.now();
      const MIN_DELAY_MS = 800; // Minimum delay to show loading indicator

      // Check if server is up before proceeding
      const isServerUp = await checkServerHealth();

      // Ensure minimum delay for better UX
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < MIN_DELAY_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_DELAY_MS - elapsedTime)
        );
      }

      if (!isServerUp) {
        setIsCheckingServer(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Server Unavailable",
          "Unable to connect to the server. Please check your connection and try again.",
          [{ text: "OK" }]
        );
        return;
      }

      // Server is up, proceed with Google sign-in
      setIsCheckingServer(false);
      await signInWithGoogle();
    } catch (error) {
      setIsCheckingServer(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Google sign in error:", error);
    }
  };

  const handleAppleSignIn = async () => {
    // TODO: Implement Sign in with Apple
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Button kept for future implementation
  };

  return (
    <View
      className="flex-1 justify-between pt-[100px] pb-[60px] px-8"
      style={{
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      }}
    >
      {/* Hero Section */}
      <View className="flex-1 justify-center items-center gap-1">
        <View className="mb-2">
          <ThemedText size={72} family="serif" weight="bold">
            🧾
          </ThemedText>
        </View>
        <ThemedText
          family="serif"
          weight="bold"
          className="text-center"
          size="3xl"
        >
          Tabbit
        </ThemedText>
        <ThemedText
          className="text-center leading-6 px-4 max-w-[320px]"
          style={{
            color: isDark ? Colors.dark.text + "CC" : Colors.light.text + "CC",
          }}
          size="base"
        >
          Track your receipts, split expenses, and manage your finances with
          ease.
        </ThemedText>
      </View>

      {/* Action Buttons */}
      <View className="gap-3 w-full">
        {/* Old buttons - commented out */}
        {/* <Button
          variant="primary"
          size="base"
          onPress={handleGetStarted}
          fullWidth
        >
          Get Started
        </Button>

        <Button variant="outline" size="base" onPress={handleSignIn} fullWidth>
          Sign In
        </Button> */}

        {/* Social Sign In Buttons */}
        <Button
          variant="primary"
          size="base"
          onPress={handleGoogleSignIn}
          fullWidth
          loading={isCheckingServer}
          disabled={isCheckingServer}
          leftIcon={
            !isCheckingServer ? (
              <Image
                source={GoogleIcon}
                className="w-5 h-5"
                resizeMode="contain"
              />
            ) : undefined
          }
        >
          {isCheckingServer ? "Contacting server..." : "Continue with Google"}
        </Button>

        <Button
          variant="primary"
          size="base"
          onPress={handleAppleSignIn}
          fullWidth
          disabled
          leftIcon={
            <Image
              source={AppleIcon}
              className={`w-5 h-5`}
              tintColor={isDark ? Colors.dark.text : Colors.light.text}
              resizeMode="contain"
            />
          }
        >
          Continue with Apple
        </Button>

        <ThemedText
          className="text-center px-4"
          style={{
            color: isDark ? Colors.dark.text + "80" : Colors.light.text + "80",
          }}
          size="sm"
        >
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </ThemedText>
      </View>
    </View>
  );
}
