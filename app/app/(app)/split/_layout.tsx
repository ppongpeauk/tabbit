import { Stack, router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHeaderScreenOptions } from "@/utils/navigation";
import { SymbolView } from "expo-symbols";
import { HeaderButton } from "@react-navigation/elements";

export default function SplitLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        ...getHeaderScreenOptions(colorScheme),
        presentation: "formSheet",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Split Receipt",
          presentation: "card",
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView name="xmark" />
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
              <SymbolView name="xmark" />
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
              <SymbolView name="xmark" />
            </HeaderButton>
          ),
        }}
      />
      <Stack.Screen
        name="percentage-inputs"
        options={{
          title: "Percentage Split",
          presentation: "card",
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView name="xmark" />
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
              <SymbolView name="xmark" />
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
              <SymbolView name="xmark" />
            </HeaderButton>
          ),
        }}
      />
    </Stack>
  );
}
