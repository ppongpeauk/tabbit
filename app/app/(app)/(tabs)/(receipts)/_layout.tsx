import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SymbolView } from "expo-symbols";
import { Colors, Fonts } from "@/constants/theme";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

/**
 * Header right component with camera button
 */
function HeaderRight() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleCameraPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/camera");
  };

  return (
    <PlatformPressable
      onPress={handleCameraPress}
      hitSlop={8}
      className="p-2 min-w-[44px] min-h-[44px] justify-center items-center"
    >
      <SymbolView
        name="camera"
        tintColor={isDark ? Colors.dark.text : Colors.light.text}
      />
    </PlatformPressable>
  );
}

/**
 * ReceiptsLayout component - configures the receipts stack navigation
 */
export default function ReceiptsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "Home",
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: "none",
          headerBackTitleStyle: {
            fontFamily: Fonts.sansBold,
          },
          headerTitleStyle: {
            fontFamily: Fonts.sansBold,
          },
          headerLargeTitleStyle: {
            fontFamily: Fonts.sansBold,
          },
        }}
      />
    </Stack>
  );
}
