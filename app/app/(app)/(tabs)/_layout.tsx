import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { Fonts } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      labelStyle={{ fontFamily: Fonts.sans, fontSize: 10, fontWeight: "600" }}
    >
      <NativeTabs.Trigger name="(receipts)">
        <Label>Home</Label>
        <Icon sf="house.fill" />
      </NativeTabs.Trigger>
      {/* <NativeTabs.Trigger name="(groups)">
        <Label>Groups</Label>
        <Icon sf="person.2.fill" />
      </NativeTabs.Trigger> */}
      <NativeTabs.Trigger name="(settings)">
        <Label>Settings</Label>
        <Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>
      {/* <NativeTabs.Trigger name="search" role="search">
        <Label>Search</Label>
        <Icon sf="magnifyingglass" />
      </NativeTabs.Trigger> */}
    </NativeTabs>
  );
}
