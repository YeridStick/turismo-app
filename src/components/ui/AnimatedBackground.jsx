import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Easing } from "react-native";

const { width, height } = Dimensions.get("window");
const PARTICLE_COLORS = ["#0EA5A4", "#14B8A6", "#FB923C", "#38BDF8"];

const Particle = ({ delay, duration, size, initialX, initialY, color }) => {
  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      moveAnim.setValue(0);
      Animated.loop(
        Animated.timing(moveAnim, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    };

    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, [delay, duration, moveAnim]);

  const translateX = moveAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 24, 0, -24, 0],
  });

  const translateY = moveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -32, 0],
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
          backgroundColor: color,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
};

const AnimatedBackground = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, index) => ({
        id: index,
        size: Math.random() * 10 + 4,
        initialX: Math.random() * width,
        initialY: Math.random() * height,
        duration: 12000 + Math.random() * 12000,
        delay: Math.random() * 3000,
        color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
      })),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobMiddle]} />
      <View style={[styles.blob, styles.blobBottom]} />
      {particles.map((particle) => (
        <Particle key={particle.id} {...particle} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.08,
  },
  blobTop: {
    width: 240,
    height: 240,
    backgroundColor: "#0EA5A4",
    top: -80,
    right: -80,
  },
  blobMiddle: {
    width: 220,
    height: 220,
    backgroundColor: "#38BDF8",
    top: "35%",
    left: -110,
  },
  blobBottom: {
    width: 260,
    height: 260,
    backgroundColor: "#FB923C",
    bottom: -120,
    right: -90,
  },
  particle: {
    position: "absolute",
    opacity: 0.08,
  },
});

export default React.memo(AnimatedBackground);
