/**
 * @author Composer
 * @description Custom header component for group detail screen
 */

import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import type { Group } from "@/utils/api";
import { GlassView } from "expo-glass-effect";

interface GroupHeaderProps {
  group: Group | null;
  iconUrl: string | null;
  colorScheme: "light" | "dark";
  onPress?: () => void;
}

export function GroupHeader({
  group,
  iconUrl,
  colorScheme,
  onPress,
}: GroupHeaderProps) {
  const isDark = colorScheme === "dark";

  const headerContent = (
    <View style={styles.container}>
      {/* <View style={styles.textContainer}>
        <ThemedText size="base" weight="bold" family="sans" numberOfLines={1}>
          {group?.name || "Group"}
        </ThemedText>
        <ThemedText
          size="xs"
          family="sans"
          style={[
            styles.subtitle,
            {
              color: isDark ? Colors.dark.icon : Colors.light.icon,
            },
          ]}
        >
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </ThemedText>
      </View> */}
      {iconUrl ? (
        <Image source={{ uri: iconUrl }} style={styles.icon} />
      ) : (
        <GlassView
          glassEffectStyle="regular"
          style={[
            styles.iconPlaceholder,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.05)",
            },
          ]}
        >
          <ThemedText size="base">👥</ThemedText>
        </GlassView>
      )}
      <SymbolView
        name="chevron.down"
        tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
        size={14}
      />
    </View>
  );

  return {
    headerTitle: () =>
      onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {headerContent}
        </TouchableOpacity>
      ) : (
        headerContent
      ),
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  iconPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 2,
    opacity: 0.7,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
  },
  settledLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  settledText: {
    marginTop: 1,
  },
});
