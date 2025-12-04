import { useEffect } from "react";
import { Stack, router, useRootNavigationState, Redirect } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { View, ActivityIndicator } from "react-native";

export default function AuthenticatedLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isLoading && navigationState?.key) {
      if (!user) {
        router.replace("/sign-in");
      }
    }
  }, [user, isLoading, navigationState]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
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

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack
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
  );
}

