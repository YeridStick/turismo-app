import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Easing } from "react-native";

const { width, height } = Dimensions.get("window");
const PARTICLE_COLORS = [
  "#0EA5A4",
  "#14B8A6",
  "#FB923C",
  "#38BDF8",
  "#8B5CF6",
  "#A78BFA",
];

const Particle = ({
  delay,
  duration,
  size,
  initialX,
  initialY,
  color,
  travelX,
  arcY,
  endDriftY,
  tiltDeg,
}) => {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    const startAnimation = () => {
      moveAnim.setValue(0);
      loopRef.current = Animated.loop(
        Animated.timing(moveAnim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.bezier(0.35, 0.0, 0.2, 1)),
          useNativeDriver: true,
        }),
      );
      loopRef.current.start();
    };

    const timer = setTimeout(startAnimation, delay);
    return () => {
      clearTimeout(timer);
      if (loopRef.current) loopRef.current.stop();
    };
  }, [delay, duration, moveAnim]);

  const translateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travelX],
  });

  const translateY = moveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, arcY, endDriftY],
  });

  const swayX = moveAnim.interpolate({
    inputRange: [0, 0.2, 0.45, 0.7, 1],
    outputRange: [0, 5, -4, 3, 0],
  });

  const waveY = moveAnim.interpolate({
    inputRange: [0, 0.18, 0.36, 0.54, 0.76, 1],
    outputRange: [0, -3, 2, -2, 1, 0],
  });

  const opacity = moveAnim.interpolate({
    inputRange: [0, 0.08, 0.5, 0.85, 1],
    outputRange: [0, 0.05, 0.18, 0.08, 0],
  });

  const scale = moveAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.85, 1, 1.2],
  });

  const stretchX = moveAnim.interpolate({
    inputRange: [0, 0.3, 0.65, 1],
    outputRange: [0.92, 1.12, 1.04, 0.96],
  });

  const squashY = moveAnim.interpolate({
    inputRange: [0, 0.3, 0.65, 1],
    outputRange: [1.05, 0.88, 0.94, 1.02],
  });

  const rotate = moveAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [`${tiltDeg}deg`, `${tiltDeg + 6}deg`, `${tiltDeg + 2}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size * 2.6,
          height: Math.max(2, size * 0.75),
          borderRadius: 999,
          left: initialX,
          top: initialY,
          backgroundColor: color,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { translateX: swayX },
            { translateY: waveY },
            { rotate },
            { scale },
            { scaleX: stretchX },
            { scaleY: squashY },
          ],
        },
      ]}
    />
  );
};

const AnimatedBackground = () => {
  const blobAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const loops = blobAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 12000 + index * 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 12000 + index * 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [blobAnims]);

  const particles = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, index) => ({
        id: index,
        size: Math.random() * 8 + 3,
        initialX: -Math.random() * (width * 0.65),
        initialY: Math.random() * height,
        duration: 7600 + Math.random() * 6400,
        delay: Math.random() * 5200,
        travelX: width + Math.random() * (width * 0.9),
        arcY: -28 + Math.random() * 32,
        endDriftY: -6 + Math.random() * 12,
        tiltDeg: -10 + Math.random() * 14,
        color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
      })),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.blob,
          styles.blobTop,
          {
            transform: [
              {
                translateY: blobAnims[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 16],
                }),
              },
              {
                scale: blobAnims[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.08],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobMiddle,
          {
            transform: [
              {
                translateX: blobAnims[1].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 18],
                }),
              },
              {
                translateY: blobAnims[1].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobBottom,
          {
            transform: [
              {
                translateY: blobAnims[2].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -14],
                }),
              },
              {
                scale: blobAnims[2].interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.06],
                }),
              },
            ],
          },
        ]}
      />
      <View style={styles.topVeil} />
      <View style={styles.bottomVeil} />
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
    opacity: 0.1,
  },
  blobTop: {
    width: 240,
    height: 240,
    backgroundColor: "#0EA5A4",
    top: -90,
    right: -72,
  },
  blobMiddle: {
    width: 220,
    height: 220,
    backgroundColor: "#818CF8",
    top: "32%",
    left: -104,
  },
  blobBottom: {
    width: 260,
    height: 260,
    backgroundColor: "#FDBA74",
    bottom: -116,
    right: -82,
  },
  particle: {
    position: "absolute",
    opacity: 0.12,
  },
  topVeil: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "34%",
    backgroundColor: "rgba(236,233,255,0.2)",
  },
  bottomVeil: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "38%",
    backgroundColor: "rgba(245,243,255,0.16)",
  },
});

export default React.memo(AnimatedBackground);
