import { Stack, router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHeaderScreenOptions } from "@/utils/navigation";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { Pressable } from "react-native";

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
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="p-2 min-w-[44px] min-h-[44px] justify-center items-center"
            >
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="add-people"
        options={{
          title: "Add People",
          presentation: "card",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="p-2 min-w-[44px] min-h-[44px] justify-center items-center"
            >
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="custom-inputs"
        options={{
          title: "Custom Amounts",
          presentation: "card",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="p-2 min-w-[44px] min-h-[44px] justify-center items-center"
            >
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="percentage-inputs"
        options={{
          title: "Percentage Split",
          presentation: "card",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="p-2 min-w-[44px] min-h-[44px] justify-center items-center"
            >
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="itemized-assign"
        options={{
          title: "Assign Items",
          presentation: "card",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="p-2 min-w-[44px] min-h-[44px] justify-center items-center"
            >
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="review"
        options={{
          title: "Review Split",
          presentation: "card",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="p-2 min-w-[44px] min-h-[44px] justify-center items-center"
            >
              <SymbolView
                name="xmark"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="sending"
        options={{
          title: "Sending",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="sent"
        options={{
          title: "Sent",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
