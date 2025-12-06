import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useLimits } from "@/hooks/use-limits";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { Fonts } from "@/constants/theme";
import { useRef } from "react";
import { LimitsModal } from "@/components/limits-modal";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

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
      <View style={styles.headerRight}>
        <HeaderButton onPress={handleCameraPress}>
          <SymbolView
            name="camera"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </HeaderButton>
      </View>
    );
  }

  // Show loading state
  if (isLoading || !limitStatus) {
    return (
      <View style={styles.headerRight}>
        <View style={styles.limitContainer}>
          <ActivityIndicator
            size="small"
            color={isDark ? Colors.dark.text : Colors.light.text}
          />
        </View>
        <HeaderButton onPress={handleCameraPress}>
          <SymbolView
            name="camera"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </HeaderButton>
      </View>
    );
  }

  // Show limit status
  const scansRemaining = limitStatus.monthlyScansRemaining;
  const receiptsRemaining = limitStatus.totalReceiptsRemaining;

  return (
    <>
      <View style={styles.headerRight}>
        <Pressable onPress={handleLimitPress} style={styles.limitContainer}>
          <SymbolView
            name="doc.text.fill"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
            size={16}
          />
          <ThemedText
            size="sm"
            weight="bold"
            family="sans"
            style={[
              styles.limitText,
              scansRemaining === 0 && styles.limitTextWarning,
            ]}
          >
            {scansRemaining} / {limitStatus.monthlyScansLimit}
          </ThemedText>
        </Pressable>
      </View>
      <LimitsModal bottomSheetRef={limitsModalRef} />
    </>
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
          headerRight: () => <HeaderRight />,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  limitContainer: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    marginHorizontal: 10,
  },
  limitText: {},
  limitTextWarning: {
    opacity: 0.6,
  },
});
