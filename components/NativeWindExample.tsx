import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export default function NativeWindExample() {
  return (
    <View className="flex-1 items-center justify-center p-4 bg-gray-100">
      <View className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <Text className="text-2xl font-bold text-gray-800 mb-4 text-center">
          NativeWind Demo
        </Text>
        <Text className="text-gray-600 mb-6 text-center">
          This component uses Tailwind CSS classes with NativeWind!
        </Text>
        <TouchableOpacity className="bg-blue-500 hover:bg-blue-600 py-3 px-6 rounded-lg">
          <Text className="text-white font-semibold text-center">
            Styled Button
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 