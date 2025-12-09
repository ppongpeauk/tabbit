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
import { Stack } from "expo-router";
import { AuthProvider } from "@/contexts/auth-context";
import { Colors } from "@/constants/theme";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { RevenueCatProvider } from "@/contexts/revenuecat-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PostHogProvider } from "posthog-react-native";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
            headerTitle: "Start",
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="sign-in"
          options={{
            headerShown: true,
            title: "Sign In",
            presentation: "card",
            headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
            headerTitleStyle: {
              color: isDark ? Colors.dark.text : Colors.light.text,
            },
            headerStyle: {
              backgroundColor: isDark
                ? Colors.dark.background
                : Colors.light.background,
            },
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            headerShown: true,
            title: "Sign Up",
            presentation: "card",
            headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
            headerTitleStyle: {
              color: isDark ? Colors.dark.text : Colors.light.text,
            },
            headerStyle: {
              backgroundColor: isDark
                ? Colors.dark.background
                : Colors.light.background,
            },
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            headerShown: true,
            title: "Reset Password",
            presentation: "modal",
            headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
            headerTitleStyle: {
              color: isDark ? Colors.dark.text : Colors.light.text,
            },
            headerStyle: {
              backgroundColor: isDark
                ? Colors.dark.background
                : Colors.light.background,
            },
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
