/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Component to display expense distribution examples with rabbit icons
 */

import { View, StyleSheet, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

interface PersonExpenseProps {
  amount: string;
}

function PersonExpense({ amount }: PersonExpenseProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View style={styles.personContainer}>
      <Image
        source={require("@/assets/images/symbols/rabbit-silhouette.png")}
        style={[
          styles.rabbitIcon,
          {
            tintColor: isDark ? "#FFFFFF" : "#000000",
          },
        ]}
        resizeMode="contain"
      />
      <ThemedText
        size="base"
        weight="semibold"
        style={[
          styles.amountText,
          {
            color: isDark ? Colors.dark.text : Colors.light.text,
          },
        ]}
      >
        {amount}
      </ThemedText>
    </View>
  );
}

interface ExpenseDistributionExampleProps {
  amounts: string[];
}

export function ExpenseDistributionExample({
  amounts,
}: ExpenseDistributionExampleProps) {
  return (
    <View style={styles.container}>
      {amounts.map((amount, index) => (
        <PersonExpense key={index} amount={amount} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 20,
    marginTop: 4,
    paddingVertical: 8,
  },
  personContainer: {
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  rabbitIcon: {
    width: 48,
    height: 48,
  },
  amountText: {
    textAlign: "center",
  },
});
