import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

const COLORS = ["#156436", "#FED201", "#FE6C01", "#156436", "#FED201"];

const TravelTrail = ({ index, size, top, left, color, progress }) => {
  const phase = (index % 4) * 0.08;
  const inputRange = [0, 0.45, 0.9, 1];
  const xDrift = index % 2 === 0 ? 72 + phase * 42 : 54 + phase * 36;
  const yDrift = index % 3 === 0 ? -34 - phase * 18 : 26 + phase * 16;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size * 3.4,
          height: Math.max(3, size * 0.7),
          left,
          top,
          backgroundColor: color,
          opacity: progress.interpolate({
            inputRange,
            outputRange: [0, 0.3, 0.16, 0],
          }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange,
                outputRange: [-36, xDrift * 0.45, xDrift, xDrift + 18],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange,
                outputRange: [-phase * 10, yDrift * 0.45, yDrift, yDrift + 8],
              }),
            },
            { rotate: `${index % 2 === 0 ? -14 : 10}deg` },
          ],
        },
      ]}
    />
  );
};

const AuthAnimatedBackground = () => {
  const blob = useRef(new Animated.Value(0)).current;
  const travelProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const blobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blob, {
          toValue: 1,
          duration: 6200,
          easing: Easing.inOut(Easing.sin),
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(blob, {
          toValue: 0,
          duration: 6200,
          easing: Easing.inOut(Easing.sin),
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]),
    );
    const travelLoop = Animated.loop(
      Animated.timing(travelProgress, {
        toValue: 1,
        duration: 6400,
        easing: Easing.linear,
        isInteraction: false,
        useNativeDriver: true,
      }),
    );

    blobLoop.start();
    travelLoop.start();
    return () => {
      blobLoop.stop();
      travelLoop.stop();
    };
  }, [blob, travelProgress]);

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, index) => ({
        index,
        size: 5 + (index % 5) * 2,
        left: (width * ((index * 17) % 100)) / 100 - 36,
        top: (height * ((index * 23) % 100)) / 100,
        color: COLORS[index % COLORS.length],
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
                translateY: blob.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 28],
                }),
              },
              {
                scale: blob.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.12],
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
                translateX: blob.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -28],
                }),
              },
              {
                translateY: blob.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -22],
                }),
              },
            ],
          },
        ]}
      />
      <View style={styles.veilTop} />
      <View style={styles.veilBottom} />
      {particles.map((particle) => (
        <TravelTrail
          key={particle.index}
          {...particle}
          progress={travelProgress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.16,
  },
  blobTop: {
    width: 260,
    height: 260,
    top: -90,
    right: -86,
    backgroundColor: "#156436",
  },
  blobBottom: {
    width: 300,
    height: 300,
    bottom: -120,
    left: -110,
    backgroundColor: "#FE6C01",
  },
  particle: {
    position: "absolute",
    borderRadius: 999,
  },
  veilTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "38%",
    backgroundColor: "rgba(236, 254, 255, 0.52)",
  },
  veilBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "42%",
    backgroundColor: "rgba(255, 247, 237, 0.44)",
  },
});

export default React.memo(AuthAnimatedBackground);
