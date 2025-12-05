/**
 * @author Composer
 * @description Navigation utilities for shared header styling and screen options
 */

import { StackNavigationOptions } from "@react-navigation/stack";
import { Colors, Fonts } from "@/constants/theme";

/**
 * Creates common header screen options with consistent styling
 * @param colorScheme - Current color scheme ("light" | "dark" | null | undefined)
 * @param includeLargeTitle - Whether to include large title style (default: false)
 * @returns StackNavigationOptions with common header styling
 */
export function getHeaderScreenOptions(
  colorScheme: "light" | "dark" | null | undefined,
  includeLargeTitle = false
): Partial<StackNavigationOptions> {
  const baseOptions: Partial<StackNavigationOptions> = {
    headerBackTitleStyle: {
      fontFamily: Fonts.sansBold,
    },
    headerTitleStyle: {
      fontFamily: Fonts.sansBold,
    },
    headerStyle: {
      backgroundColor:
        colorScheme === "dark"
          ? Colors.dark.background
          : Colors.light.background,
    },
  };

  if (includeLargeTitle) {
    baseOptions.headerLargeTitleStyle = {
      fontFamily: Fonts.sansBold,
    };
  }

  return baseOptions;
}
