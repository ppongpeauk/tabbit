import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";
import { cssInterop } from "nativewind";

import { useThemeColor } from "@/hooks/use-theme-color";
import { Fonts } from "@/constants/theme";

export type FontWeight = "normal" | "semibold" | "bold";
export type FontFamily = "sans" | "serif" | "mono";
export type FontSize =
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | number;

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  /** Font weight: normal, semibold, or bold */
  weight?: FontWeight;
  /** Whether text should be italic */
  italic?: boolean;
  /** Font family: sans, serif, or mono */
  family?: FontFamily;
  /** Font size: predefined sizes or number */
  size?: FontSize;
  /** Custom line height. If not provided, uses default based on size */
  lineHeight?: number;
  /** Legacy type prop for backward compatibility */
  type?:
  | "default"
  | "title"
  | "defaultSemiBold"
  | "subtitle"
  | "link"
  | "defaultMono"
  | "defaultMonoSemiBold";
};

/**
 * Maps font weight to React Native fontWeight values
 */
function getFontWeight(weight: FontWeight): TextStyle["fontWeight"] {
  switch (weight) {
    case "normal":
      return "400";
    case "semibold":
      return "600";
    case "bold":
      return "700";
    default:
      return "400";
  }
}

/**
 * Maps font family to actual font family names based on loaded fonts.
 * Returns the font family name and whether to use fontWeight/fontStyle props.
 */
function getFontFamily(
  family: FontFamily,
  weight: FontWeight,
  italic: boolean
): { fontFamily: string; useWeightStyle: boolean } {
  const baseFamily = Fonts[family];

  // Handle serif font variants
  if (family === "serif") {
    if (weight === "bold" && !italic) {
      return { fontFamily: "LiterataSerif-Bold", useWeightStyle: false };
    }
    if (italic && weight === "normal") {
      return { fontFamily: "LiterataSerif-Italic", useWeightStyle: false };
    }
    // For bold+italic, use Bold font with italic style (BoldItalic not loaded)
    if (weight === "bold" && italic) {
      return { fontFamily: "LiterataSerif-Bold", useWeightStyle: true };
    }
    // For semibold+italic, use base with weight (no SemiboldItalic loaded)
    if (weight === "semibold") {
      return { fontFamily: "LiterataSerif", useWeightStyle: true };
    }
    return { fontFamily: "LiterataSerif", useWeightStyle: false };
  }

  // Handle mono font variants (no variants loaded, use base with weight/style)
  if (family === "mono") {
    return { fontFamily: baseFamily, useWeightStyle: true };
  }

  // Handle sans font variants
  if (italic) {
    // Use Italic font and apply weight via fontWeight prop
    // (BoldItalic and SemiBoldItalic not loaded)
    return { fontFamily: "DMSans-Italic", useWeightStyle: true };
  }

  if (weight === "bold") {
    return { fontFamily: "DMSans-Bold", useWeightStyle: false };
  }
  if (weight === "semibold") {
    return { fontFamily: "DMSans-SemiBold", useWeightStyle: false };
  }

  return { fontFamily: baseFamily, useWeightStyle: false };
}

/**
 * Maps size prop to fontSize and lineHeight
 */
function getSizeStyles(size: FontSize): {
  fontSize: number;
  lineHeight: number;
} {
  if (typeof size === "number") {
    return {
      fontSize: size,
      lineHeight: size * 1.5,
    };
  }

  switch (size) {
    case "xs":
      return { fontSize: 12, lineHeight: 16 };
    case "sm":
      return { fontSize: 14, lineHeight: 20 };
    case "base":
      return { fontSize: 16, lineHeight: 24 };
    case "lg":
      return { fontSize: 18, lineHeight: 28 };
    case "xl":
      return { fontSize: 20, lineHeight: 28 };
    case "2xl":
      return { fontSize: 24, lineHeight: 32 };
    case "3xl":
      return { fontSize: 32, lineHeight: 40 };
    case "4xl":
      return { fontSize: 36, lineHeight: 44 };
    default:
      return { fontSize: 16, lineHeight: 24 };
  }
}

/**
 * Gets styles from legacy type prop for backward compatibility
 */
function getLegacyTypeStyles(
  type: ThemedTextProps["type"]
): TextStyle | undefined {
  switch (type) {
    case "default":
      return styles.default;
    case "title":
      return styles.title;
    case "defaultSemiBold":
      return styles.defaultSemiBold;
    case "subtitle":
      return styles.subtitle;
    case "link":
      return styles.link;
    case "defaultMono":
      return styles.defaultMono;
    case "defaultMonoSemiBold":
      return styles.defaultMonoSemiBold;
    default:
      return undefined;
  }
}

export function ThemedText({
  style,
  lightColor,
  darkColor,
  weight,
  italic = false,
  family = "sans",
  size = "base",
  lineHeight,
  type,
  children,
  ...props
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  // If legacy type prop is used, use legacy styles
  if (type) {
    const legacyStyles = getLegacyTypeStyles(type);
    return (
      <Text style={[{ color }, legacyStyles, style]} {...props}>
        {children}
      </Text>
    );
  }

  // Build styles from props
  const sizeStyles = getSizeStyles(size);
  const { fontFamily, useWeightStyle } = getFontFamily(
    family,
    weight || "normal",
    italic
  );
  const fontWeight =
    useWeightStyle && weight ? getFontWeight(weight) : undefined;
  const fontStyle = useWeightStyle && italic ? "italic" : undefined;

  return (
    <Text
      style={[
        {
          color,
          fontSize: sizeStyles.fontSize,
          lineHeight: lineHeight ?? sizeStyles.lineHeight,
          fontFamily,
          ...(fontWeight && { fontWeight }),
          ...(fontStyle && { fontStyle }),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

cssInterop(ThemedText, { className: "style" });

// Legacy styles for backward compatibility
const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.sans,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    fontFamily: Fonts.sans,
  },
  defaultMono: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.mono,
  },
  defaultMonoSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "800",
    fontFamily: Fonts.mono,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 32,
    fontFamily: "LiterataSerif-Bold",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "LiterataSerif-Bold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
    fontFamily: Fonts.sans,
  },
});
