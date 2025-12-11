/**
 * @author Composer
 * @description Groups tab layout with header right plus button and context menu
 */

import { Stack, router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { ContextMenu, Host } from "@expo/ui/swift-ui";
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
            <Pressable
              onPress={handleCreateGroup}
              style={({ pressed }) => [
                styles.contextMenuItem,
                pressed && styles.contextMenuItemPressed,
              ]}
            >
              <SymbolView
                name="plus.circle.fill"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
                size={20}
              />
              <Text
                style={[
                  styles.contextMenuText,
                  { color: isDark ? Colors.dark.text : Colors.light.text },
                ]}
              >
                Create Group
              </Text>
            </Pressable>
            <Pressable
              onPress={handleJoinGroup}
              style={({ pressed }) => [
                styles.contextMenuItem,
                pressed && styles.contextMenuItemPressed,
              ]}
            >
              <SymbolView
                name="person.2.fill"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
                size={20}
              />
              <Text
                style={[
                  styles.contextMenuText,
                  { color: isDark ? Colors.dark.text : Colors.light.text },
                ]}
              >
                Join Group
              </Text>
            </Pressable>
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <Pressable hitSlop={8} style={styles.headerButton}>
              <SymbolView
                name="plus"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
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
    <Pressable onPress={handleClose} hitSlop={8} style={styles.headerButton}>
      <SymbolView
        name="xmark"
        tintColor={isDark ? Colors.dark.text : Colors.light.text}
      />
    </Pressable>
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
  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  contextMenuItemPressed: {
    opacity: 0.7,
  },
  contextMenuText: {
    fontSize: 16,
    fontFamily: "System",
  },
});
