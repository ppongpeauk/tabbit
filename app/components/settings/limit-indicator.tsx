import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

type LimitIndicatorProps = {
  title?: string;
  subtitle?: string;
  progress?: number; // 0-100
  current?: number;
  limit?: number;
};

export function LimitIndicator({
  title = "Monthly Limit",
  subtitle = "You are currently on our free plan.",
  progress = 65,
  current,
  limit,
}: LimitIndicatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors];
  const isDark = colorScheme === "dark";
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;

  const displayText =
    current !== undefined && limit !== undefined
      ? `${current} / ${limit}`
      : `${progress}%`;

  const backgroundStroke = isDark
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(0, 0, 0, 0.2)";
  const progressStroke = colors.tint;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText size="lg" weight="bold" family="sans">
          {title}
        </ThemedText>
        <ThemedText
          size="sm"
          weight="normal"
          family="sans"
          style={styles.subtitle}
        >
          {subtitle}
        </ThemedText>
      </View>

      <View style={styles.progressContainer}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundStroke}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressStroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.progressTextContainer}>
          <ThemedText
            size="sm"
            weight="bold"
            family="sans"
            style={styles.progressText}
          >
            {displayText}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
  },
  subtitle: {
    opacity: 0.7,
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginLeft: 16,
  },
  svg: {
    transform: [{ rotate: "0deg" }],
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
