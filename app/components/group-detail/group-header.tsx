/**
 * @author Composer
 * @description Custom header component for group detail screen
 */

import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { HeaderButton } from "@react-navigation/elements";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Group } from "@/utils/api";

interface GroupHeaderProps {
  group: Group | null;
  iconUrl: string | null;
  colorScheme: "light" | "dark";
  onPress?: () => void;
  onShare?: () => void;
}

export function GroupHeader({
  group,
  iconUrl,
  colorScheme,
  onPress,
  onShare,
}: GroupHeaderProps) {
  const isDark = colorScheme === "dark";
  const memberCount = group?.members?.length || 0;

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare?.();
  };

  const handleAddReceipt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/camera");
  };

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
        <View
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
        </View>
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
    headerRight: () => (
      <View style={styles.headerRight}>
        <HeaderButton onPress={handleShare}>
          <SymbolView
            name="square.and.arrow.up"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </HeaderButton>
        <HeaderButton onPress={handleAddReceipt}>
          <SymbolView
            name="camera"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </HeaderButton>
      </View>
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
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    gap: 0,
    alignItems: "center",
  },
});
