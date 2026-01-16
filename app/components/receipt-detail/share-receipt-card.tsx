import { View, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";

interface ShareReceiptCardProps {
  onShare: () => void;
}

export function ShareReceiptCard({ onShare }: ShareReceiptCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare();
  };

  const iconColor = isDark ? Colors.dark.tint : Colors.light.tint;
  const subtleColor = isDark ? Colors.dark.subtle : Colors.light.icon;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleShare}
      className={`rounded-[20px] p-4 gap-1 border ${
        isDark ? "bg-[#1A1D1E] border-white/5" : "bg-white border-black/5"
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.05)",
          }}
        >
          <SymbolView
            name="square.and.arrow.up"
            tintColor={iconColor}
            style={{ width: 24, height: 24 }}
          />
        </View>
        <View className="flex-1">
          <ThemedText size="base" weight="semibold">
            Share Receipt
          </ThemedText>
          <ThemedText
            size="sm"
            style={{
              color: subtleColor,
            }}
          >
            Tap to share this receipt with others
          </ThemedText>
        </View>
        <SymbolView
          name="chevron.right"
          tintColor={subtleColor}
          style={{ width: 16, height: 16 }}
        />
      </View>
    </TouchableOpacity>
  );
}
