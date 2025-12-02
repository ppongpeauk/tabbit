/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

/**
 * Font families used throughout the app
 * - DMSans: Default font for body text, labels, and most UI elements
 * - LiterataSerif: Used for titles, navigation headers, and significant text
 */
export const Fonts = {
  /** Default sans-serif font for body text and UI elements */
  sans: "DMSans",
  /** Serif font for titles and navigation headers */
  serif: "LiterataSerif",
  /** Mono font for code and monospace text */
  mono: "InconsolataMono",
};
