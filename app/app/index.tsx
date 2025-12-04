import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/auth-context";
import { router, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import * as Haptics from "expo-haptics";

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (user && navigationState?.key) {
      router.replace("/(app)/(tabs)/(receipts)");
    }
  }, [user, navigationState]);

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

        <Button variant="ghost" size="base" onPress={handleSignIn} fullWidth>
          Sign In
        </Button>
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
});
