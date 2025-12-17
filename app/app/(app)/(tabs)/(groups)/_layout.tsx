/**
 * @author Composer
 * @description Groups tab layout with header right plus button and context menu
 */

import { Stack, router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { View, StyleSheet, Pressable } from "react-native";
import ContextMenu from "react-native-context-menu-view";
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

  const menuActions = [
    {
      title: "Create Group",
      systemIcon: "plus.circle.fill",
    },
    {
      title: "Join Group",
      systemIcon: "person.2.fill",
    },
  ];

  const handleMenuPress = (event: {
    nativeEvent: { index: number; name: string };
  }) => {
    const { index } = event.nativeEvent;
    if (index === 0) {
      handleCreateGroup();
    } else if (index === 1) {
      handleJoinGroup();
    }
  };

  return (
    <View style={styles.headerRight}>
      <ContextMenu
        actions={menuActions}
        onPress={handleMenuPress}
        dropdownMenuMode={true}
      >
        <Pressable hitSlop={8} style={styles.headerButton}>
          <SymbolView
            name="plus"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </Pressable>
      </ContextMenu>
    </View>
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
        }}
      />
      <Stack.Screen
        name="join"
        options={{
          title: "Join Group",
          headerTitle: "Join Group",
          presentation: "modal",
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
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: "Edit Group",
          presentation: "formSheet",
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
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
