/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipts stack layout
 */

import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { Host } from "@expo/ui/swift-ui";
import { GlassView } from "expo-glass-effect";
import { View } from "react-native";
import { ThemedText } from "@/components/themed-text";

export default function ReceiptsLayout() {
  const colorScheme = useColorScheme();

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
            fontFamily: "LiterataSerif",
          },
          headerTitleStyle: {
            fontFamily: "LiterataSerif-SemiBold",
          },
          headerLargeTitleStyle: {
            fontFamily: "LiterataSerif-SemiBold",
          },
          headerRight: () => (
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <View style={{ flexDirection: "row", gap: 4 }}>
                <ThemedText
                  size="sm"
                  weight="bold"
                  family="sans"
                  style={{ marginLeft: 10 }}
                >
                  - / 10 Left
                </ThemedText>
              </View>
              <HeaderButton
                onPress={() => {
                  router.push("/camera");
                }}
              >
                <SymbolView
                  name="camera"
                  tintColor={
                    colorScheme === "dark"
                      ? Colors.dark.text
                      : Colors.light.text
                  }
                />
              </HeaderButton>
            </View>
          ),
        }}
      />
    </Stack>
  );
}
