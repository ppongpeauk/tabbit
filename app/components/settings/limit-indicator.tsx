/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Limit indicator component showing free plan limits with real-time data
 */

import { StyleSheet, View, ActivityIndicator } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ThemedText } from "../themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useLimits } from "@/hooks/use-limits";

type LimitIndicatorProps = {
  title?: string;
  subtitle?: string;
  progress?: number; // 0-100
  current?: number;
  limit?: number;
};

function LimitCircle({
  remaining,
  limit,
  size = 64,
}: {
  remaining: number;
  limit: number;
  size?: number;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors];
  const isDark = colorScheme === "dark";
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Progress based on remaining: full when remaining = limit, empty when remaining = 0
  const progress = Math.min((remaining / limit) * 100, 100);
  const progressOffset = circumference - (progress / 100) * circumference;

  const backgroundStroke = isDark
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(0, 0, 0, 0.2)";
  const progressStroke = colors.tint;

  return (
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
          {remaining} / {limit}
        </ThemedText>
      </View>
    </View>
  );
}

export function LimitIndicator({
  title = "Free Plan Limits",
  subtitle = "You are currently on our free plan.",
}: LimitIndicatorProps) {
  const { limitStatus, isLoading } = useLimits();

  // Show loading state
  if (isLoading || !limitStatus) {
    return (
      <View style={styles.container}>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
        </View>
      </View>
    );
  }

  // If limits are disabled on the server, show a message instead
  if (limitStatus.limitsDisabled) {
    return (
      <View style={styles.container}>
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
            Limits are currently disabled. You have unlimited access.
          </ThemedText>
        </View>
      </View>
    );
  }

  // Format reset date
  const formatResetDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        return "Resets today";
      } else if (diffDays === 1) {
        return "Resets tomorrow";
      } else {
        return `Resets in ${diffDays} days`;
      }
    } catch {
      return "";
    }
  };

  return (
    <View style={styles.container}>
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

      <View style={styles.limitsRow}>
        <View style={styles.limitItem}>
          <ThemedText
            size="xs"
            weight="semibold"
            family="sans"
            style={styles.limitLabel}
          >
            Monthly Scans
          </ThemedText>
          <LimitCircle
            remaining={limitStatus.monthlyScansRemaining}
            limit={limitStatus.monthlyScansLimit}
          />
          <ThemedText
            size="xs"
            weight="normal"
            family="sans"
            style={styles.resetText}
          >
            {formatResetDate(limitStatus.monthlyScansResetDate)}
          </ThemedText>
        </View>
        <View style={styles.limitItem}>
          <ThemedText
            size="xs"
            weight="semibold"
            family="sans"
            style={styles.limitLabel}
          >
            Total Receipts
          </ThemedText>
          <LimitCircle
            remaining={limitStatus.totalReceiptsRemaining}
            limit={limitStatus.totalReceiptsLimit}
          />
          <ThemedText
            size="xs"
            weight="normal"
            family="sans"
            style={styles.resetText}
          >
            {formatResetDate(limitStatus.receiptsResetDate)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  content: {
    marginBottom: 16,
  },
  subtitle: {
    opacity: 0.7,
  },
  limitsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    gap: 24,
  },
  limitItem: {
    alignItems: "center",
    gap: 8,
  },
  limitLabel: {
    opacity: 0.8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
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
  loadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  resetText: {
    opacity: 0.6,
    marginTop: 4,
    fontSize: 10,
  },
});
