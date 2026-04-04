import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const Particle = ({ delay, duration, size, initialX, initialY }) => {
  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      moveAnim.setValue(0);
      Animated.loop(
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };

    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, []);

  const translateX = moveAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 30, 0, -30, 0],
  });

  const translateY = moveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -40, 0],
  });

  const rotate = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: initialX,
          top: initialY,
          transform: [{ translateX }, { translateY }, { rotate }],
        },
      ]}
    />
  );
};

const AnimatedBackground = () => {
  // Generate 20 small glimmer particles with random properties
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    size: Math.random() * 12 + 4,
    initialX: Math.random() * width,
    initialY: Math.random() * height,
    duration: 15000 + Math.random() * 15000,
    delay: Math.random() * 5000,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    backgroundColor: '#5B3CF0',
    opacity: 0.04,
  },
});

export default React.memo(AnimatedBackground);
