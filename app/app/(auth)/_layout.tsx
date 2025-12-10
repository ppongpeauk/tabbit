/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Unauthenticated routes layout
 */

import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function UnauthenticatedLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
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
    </Stack>
  );
}
