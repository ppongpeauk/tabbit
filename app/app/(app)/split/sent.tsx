import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";

export default function SentScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    const timer = setTimeout(() => {
      router.back();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      }}
    >
      <View className="flex-1 justify-center items-center gap-4">
        <SymbolView
          name="checkmark.circle.fill"
          tintColor={Colors.light.tint}
          size={64}
        />
        <ThemedText size="lg" weight="semibold" className="mt-4">
          Requests Sent!
        </ThemedText>
      </View>
    </View>
  );
}
