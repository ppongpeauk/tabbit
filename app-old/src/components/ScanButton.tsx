import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ScanButtonProps {
  onPress: () => void;
}

export default function ScanButton({ onPress }: ScanButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-20 h-20 rounded-full bg-black items-center justify-center"
      activeOpacity={0.8}
    >
      <Ionicons name="camera" size={32} color="#ffffff" />
    </TouchableOpacity>
  );
}
