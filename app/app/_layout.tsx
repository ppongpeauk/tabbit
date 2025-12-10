/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Root layout with authenticated/unauthenticated stacks
 */

import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import "expo-dev-client";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { RevenueCatProvider } from "@/contexts/revenuecat-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PostHogProvider } from "posthog-react-native";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inAppGroup = segments[0] === "(app)";

    if (user && !inAppGroup) {
      // User is signed in but not in app group, redirect to app
      router.replace("/(app)/(tabs)/(receipts)");
    } else if (!user && !inAuthGroup) {
      // User is not signed in but not in auth group, redirect to auth
      router.replace("/(auth)");
    }
  }, [user, isLoading, segments, router]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(app)"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans: require("../assets/fonts/DMSans/static/DMSans-Regular.ttf"),
    "DMSans-Italic": require("../assets/fonts/DMSans/static/DMSans-Italic.ttf"),
    "DMSans-Bold": require("../assets/fonts/DMSans/static/DMSans-Bold.ttf"),
    "DMSans-SemiBold": require("../assets/fonts/DMSans/static/DMSans-SemiBold.ttf"),
    LiterataSerif: require("../assets/fonts/LiterataSerif/static/Literata-Regular.ttf"),
    "LiterataSerif-SemiBold": require("../assets/fonts/LiterataSerif/static/Literata-SemiBold.ttf"),
    "LiterataSerif-Italic": require("../assets/fonts/LiterataSerif/static/Literata-Italic.ttf"),
    "LiterataSerif-Bold": require("../assets/fonts/LiterataSerif/static/Literata-Bold.ttf"),
    InconsolataMono: require("../assets/fonts/InconsolataMono/static/Inconsolata-Regular.ttf"),
    "InconsolataMono-Bold": require("../assets/fonts/InconsolataMono/static/Inconsolata-Bold.ttf"),
    "InconsolataMono-SemiBold": require("../assets/fonts/InconsolataMono/static/Inconsolata-SemiBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY}
        options={{
          host: "https://us.i.posthog.com",
          enableSessionReplay: true,
        }}
        autocapture
      >
        <BottomSheetModalProvider>
          <KeyboardProvider>
            <AuthProvider>
              <RevenueCatProvider>
                <RootLayoutNav />
              </RevenueCatProvider>
            </AuthProvider>
          </KeyboardProvider>
        </BottomSheetModalProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
