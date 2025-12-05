/**
 * @author Composer
 * @description Groups tab layout with header right plus button and context menu
 */

import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { View, StyleSheet } from "react-native";
import { ContextMenu, Host, Button } from "@expo/ui/swift-ui";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { getHeaderScreenOptions } from "@/utils/navigation";

/**
 * Header right component with plus button and context menu
 */
function HeaderRight() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleCreateGroup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/(tabs)/(groups)/create");
  };

  const handleJoinGroup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/(tabs)/(groups)/join");
  };

  return (
    <View style={styles.headerRight}>
      <Host>
        <ContextMenu>
          <ContextMenu.Items>
            <Button systemImage="plus.circle.fill" onPress={handleCreateGroup}>
              Create Group
            </Button>
            <Button systemImage="person.2.fill" onPress={handleJoinGroup}>
              Join Group
            </Button>
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <HeaderButton>
              <SymbolView
                name="plus"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </HeaderButton>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    </View>
  );
}

/**
 * Header left component with X close button
 */
function HeaderLeft() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <HeaderButton onPress={handleClose}>
      <SymbolView
        name="xmark"
        tintColor={isDark ? Colors.dark.text : Colors.light.text}
      />
    </HeaderButton>
  );
}

/**
 * GroupsLayout component - configures the groups stack navigation
 */
export default function GroupsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack screenOptions={getHeaderScreenOptions(colorScheme, true)}>
      <Stack.Screen
        name="index"
        options={{
          title: "Groups",
          headerTitle: "Groups",
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: "none",
          headerRight: () => <HeaderRight />,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create Group",
          headerTitle: "Create Group",
          presentation: "modal",
          headerLeft: () => <HeaderLeft />,
        }}
      />
      <Stack.Screen
        name="join"
        options={{
          title: "Join Group",
          headerTitle: "Join Group",
          presentation: "modal",
          headerLeft: () => <HeaderLeft />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Group",
          headerTitle: "Group",
        }}
      />
      <Stack.Screen
        name="[id]/details"
        options={{
          title: "Group",
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
