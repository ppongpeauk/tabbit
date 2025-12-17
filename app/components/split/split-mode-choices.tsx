/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Reusable component for displaying split mode selection choices
 */

import { View, StyleSheet } from "react-native";
import { RadioButton } from "@/components/ui/radio-button";
import { SplitStrategy } from "@/utils/split";
import { SPLIT_MODE_OPTIONS } from "@/utils/split-constants";
import { ExpenseDistributionExample } from "./expense-distribution-example";

export interface SplitModeChoicesProps {
  selectedStrategy: SplitStrategy | null;
  onSelect: (strategy: SplitStrategy) => void;
  getExampleAmounts?: (strategy: SplitStrategy) => string[];
}

export function SplitModeChoices({
  selectedStrategy,
  onSelect,
  getExampleAmounts,
}: SplitModeChoicesProps) {
  return (
    <View style={styles.container}>
      {SPLIT_MODE_OPTIONS.map((option) => (
        <RadioButton
          key={option.value}
          value={option.value}
          label={option.label}
          icon={option.icon}
          description={option.description}
          example={
            getExampleAmounts ? (
              <ExpenseDistributionExample
                amounts={getExampleAmounts(option.value)}
              />
            ) : undefined
          }
          isSelected={selectedStrategy === option.value}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});
