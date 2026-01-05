import { ThemedText } from "@/components/themed-text";
import { ScrollView, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function AboutScreen() {
  const colorScheme = useColorScheme();

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor:
          colorScheme === "dark"
            ? Colors.dark.background
            : Colors.light.background,
      }}
    >
      <ScrollView contentContainerClassName="flex-1 px-5 gap-4 justify-center">
        <View className="gap-0">
          <ThemedText size="3xl" family="serif" className="text-center">
            Tabbit
          </ThemedText>
          <ThemedText
            size="sm"
            weight="normal"
            family="mono"
            className="text-center opacity-70"
          >
            Version 1.0.0
          </ThemedText>
        </View>
        <View className="gap-0">
          <ThemedText size="base" family="sans" className="text-center">
            Tabbit is a receipt management app that helps you organize and track
            your receipts effortlessly.
          </ThemedText>
        </View>
        <View className="gap-0">
          <ThemedText
            size="sm"
            weight="normal"
            family="sans"
            className="mt-1 text-center opacity-60"
          >
            Copyright © 2025 Tabbit. All rights reserved.
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}
