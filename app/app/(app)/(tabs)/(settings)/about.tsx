import { ThemedText } from "@/components/themed-text";
import { ScrollView, View, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function AboutScreen() {
  const colorScheme = useColorScheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          colorScheme === "dark"
            ? Colors.dark.background
            : Colors.light.background,
      }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <ThemedText size="3xl" family="serif" style={styles.title}>
            Tabbit
          </ThemedText>
          <ThemedText
            size="sm"
            weight="normal"
            family="mono"
            style={styles.version}
          >
            Version 1.0.0
          </ThemedText>
        </View>
        <View style={styles.section}>
          <ThemedText size="base" family="sans" style={styles.description}>
            Tabbit is a receipt management app that helps you organize and track
            your receipts effortlessly.
          </ThemedText>
        </View>
        <View style={styles.section}>
          <ThemedText
            size="sm"
            weight="normal"
            family="sans"
            style={styles.copyright}
          >
            Copyright © 2025 Tabbit. All rights reserved.
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
    alignContent: "center",
    justifyContent: "center",
  },
  section: {
    gap: 0,
  },
  title: {
    textAlign: "center",
  },
  version: {
    textAlign: "center",
    opacity: 0.7,
  },
  description: {
    textAlign: "center",
  },
  copyright: {
    marginTop: 4,
    textAlign: "center",
    opacity: 0.6,
  },
});
