import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SymbolView } from "expo-symbols";
import { Fonts } from "@/constants/theme";
import { HeaderButton } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

/**
 * Header right component with camera button
 */
function HeaderRight() {
  const handleCameraPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/camera");
  };

  return (
    <HeaderButton onPress={handleCameraPress}>
      <SymbolView name="camera" />
    </HeaderButton>
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
          title: "Tabbit",
          headerTitle: "Tabbit",
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
