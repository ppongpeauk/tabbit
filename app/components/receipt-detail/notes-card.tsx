/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Card component to display user notes on receipt details
 */

import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import type { StoredReceipt } from "@/utils/storage";

interface NotesCardProps {
  receipt: StoredReceipt;
}

export function NotesCard({ receipt }: NotesCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const notes = receipt.appData?.userNotes?.trim();

  if (!notes) {
    return null;
  }

  return (
    <View
      className="rounded-[20px] p-6 border"
      style={{
        backgroundColor: isDark ? Colors.dark.surface : "#FFFFFF",
        borderColor: isDark
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
      }}
    >
      <ThemedText size="xl" weight="bold" style={styles.title}>
        Notes
      </ThemedText>
      <ThemedText
        size="base"
        style={[
          styles.notesText,
          {
            color: isDark ? Colors.dark.text : Colors.light.text,
          },
        ]}
      >
        {notes}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  notesText: {
    lineHeight: 22,
  },
});









