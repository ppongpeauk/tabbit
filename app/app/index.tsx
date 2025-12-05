import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/auth-context";
import { router, useRootNavigationState, Redirect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, isLoading } = useAuth();
  const navigationState = useRootNavigationState();

  // Redirect authenticated users to the app
  useEffect(() => {
    if (!isLoading && user && navigationState?.key) {
      router.replace("/(app)/(tabs)/(receipts)");
    }
  }, [user, isLoading, navigationState?.key]);

  // Show loading while checking auth state or waiting for navigation
  if (isLoading || (user && !navigationState?.key)) {
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

  // Redirect if authenticated and navigation is ready
  if (user && navigationState?.key) {
    return <Redirect href="/(app)/(tabs)/(receipts)" />;
  }

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/sign-up");
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/sign-in");
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
        <Button
          variant="primary"
          size="base"
          onPress={handleGetStarted}
          fullWidth
        >
          Get Started
        </Button>

        <Button variant="outline" size="base" onPress={handleSignIn} fullWidth>
          Sign In
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
    gap: 8,
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
    gap: 16,
    width: "100%",
  },
  termsText: {
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
