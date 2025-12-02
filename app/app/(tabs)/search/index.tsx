import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { View, Text } from "react-native";

export default function SearchScreen() {
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
      <Text>Search</Text>
    </View>
  );
}
