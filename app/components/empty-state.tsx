import { View, StyleSheet, type ViewStyle } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  style,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={styles.iconContainer}>
          {typeof icon === "string" ? (
            <SymbolView
              name={icon}
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
              size={48}
            />
          ) : (
            icon
          )}
        </View>
      )}
      <ThemedText size="lg" weight="semibold" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle && (
        <ThemedText
          size="base"
          style={[
            styles.subtitle,
            {
              color: isDark ? Colors.dark.icon : Colors.light.icon,
            },
          ]}
        >
          {subtitle}
        </ThemedText>
      )}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
  actionContainer: {
    marginTop: 24,
    width: "100%",
    maxWidth: 300,
  },
});

