/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Unified toolbar component with safe area handling
 */

import React from "react";
import { View } from "react-native";

interface ToolbarProps {
  children: React.ReactNode;
  bottom?: number;
}

export function Toolbar({ children, bottom = 0 }: ToolbarProps) {
  return (
    <View
      className="absolute left-0 right-0 z-100 pointer-events-box-none"
      style={{
        bottom: bottom,
      }}
    >
      <View className="flex-row items-center justify-center gap-3 px-5">
        {children}
      </View>
    </View>
  );
}
