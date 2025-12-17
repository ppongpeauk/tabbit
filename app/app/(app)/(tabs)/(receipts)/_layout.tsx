import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SymbolView } from "expo-symbols";
import { Colors, Fonts } from "@/constants/theme";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useLimits } from "@/hooks/use-limits";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useRef } from "react";
import { LimitsModal } from "@/components/limits-modal";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useSync } from "@/hooks/use-sync";

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
    <View style={styles.headerLeft}>
      <ActivityIndicator
        size="small"
        color={isDark ? Colors.dark.tint : Colors.light.tint}
      />
      <ThemedText
        size="sm"
        style={[
          styles.syncText,
          {
            color: isDark ? Colors.dark.tint : Colors.light.tint,
          },
        ]}
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
  const { isPro } = useRevenueCat();
  const limitsModalRef = useRef<BottomSheetModal>(null);

  const handleCameraPress = () => {
    router.push("/camera");
  };

  const handleLimitPress = () => {
    limitsModalRef.current?.present();
  };

  // Don't show limits for Pro users
  if (isPro) {
    return (
      <View>
        <Pressable
          onPress={handleCameraPress}
          hitSlop={8}
          style={styles.headerButton}
        >
          <SymbolView
            name="camera"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </Pressable>
      </View>
    );
  }

  // Show loading state
  if (isLoading || !limitStatus) {
    return (
      <View>
        <View style={styles.limitContainer}>
          <ActivityIndicator
            size="small"
            color={isDark ? Colors.dark.text : Colors.light.text}
          />
        </View>
        <Pressable
          onPress={handleCameraPress}
          hitSlop={8}
          style={styles.headerButton}
        >
          <SymbolView
            name="camera"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </Pressable>
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
      <View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLimitPress}
          hitSlop={8}
          style={[
            styles.limitContainer,
            {
              paddingHorizontal: 16,
              height: 40,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
              backgroundColor: isDark
                ? Colors.dark.background
                : Colors.light.background,
            },
          ]}
        >
          <ThemedText
            size="sm"
            weight="bold"
            family="sans"
            style={styles.limitText}
          >
            {scansRemaining}/{limitStatus.monthlyScansLimit} scans left
          </ThemedText>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginLeft: 16,
  },
  syncText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
  },

  limitContainer: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    marginHorizontal: 10,
  },
  limitText: {},
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
