import { Stack } from "expo-router";

export default function SearchLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Search",
          headerTitle: "Search",
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: "none",
          headerTitleStyle: {
            fontFamily: "LiterataSerif-Bold",
            fontWeight: "700",
          },
          headerLargeTitleStyle: {
            fontFamily: "LiterataSerif-Bold",
            fontWeight: "700",
          },
          headerSearchBarOptions: {
            placement: "automatic",
            placeholder: "Search",
            onChangeText: () => {},
          },
        }}
      />
    </Stack>
  );
}
