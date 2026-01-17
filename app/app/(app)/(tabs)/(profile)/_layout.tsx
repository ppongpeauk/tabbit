/**
 * @author Composer
 * @description Profile tab layout with header right settings button
 */

import { Stack, router } from "expo-router";
import { HeaderButton } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHeaderScreenOptions, AppRoutes } from "@/utils/navigation";

/**
 * Header right component with settings button
 */
function HeaderRight() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(AppRoutes.settings);
  };

  return (
    <HeaderButton onPress={handleSettingsPress}>
      <SymbolView name="gearshape" />
    </HeaderButton>
  );
}

/**
 * ProfileLayout component - configures the profile stack navigation
 */
export default function ProfileLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack screenOptions={getHeaderScreenOptions(colorScheme, true)}>
      <Stack.Screen
        name="index"
        options={{
          title: "Profile",
          headerTitle: "Profile",
          headerBlurEffect: "none",
          headerRight: () => <HeaderRight />,
        }}
      />
    </Stack>
  );
}
