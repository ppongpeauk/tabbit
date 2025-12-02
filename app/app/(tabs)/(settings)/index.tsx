/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Settings screen
 */

import { LimitIndicator } from "@/components/settings/limit-indicator";
import { ThemedText } from "@/components/themed-text";
import { ScrollView, View, Pressable, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
  const colorScheme = useColorScheme();

  const handleAboutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("./about");
  };

  const handleFriendsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("./friends");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          colorScheme === "dark"
            ? Colors.dark.background
            : Colors.light.background,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 20,
          gap: 16,
          flex: 1,
        }}
      >
        <LimitIndicator />

        {/* Friends section */}
        <Pressable
          onPress={handleFriendsPress}
          style={({ pressed }) => [
            styles.settingItem,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? pressed
                    ? Colors.dark.background
                    : "rgba(255, 255, 255, 0.05)"
                  : pressed
                  ? Colors.light.background
                  : "rgba(0, 0, 0, 0.02)",
            },
          ]}
        >
          <ThemedText style={styles.settingLabel}>Friends</ThemedText>
          <SymbolView
            name="chevron.right"
            tintColor={
              colorScheme === "dark" ? Colors.dark.icon : Colors.light.icon
            }
          />
        </Pressable>

        {/* About section */}
        <Pressable
          onPress={handleAboutPress}
          style={({ pressed }) => [
            styles.settingItem,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? pressed
                    ? Colors.dark.background
                    : "rgba(255, 255, 255, 0.05)"
                  : pressed
                  ? Colors.light.background
                  : "rgba(0, 0, 0, 0.02)",
            },
          ]}
        >
          <ThemedText style={styles.settingLabel}>About</ThemedText>
          <SymbolView
            name="chevron.right"
            tintColor={
              colorScheme === "dark" ? Colors.dark.icon : Colors.light.icon
            }
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  settingLabel: {
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
});
