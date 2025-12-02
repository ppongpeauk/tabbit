/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Friends stack layout
 */

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";

export default function FriendsLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Friends",
            headerTitle: "Friends",
            headerLargeTitle: true,
            headerTransparent: true,
            headerTitleStyle: {
              fontFamily: "LiterataSerif-SemiBold",
            },
            headerLargeTitleStyle: {
              fontFamily: "LiterataSerif-SemiBold",
            },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
