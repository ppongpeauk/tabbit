import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHeaderScreenOptions } from "@/utils/navigation";

export default function SettingsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack screenOptions={getHeaderScreenOptions(colorScheme, true)}>
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
        name="people"
        options={{
          title: "People",
        }}
      />
      <Stack.Screen
        name="permissions"
        options={{
          title: "App Permissions",
        }}
      />
      <Stack.Screen
        name="general"
        options={{
          title: "General",
        }}
      />
    </Stack>
  );
}
