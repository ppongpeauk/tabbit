import { View, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function SendingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
        <ActivityIndicator
          size="large"
          color={isDark ? Colors.dark.text : Colors.light.text}
        />
        <ThemedText size="lg" weight="semibold" className="mt-4">
          Sending Requests...
        </ThemedText>
      </View>
    </View>
  );
}

