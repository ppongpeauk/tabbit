import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function SettingsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerBackTitleStyle: {
          fontFamily: "DMSans",
        },
        headerTitleStyle: {
          fontFamily: "DMSans-SemiBold",
        },
        headerLargeTitleStyle: {
          fontFamily: "DMSans-SemiBold",
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
      <Stack.Screen
        name="friends"
        options={{
          title: "Friends",
        }}
      />
      <Stack.Screen
        name="import-contacts"
        options={{
          title: "Import Contacts",
        }}
      />
    </Stack>
  );
}
