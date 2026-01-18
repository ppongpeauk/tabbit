import { View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { useEffect } from "react";

interface SplitProgressBarProps {
  currentStage: number;
  totalStages: number;
  stageLabels: string[];
}

export function SplitProgressBar({
  currentStage,
  totalStages,
  stageLabels,
}: SplitProgressBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const progressValue = useSharedValue((currentStage - 1) / (totalStages - 1));

  useEffect(() => {
    progressValue.value = withTiming((currentStage - 1) / (totalStages - 1), {
      duration: 300,
    });
  }, [currentStage, totalStages, progressValue]);

  const progressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
    };
  });

  return (
    <View className="px-6 pt-4 pb-3">
      <View className="flex-row items-center justify-between mb-2">
        {stageLabels.map((label, index) => {
          const stageNumber = index + 1;
          return (
            <StageIndicator
              key={index}
              stageNumber={stageNumber}
              label={label}
              currentStage={currentStage}
              isDark={isDark}
            />
          );
        })}
      </View>
      <View
        className="h-1 rounded-full overflow-hidden"
        style={{
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        }}
      >
        <Animated.View
          className="h-full rounded-full"
          style={[
            progressAnimatedStyle,
            {
              backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
            },
          ]}
        />
      </View>
    </View>
  );
}

interface StageIndicatorProps {
  stageNumber: number;
  label: string;
  currentStage: number;
  isDark: boolean;
}

function StageIndicator({
  stageNumber,
  label,
  currentStage,
  isDark,
}: StageIndicatorProps) {
  const isActive = stageNumber <= currentStage;
  const isCurrent = stageNumber === currentStage;

  const activeProgress = useSharedValue(isActive ? 1 : 0);
  const currentProgress = useSharedValue(isCurrent ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(isActive ? 1 : 0, { duration: 300 });
  }, [isActive, activeProgress]);

  useEffect(() => {
    currentProgress.value = withTiming(isCurrent ? 1 : 0, { duration: 300 });
  }, [isCurrent, currentProgress]);

  const circleBgAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      activeProgress.value,
      [0, 1],
      isDark
        ? ["rgba(255, 255, 255, 0.1)", Colors.dark.tint]
        : ["rgba(0, 0, 0, 0.1)", Colors.light.tint]
    );
    return { backgroundColor };
  });

  const circleTextAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      activeProgress.value,
      [0, 1],
      isDark
        ? ["rgba(255, 255, 255, 0.4)", Colors.dark.background]
        : ["rgba(0, 0, 0, 0.4)", Colors.light.background]
    );
    return { color };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      currentProgress.value,
      [0, 1],
      isDark
        ? ["rgba(255, 255, 255, 0.5)", Colors.dark.text]
        : ["rgba(0, 0, 0, 0.5)", Colors.light.text]
    );
    return { color };
  });

  return (
    <View className="flex-1 items-center">
      <Animated.View
        className="w-8 h-8 rounded-full items-center justify-center"
        style={circleBgAnimatedStyle}
      >
        <Animated.Text
          style={[
            {
              fontSize: 14,
              fontWeight: "600",
              fontFamily: Fonts.sans,
            },
            circleTextAnimatedStyle,
          ]}
        >
          {stageNumber}
        </Animated.Text>
      </Animated.View>
      <Animated.Text
        style={[
          {
            fontSize: 12,
            marginTop: 4,
            textAlign: "center",
            fontFamily: Fonts.sans,
          },
          labelAnimatedStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
}
