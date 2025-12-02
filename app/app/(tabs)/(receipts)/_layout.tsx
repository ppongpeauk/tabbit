/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipts stack layout - configures navigation header for receipts screen
 */

import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";

const HEADER_FONT_FAMILY = "DMSans";
const HEADER_FONT_FAMILY_BOLD = "DMSans-SemiBold";

/**
 * Header right component with limit indicator and camera button
 */
function HeaderRight() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleCameraPress = () => {
    router.push("/camera");
  };

  return (
    <View style={styles.headerRight}>
      <View style={styles.limitContainer}>
        <ThemedText
          size="sm"
          weight="bold"
          family="sans"
          style={styles.limitText}
        >
          - / 10 Left
        </ThemedText>
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
            fontFamily: HEADER_FONT_FAMILY,
          },
          headerTitleStyle: {
            fontFamily: HEADER_FONT_FAMILY_BOLD,
          },
          headerLargeTitleStyle: {
            fontFamily: HEADER_FONT_FAMILY_BOLD,
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
  },
  limitText: {
    marginLeft: 10,
  },
});
