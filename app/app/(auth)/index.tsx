/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Welcome/start screen with social authentication options
 */

import { View, StyleSheet, ActivityIndicator, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import GoogleIcon from "@/assets/images/brand/google.png";
import AppleIcon from "@/assets/images/brand/apple.png";

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, isLoading, signInWithGoogle, signInWithApple } = useAuth();

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
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
      await signInWithGoogle();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Google sign in error:", error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signInWithApple();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Apple sign in error:", error);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <ThemedText size={72} family="serif" weight="bold">
            🧾
          </ThemedText>
        </View>
        <ThemedText
          family="serif"
          weight="bold"
          style={styles.heroTitle}
          size="3xl"
        >
          Tabbit
        </ThemedText>
        <ThemedText
          style={[
            styles.heroSubtitle,
            {
              color: isDark
                ? Colors.dark.text + "CC"
                : Colors.light.text + "CC",
            },
          ]}
          size="base"
        >
          Track your receipts, split expenses, and manage your finances with
          ease.
        </ThemedText>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
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
          leftIcon={
            <Image
              source={GoogleIcon}
              style={styles.brandIcon}
              resizeMode="contain"
            />
          }
        >
          Continue with Google
        </Button>

        <Button
          variant="primary"
          size="base"
          onPress={handleAppleSignIn}
          fullWidth
          leftIcon={
            <Image
              source={AppleIcon}
              style={[styles.brandIcon, !isDark && styles.appleIconLight]}
              resizeMode="contain"
            />
          }
        >
          Continue with Apple
        </Button>

        <ThemedText
          style={[
            styles.termsText,
            {
              color: isDark
                ? Colors.dark.text + "80"
                : Colors.light.text + "80",
            },
          ]}
          size="sm"
        >
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  heroIcon: {
    marginBottom: 8,
  },
  heroTitle: {
    textAlign: "center",
  },
  heroSubtitle: {
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
    maxWidth: 320,
  },
  actionsSection: {
    gap: 12,
    width: "100%",
  },
  termsText: {
    textAlign: "center",
    paddingHorizontal: 16,
  },
  brandIcon: {
    width: 20,
    height: 20,
  },
  appleIconLight: {
    tintColor: "#FFFFFF", // Invert to white in light mode (black button background)
  },
});
