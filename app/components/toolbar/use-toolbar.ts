/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Hook to manage toolbar visibility based on screen focus
 */

import { useIsFocused } from "@react-navigation/native";

export function useToolbar() {
  const isFocused = useIsFocused();

  return {
    isFocused,
  };
}
