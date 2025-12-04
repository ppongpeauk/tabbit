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

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();

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
          name="sign-in"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            headerShown: false,
            presentation: "card",
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
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
