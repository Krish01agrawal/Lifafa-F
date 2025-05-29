import React from 'react';
import { Text, View } from 'react-native';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'javascript' }) => {
  return (
    <View className="bg-gray-900 rounded-lg my-2 overflow-hidden">
      <View className="px-3 py-2 bg-gray-800 border-b border-gray-700">
        <Text className="text-gray-300 text-sm font-medium">{language}</Text>
      </View>
      <View className="p-3">
        <Text className="text-green-400 font-mono text-sm leading-5">
          {code}
        </Text>
      </View>
    </View>
  );
}; 