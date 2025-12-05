/**
 * @author Composer
 * @description Swipeable horizontal tab bar component with animated indicator
 */

import { useState, useCallback, useRef, forwardRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  type ViewStyle,
  type ScrollViewProps,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import type React from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TabLabelProps {
  tab: string;
  index: number;
  isActive: boolean;
  isDark: boolean;
  translateX: SharedValue<number>;
  onPress: () => void;
}

const TabLabel = ({
  tab,
  index,
  isActive,
  isDark,
  translateX,
  onPress,
}: TabLabelProps) => {
  const opacityStyle = useAnimatedStyle(() => {
    const tabPosition = index * SCREEN_WIDTH;
    const scrollOffset = translateX.value;

    const opacity = interpolate(
      scrollOffset,
      [tabPosition - SCREEN_WIDTH, tabPosition, tabPosition + SCREEN_WIDTH],
      [0.75, 1, 0.75],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={opacityStyle}>
        <ThemedText
          style={[
            styles.tabLabel,
            {
              color: isActive
                ? isDark
                  ? Colors.dark.tint
                  : Colors.light.tint
                : isDark
                ? Colors.dark.icon
                : Colors.light.icon,
            },
          ]}
          size="base"
          weight="semibold"
        >
          {tab}
        </ThemedText>
      </Animated.View>
    </TouchableOpacity>
  );
};

export interface SwipeableTabViewProps {
  /** Array of tab labels */
  tabs: string[];
  /** Function to render content for each tab */
  renderTabContent: (index: number) => React.ReactNode;
  /** Initial active tab index */
  initialTab?: number;
  /** Callback when tab changes */
  onTabChange?: (index: number) => void;
  /** Custom style for the container */
  style?: ViewStyle | ViewStyle[];
  /** Custom style for the tab bar */
  tabBarStyle?: ViewStyle | ViewStyle[];
  /** Custom style for the scroll container */
  scrollContainerStyle?: ViewStyle | ViewStyle[];
  /** Additional props to pass to the ScrollView */
  scrollViewProps?: Omit<
    ScrollViewProps,
    "horizontal" | "pagingEnabled" | "ref"
  >;
}

export const SwipeableTabView = forwardRef<View, SwipeableTabViewProps>(
  (
    {
      tabs,
      renderTabContent,
      initialTab = 0,
      onTabChange,
      style,
      tabBarStyle,
      scrollContainerStyle,
      scrollViewProps,
    },
    ref
  ) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const [activeTab, setActiveTab] = useState(initialTab);
    const scrollViewRef =
      useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);
    const translateX = useSharedValue(initialTab * SCREEN_WIDTH);
    const tabCount = tabs.length;

    const handleTabPress = useCallback(
      (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(index);
        scrollViewRef.current?.scrollTo({
          x: index * SCREEN_WIDTH,
          animated: true,
        });
        onTabChange?.(index);
      },
      [onTabChange]
    );

    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        translateX.value = event.contentOffset.x;
      },
    });

    useEffect(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: initialTab * SCREEN_WIDTH,
          animated: false,
        });
      }
    }, [initialTab]);

    const handleMomentumScrollEnd = useCallback(
      (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const newTab = Math.round(offsetX / SCREEN_WIDTH);
        if (newTab !== activeTab && newTab >= 0 && newTab < tabCount) {
          setActiveTab(newTab);
          onTabChange?.(newTab);
        }
      },
      [activeTab, tabCount, onTabChange]
    );

    const tabIndicatorStyle = useAnimatedStyle(() => {
      const tabWidth = SCREEN_WIDTH / tabCount;
      return {
        width: tabWidth,
        transform: [
          {
            translateX: interpolate(
              translateX.value,
              [0, SCREEN_WIDTH * (tabCount - 1)],
              [0, tabWidth * (tabCount - 1)],
              Extrapolation.CLAMP
            ),
          },
        ],
      };
    });

    return (
      <View ref={ref} style={[styles.container, style]}>
        {/* Tab Bar */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: isDark
                ? Colors.dark.background
                : Colors.light.background,
              borderBottomColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            },
            tabBarStyle,
          ]}
        >
          {tabs.map((tab, index) => (
            <TabLabel
              key={tab}
              tab={tab}
              index={index}
              isActive={activeTab === index}
              isDark={isDark}
              translateX={translateX}
              onPress={() => handleTabPress(index)}
            />
          ))}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
              },
              tabIndicatorStyle,
            ]}
          />
        </View>

        {/* Swipeable Content */}
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
          style={[styles.scrollContainer, scrollContainerStyle]}
          {...scrollViewProps}
        >
          {tabs.map((_, index) => (
            <View key={index} style={styles.screen}>
              {renderTabContent(index)}
            </View>
          ))}
        </Animated.ScrollView>
      </View>
    );
  }
);

SwipeableTabView.displayName = "SwipeableTabView";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    position: "relative",
    zIndex: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 16,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
  },
  scrollContainer: {
    flex: 1,
  },
  screen: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
