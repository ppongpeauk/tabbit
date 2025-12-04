import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans: require("../assets/fonts/DMSans-Variable.ttf"),
    "DMSans-Italic": require("../assets/fonts/DMSans-Italic-Variable.ttf"),
    Literata: require("../assets/fonts/Literata-Variable.ttf"),
    "Literata-Italic": require("../assets/fonts/Literata-Italic-Variable.ttf"),
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
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerTitleStyle: {
            fontFamily: "Literata",
          },
          headerLargeTitleStyle: {
            fontFamily: "Literata",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Receipts",
            // headerLargeTitle: true,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
