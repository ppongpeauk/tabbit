/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Tabs layout with native tabs navigation
 */

import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { Fonts } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      labelStyle={{ fontFamily: Fonts.serif, fontSize: 10 }}
    >
      <NativeTabs.Trigger name="(receipts)">
        <Label>Home</Label>
        <Icon sf="house" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(friends)">
        <Label>Split</Label>
        <Icon sf="dollarsign.circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Label>Settings</Label>
        <Icon sf="gearshape" />
      </NativeTabs.Trigger>
      {/* <NativeTabs.Trigger name="search" role="search">
        <Label>Search</Label>
        <Icon sf="magnifyingglass" />
      </NativeTabs.Trigger> */}
    </NativeTabs>
  );
}
