/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Settings stack layout
 */

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";

export default function SettingsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerBackTitleStyle: {
          fontFamily: "LiterataSerif",
        },
        headerTitleStyle: {
          fontFamily: "LiterataSerif-SemiBold",
        },
        headerLargeTitleStyle: {
          fontFamily: "LiterataSerif-SemiBold",
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
        name="index"
        options={{
          headerTitle: "Settings",
          title: "Settings",
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: "About",
        }}
      />
    </Stack>
  );
}
