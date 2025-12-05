/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Camera permission prompt component for camera screens
 */

import { View, StyleSheet } from "react-native";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import { Colors } from "@/constants/theme";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import { Button } from "../button";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface CameraPermissionPromptProps {
  /** Title text for the permission prompt */
  title?: string;
  /** Description text explaining why camera access is needed */
  description: string;
  /** Icon name to display (default: "camera.fill") */
  iconName?: string;
  /** Callback when user presses the allow button */
  onRequestPermission: () => void;
}

export function CameraPermissionPrompt({
  title = "Camera Permission Required",
  description,
  iconName = "camera.fill",
  onRequestPermission,
}: CameraPermissionPromptProps) {
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
            },
          ]}
        >
          <SymbolView
            name={iconName as SymbolViewProps["name"]}
            size={64}
            tintColor={Colors[colorScheme as keyof typeof Colors].tint}
          />
        </View>
        <ThemedText size="xl" weight="bold" family="sans" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText
          size="base"
          weight="normal"
          family="sans"
          style={styles.description}
        >
          {description}
        </ThemedText>
        <Button
          variant="primary"
          size="base"
          onPress={onRequestPermission}
          style={styles.button}
          leftIcon={<SymbolView name="camera.fill" size={20} />}
        >
          Allow Camera Access
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 24,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    marginBottom: 32,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 22,
  },
  button: {
    width: "100%",
  },
});
