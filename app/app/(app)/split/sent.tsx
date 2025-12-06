import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
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
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
    >
      <View style={styles.centerContent}>
        <SymbolView
          name="checkmark.circle.fill"
          tintColor={Colors.light.tint}
          size={64}
        />
        <ThemedText size="lg" weight="semibold" style={styles.sentText}>
          Requests Sent!
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  sentText: {
    marginTop: 16,
  },
});
