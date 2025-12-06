import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHeaderScreenOptions } from "@/utils/navigation";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { router } from "expo-router";

export default function SplitLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        ...getHeaderScreenOptions(colorScheme),
        presentation: "formSheet",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Split Receipt",
          presentation: "card",
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </HeaderButton>
          ),
        }}
      />
      <Stack.Screen
        name="add-people"
        options={{
          title: "Add People",
          presentation: "card",
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </HeaderButton>
          ),
        }}
      />
      <Stack.Screen
        name="custom-inputs"
        options={{
          title: "Custom Amounts",
          presentation: "card",
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </HeaderButton>
          ),
        }}
      />
      <Stack.Screen
        name="itemized-assign"
        options={{
          title: "Assign Items",
          presentation: "card",
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </HeaderButton>
          ),
        }}
      />
      <Stack.Screen
        name="review"
        options={{
          title: "Review Split",
          presentation: "card",
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </HeaderButton>
          ),
        }}
      />
      <Stack.Screen
        name="sending"
        options={{
          title: "Sending",
          presentation: "card",
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="sent"
        options={{
          title: "Sent",
          presentation: "card",
          headerLeft: () => null,
        }}
      />
    </Stack>
  );
}
