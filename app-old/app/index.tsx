import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ReceiptsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };
  const handleNewReceipt = () => {
    // TODO: Implement new receipt functionality
    console.log("New receipt button pressed");
  };

  return (
    <View className="flex-1">
      <FlatList
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        data={[{ id: 1 }, { id: 2 }, { id: 3 }]}
        renderItem={({ item }) => (
          <View className="py-4 px-4">
            <Text>{item.id}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ flex: 1 }}
      />

      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8">
        <TouchableOpacity
          onPress={handleNewReceipt}
          className="bg-black rounded-full py-4 px-6 flex-row items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#ffffff" />
          <Text className="text-white text-lg font-semibold font-serif ml-2">
            New Receipt
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
