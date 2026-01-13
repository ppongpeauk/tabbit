import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SymbolView } from "expo-symbols";
import { Colors, Fonts } from "@/constants/theme";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useSync } from "@/hooks/use-sync";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

/**
 * Header left component with sync status indicator
 */
function HeaderLeft() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { status, enabled } = useSync();

  if (!enabled || !status.isSyncing) {
    return null;
  }

  return (
    <View className="flex-row gap-1.5 items-center ml-4">
      <ActivityIndicator
        size="small"
        color={isDark ? Colors.dark.tint : Colors.light.tint}
      />
      <ThemedText
        size="sm"
        className="text-[13px]"
        style={{
          fontFamily: Fonts.sans,
          color: isDark ? Colors.dark.tint : Colors.light.tint,
        }}
      >
        Syncing...
      </ThemedText>
    </View>
  );
}

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
  const { status, enabled } = useSync();
  const shouldShowSyncIndicator = enabled && status.isSyncing;

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
