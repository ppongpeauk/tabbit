/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Root index that redirects based on authentication state
 */

import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootIndex() {
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{
          backgroundColor:
            colorScheme === "dark"
              ? Colors.dark.background
              : Colors.light.background,
        }}
      >
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? Colors.dark.tint : Colors.light.tint}
        />
      </View>
    );
  }

  // Initial redirect - navigation changes are handled in _layout.tsx
  if (user) {
    return <Redirect href="/(app)/(tabs)/(receipts)" />;
  }

  return <Redirect href="/(auth)" />;
}
