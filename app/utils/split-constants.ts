/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Constants for split mode options
 */

import { SplitStrategy } from "./split";

export interface SplitModeOption {
  value: SplitStrategy;
  label: string;
  icon: string;
  description: string;
}

export const SPLIT_MODE_OPTIONS: SplitModeOption[] = [
  {
    value: SplitStrategy.EQUAL,
    label: "Even",
    icon: "equal.circle",
    description:
      "Split the total amount equally among all selected people. Perfect for shared meals or group expenses.",
  },
  {
    value: SplitStrategy.ITEMIZED,
    label: "Itemized",
    icon: "list.bullet",
    description:
      "Assign specific items from the receipt to each person. Great when people ordered different things.",
  },
  {
    value: SplitStrategy.PERCENTAGE,
    label: "Percentage",
    icon: "percent",
    description:
      "Split by percentage of the total. Each person pays a specific percentage of the bill.",
  },
  {
    value: SplitStrategy.CUSTOM,
    label: "Custom",
    icon: "slider.horizontal.3",
    description:
      "Manually set custom amounts for each person. Use this for complex splits or specific arrangements.",
  },
];

export const getSplitModeLabel = (mode: SplitStrategy): string => {
  const option = SPLIT_MODE_OPTIONS.find((opt) => opt.value === mode);
  return option?.label || "Even";
};
