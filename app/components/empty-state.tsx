import { View, type ViewStyle } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: SymbolViewProps["name"] | ReactNode;
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
    <View className="flex-1 justify-center items-center py-10 px-5" style={style}>
      {icon && (
        <View className="mb-4">
          {typeof icon === "string" ? (
            <SymbolView
              name={icon as SymbolViewProps["name"]}
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
              size={48}
            />
          ) : (
            icon
          )}
        </View>
      )}
      <ThemedText size="lg" weight="semibold" className="text-center mb-0">
        {title}
      </ThemedText>
      {subtitle && (
        <ThemedText
          size="base"
          className="text-center opacity-70"
          style={{
            color: isDark ? Colors.dark.icon : Colors.light.icon,
          }}
        >
          {subtitle}
        </ThemedText>
      )}
      {action && <View className="mt-6 w-full max-w-[300px]">{action}</View>}
    </View>
  );
}

