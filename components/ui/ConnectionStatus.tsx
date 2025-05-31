import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Config } from '../../constants/Config';
import { useConnectionStatus, useOfflineStatus } from '../../hooks/useChatQueries';

export function ConnectionStatus() {
  const { 
    status, 
    reconnectAttempts, 
    error, 
    reconnect, 
    isConnected,
    shouldShowStatus,
    isReconnecting,
    hasMaxedRetries,
    getStatusMessage 
  } = useConnectionStatus();
  
  const { isOffline, pendingMessages, retryPendingMessages } = useOfflineStatus();

  // Always show status during development for debugging
  const shouldShow = shouldShowStatus() || __DEV__;

  if (!shouldShow) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#10B981'; // green
      case 'connecting': return '#F59E0B'; // yellow
      case 'disconnected': return '#6B7280'; // gray
      case 'error': return '#EF4444'; // red
      default: return '#6B7280';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return 'checkmark-circle';
      case 'connecting': return 'refresh';
      case 'disconnected': return 'cloud-offline';
      case 'error': return 'warning';
      default: return 'help-circle';
    }
  };

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
            name={getStatusIcon()} 
            size={16} 
            color={getStatusColor()}
            style={{ marginRight: 8 }}
          />
          <View className="flex-1">
            <Text style={{ color: getStatusColor(), fontSize: 14, fontWeight: '500' }}>
              WebSocket: {getStatusMessage()}
            </Text>
            {__DEV__ && (
              <Text className="text-gray-400 text-xs mt-1">
                Config: {Config.enableWebSocket ? 'Enabled' : 'Disabled'} | 
                URL: {Config.apiUrl} | 
                Attempts: {reconnectAttempts}
              </Text>
            )}
            {error && (
              <Text className="text-red-400 text-xs mt-1">
                Error: {typeof error === 'string' ? error : error.message || 'Connection failed'}
              </Text>
            )}
            {pendingMessages > 0 && (
              <Text className="text-yellow-400 text-xs mt-1">
                {pendingMessages} message(s) pending
              </Text>
            )}
          </View>
        </View>
        
        {/* Action Buttons */}
        <View className="flex-row items-center">
          {pendingMessages > 0 && (
            <TouchableOpacity
              onPress={retryPendingMessages}
              className="mr-2 p-1"
            >
              <Ionicons name="refresh" size={16} color="#F59E0B" />
            </TouchableOpacity>
          )}
          {(status === 'error' || status === 'disconnected') && (
            <TouchableOpacity
              onPress={reconnect}
              className="p-1"
              disabled={isReconnecting()}
            >
              <Ionicons 
                name="refresh" 
                size={16} 
                color={isReconnecting() ? '#6B7280' : getStatusColor()} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// Compact version for mobile
export function ConnectionStatusCompact() {
  const { status, shouldShowStatus } = useConnectionStatus();
  const { pendingMessages } = useOfflineStatus();

  if (!shouldShowStatus() && pendingMessages === 0) {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
        return 'bg-yellow-500';
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <View className="absolute top-2 right-2 z-10 flex-row items-center">
      <View className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      {pendingMessages > 0 && (
        <View className="ml-1 bg-orange-500 rounded-full px-2 py-0.5">
          <Text className="text-xs text-white font-medium">{pendingMessages}</Text>
        </View>
      )}
    </View>
  );
} 