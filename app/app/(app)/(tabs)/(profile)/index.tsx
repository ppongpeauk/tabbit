/**
 * @author Composer
 * @description Profile screen showing basic user info
 */

import { View } from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

const DEFAULT_NAME = "Your Name";
const DEFAULT_USERNAME = "username";

function getUsername(email?: string): string {
  if (!email) {
    return DEFAULT_USERNAME;
  }
  const [localPart] = email.split("@");
  return localPart || DEFAULT_USERNAME;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const displayName = user?.name || DEFAULT_NAME;
  const username = getUsername(user?.email);

  return (
    <ThemedView className="flex-1">
      <View className="items-center px-6 pt-24">
        <View
          className="w-28 h-28 rounded-full items-center justify-center mb-4"
          style={{
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
          }}
        >
          <SymbolView
            name="person.crop.circle.fill"
            size={92}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        </View>
        <ThemedText size="xl" weight="bold" className="mb-1">
          {displayName}
        </ThemedText>
        <ThemedText size="base" className="opacity-60">
          @{username}
        </ThemedText>
      </View>
    </ThemedView>
  );
}
