import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]);

    animation.start();

    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  const DotStyle = (dot: Animated.Value) => ({
    opacity: dot,
    transform: [
      {
        scale: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
    ],
  });

  return (
    <View className="mb-4 items-start">
      <View className="bg-gray-800 p-3 rounded-2xl rounded-bl-md">
        <View className="flex-row items-center space-x-1">
          <Animated.View
            style={[DotStyle(dot1)]}
            className="w-2 h-2 bg-gray-400 rounded-full"
          />
          <Animated.View
            style={[DotStyle(dot2)]}
            className="w-2 h-2 bg-gray-400 rounded-full"
          />
          <Animated.View
            style={[DotStyle(dot3)]}
            className="w-2 h-2 bg-gray-400 rounded-full"
          />
        </View>
      </View>
    </View>
  );
}; 