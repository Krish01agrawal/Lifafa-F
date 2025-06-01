import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { Config } from '../../constants/Config';

export function ConnectionStatus() {
  // In local mode, always show connected status
  const status = 'connected';
  const statusMessage = 'Local Mode - No Backend';

  // Only show in development mode
  if (!__DEV__) return null;

  const getStatusColor = () => '#10B981'; // green

  return (
    <View className="px-2 pt-2">
      <View 
        className="flex-row items-center justify-between p-3 rounded-lg border"
        style={{ 
          backgroundColor: '#1F2937',
          borderColor: getStatusColor(),
          borderWidth: 1
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons 
            name="checkmark-circle" 
            size={16} 
            color={getStatusColor()}
            style={{ marginRight: 8 }}
          />
          <View className="flex-1">
            <Text style={{ color: getStatusColor(), fontSize: 14, fontWeight: '500' }}>
              Status: {statusMessage}
            </Text>
            {__DEV__ && (
              <Text className="text-gray-400 text-xs mt-1">
                Mode: Local Development | 
                Mock API: {Config.enableMockApi ? 'Enabled' : 'Disabled'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// Compact version for mobile (simplified)
export function ConnectionStatusCompact() {
  // Don't show anything in local mode unless in development
  if (!__DEV__) return null;

  return (
    <View className="absolute top-2 right-2 z-10 flex-row items-center">
      <View className="w-2 h-2 rounded-full bg-green-500" />
      <Text className="ml-1 text-xs text-gray-400">Local</Text>
    </View>
  );
} 