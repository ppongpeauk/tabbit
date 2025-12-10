/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Authenticated routes layout
 */

import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHeaderScreenOptions } from "@/utils/navigation";

export default function AuthenticatedLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack screenOptions={getHeaderScreenOptions(colorScheme)}>
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
        name="create-manual"
        options={{
          title: "Manual Entry",
        }}
      />
      <Stack.Screen
        name="receipt/[id]/index"
        options={{
          title: "Receipt Details",
          headerBackButtonDisplayMode: "minimal",
          headerTransparent: true,
          headerBlurEffect: "none",
          headerStyle: {
            backgroundColor: "transparent",
          },
        }}
      />
      <Stack.Screen
        name="receipt/[id]/edit"
        options={{
          title: "Edit Receipt",
        }}
      />
      <Stack.Screen
        name="split"
        options={{
          headerShown: false,
          presentation: "containedModal",
        }}
      />
    </Stack>
  );
}
