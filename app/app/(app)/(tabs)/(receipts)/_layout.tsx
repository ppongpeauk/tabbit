import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SymbolView } from "expo-symbols";
import { Colors, Fonts } from "@/constants/theme";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useLimits } from "@/hooks/use-limits";
import { useRef } from "react";
import { LimitsModal } from "@/components/limits-modal";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
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
 * Header right component with limit indicator and camera button
 */
function HeaderRight() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { limitStatus, isLoading } = useLimits();
  const limitsModalRef = useRef<TrueSheet>(null);

  const handleCameraPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/camera");
  };

  const handleLimitPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    limitsModalRef.current?.present();
  };

  // Show loading state
  if (isLoading || !limitStatus) {
    return (
      <View className="flex-row items-center">
        <View className="flex-row gap-1 items-center mx-2.5">
          <ActivityIndicator
            size="small"
            color={isDark ? Colors.dark.text : Colors.light.text}
          />
        </View>
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
      </View>
    );
  }

  // Show limit status
  const scansRemaining = limitStatus.monthlyScansRemaining;
  const limitsDisabled = limitStatus.limitsDisabled;

  // If limits are disabled, don't show the limit indicator
  // if (limitsDisabled) {
  //   return (
  //     <>
  //       <LimitsModal bottomSheetRef={limitsModalRef} />
  //     </>
  //   );
  // }

  return (
    <>
      <View className="flex-row items-center">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLimitPress}
          hitSlop={8}
          className="flex-row gap-1 items-center mx-2.5 px-4 h-10 rounded-full border"
          style={{
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          }}
        >
          <ThemedText
            size="sm"
            weight="bold"
            family="sans"
          >
            {scansRemaining}/{limitStatus.monthlyScansLimit} scans left
          </ThemedText>
        </TouchableOpacity>
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
      </View>
      <LimitsModal bottomSheetRef={limitsModalRef} />
    </>
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
          headerRight: () => <HeaderRight />,
        }}
      />
    </Stack>
  );
}
