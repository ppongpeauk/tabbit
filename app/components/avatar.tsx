import { View, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Friend as ApiFriend } from "@/utils/api";
import type { Friend as StorageFriend } from "@/utils/storage";
import { useAuth } from "@/contexts/auth-context";

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
}

export function Avatar({ name, imageUrl, size = 40 }: AvatarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const initial = name.charAt(0).toUpperCase();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.05)",
        }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      className="rounded-full items-center justify-center"
      style={{
        width: size,
        height: size,
        backgroundColor: isDark
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
      }}
    >
      <ThemedText
        size={size <= 32 ? "sm" : size <= 40 ? "base" : "lg"}
        weight="semibold"
      >
        {initial}
      </ThemedText>
    </View>
  );
}

interface PersonAvatarProps {
  personId: string;
  name: string;
  friends: StorageFriend[];
  size?: number;
}

export function PersonAvatar({
  personId,
  name,
  friends,
  size = 40,
}: PersonAvatarProps) {
  const { user } = useAuth();

  // Check if this is the current user
  let imageUrl: string | null = null;
  if (user && personId === user.id) {
    imageUrl = user.image || null;
  } else {
    // StorageFriend uses 'id' instead of 'friendId'
    const friend = friends.find((f) => f.id === personId);
    // StorageFriend doesn't have friendImage, so we use null
    imageUrl = null;
  }

  return <Avatar name={name} imageUrl={imageUrl} size={size} />;
}
