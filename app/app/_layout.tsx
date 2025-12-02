/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Root layout with Stack navigator wrapping native tabs
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
import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerBackTitleStyle: {
            fontFamily: "DMSans",
          },
          headerTitleStyle: {
            fontFamily: "DMSans-Bold",
            fontWeight: "700",
          },
          headerStyle: {
            backgroundColor:
              colorScheme === "dark"
                ? Colors.dark.background
                : Colors.light.background,
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          initialParams={{
            screen: "(receipts)",
          }}
          options={{
            headerShown: false,
            title: "Receipts",
          }}
        />
        {/* Receipt detail screens - these will hide the tab bar */}
        <Stack.Screen
          name="camera"
          options={{
            title: "Camera",
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="barcode-scanner"
          options={{
            title: "Scan Barcode",
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="create"
          options={{
            title: "New Receipt",
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="[id]/index"
          options={{
            title: "Receipt Details",
          }}
        />
        <Stack.Screen
          name="split"
          options={{
            title: "Split Receipt",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
