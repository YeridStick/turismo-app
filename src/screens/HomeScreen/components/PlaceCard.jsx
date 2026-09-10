import React, { useRef, useEffect } from "react";
import {
  Animated,
  Easing,
  Pressable,
  TouchableOpacity,
  View,
  Text,
  ImageBackground,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS, FONT_SIZES } from "../../../utils/constants";
import { IMAGE_PLACEHOLDER } from "../utils/constants";
import styles from "../styles";

const PlaceCard = React.memo(
  ({
    title,
    subtitle,
    meta,
    variant = "full",
    image,
    onPress,
    badge,
    rating,
    distance,
    cardWidth,
    imageHeight,
    onArPress,
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const shineAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const compactTag = badge || "Imperdible";

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, [fadeAnim]);

    useEffect(() => {
      const shineLoop = Animated.loop(
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      );
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      );

      shineLoop.start();
      pulseLoop.start();

      return () => {
        shineLoop.stop();
        pulseLoop.stop();
      };
    }, [pulseAnim, shineAnim]);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    const renderCompact = () => (
      <Pressable
        style={[
          styles.popularCard,
          cardWidth ? { width: cardWidth } : null,
          imageHeight ? { height: imageHeight + 112 } : null,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={{
            width: "100%",
            height: "100%",
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          }}
        >
          <ImageBackground
            source={{ uri: image || IMAGE_PLACEHOLDER }}
            style={styles.popularImage}
            imageStyle={styles.popularImageRadius}
          >
            <LinearGradient
              colors={[
                "rgba(6, 78, 59, 0.08)",
                "rgba(15, 23, 42, 0.12)",
                "rgba(15, 23, 42, 0.84)",
              ]}
              style={styles.popularFade}
              pointerEvents="none"
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.popularGlowOrb,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.18, 0.34],
                  }),
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1.08],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.popularShine,
                {
                  opacity: shineAnim.interpolate({
                    inputRange: [0, 0.18, 0.52, 1],
                    outputRange: [0, 0.22, 0.08, 0],
                  }),
                  transform: [
                    {
                      translateX: shineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-240, 330],
                      }),
                    },
                    { rotate: "18deg" },
                  ],
                },
              ]}
            />
            <View style={styles.popularTopRow}>
              <View style={styles.compactBadge}>
                <FontAwesome name="camera" size={10} color="#fff" />
                <Text style={styles.compactBadgeText}>{compactTag}</Text>
              </View>
              <View style={styles.popularRatingPill}>
                <Text style={styles.cardRatingText}>★ {rating || "4.5"}</Text>
              </View>
            </View>
            {distance ? (
              <View style={styles.popularDistancePill}>
                <FontAwesome name="location-arrow" size={10} color="#156436" />
                <Text style={styles.popularDistanceText}>{distance}</Text>
              </View>
            ) : null}
            <View style={styles.popularTextBlock}>
              <View style={styles.popularGlassPanel}>
                <Text style={styles.popularTitle} numberOfLines={2}>
                  {title}
                </Text>
                {meta ? (
                  <View style={styles.popularMetaRow}>
                    <FontAwesome
                      name="map-marker"
                      size={FONT_SIZES.md}
                      color={COLORS.white}
                    />
                    <Text style={styles.popularMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                  </View>
                ) : null}
                {subtitle ? (
                  <Text style={styles.popularSubtitle} numberOfLines={2}>
                    {subtitle}
                  </Text>
                ) : null}
                <View style={styles.popularActionRow}>
                  <View style={styles.popularHintPill}>
                    <Text style={styles.popularHintText}>Ver detalles</Text>
                    <FontAwesome name="angle-right" size={12} color="#FFFFFF" />
                  </View>
                  {onArPress ? (
                    <TouchableOpacity
                      style={styles.popularArButton}
                      activeOpacity={0.82}
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        onArPress?.();
                      }}
                    >
                      <FontAwesome name="cube" size={12} color="#156436" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>
      </Pressable>
    );

    const renderDefault = () => (
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        }}
      >
        <Pressable
          style={[
            styles.card,
            variant === "compact" && styles.cardCompact,
            variant === "wide" && styles.cardWide,
            variant === "compact" && cardWidth ? { width: cardWidth } : null,
            variant === "wide" && cardWidth ? { width: cardWidth } : null,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {image ? (
            <View style={styles.cardImageWrapper}>
              <Image
                source={{ uri: image }}
                style={[
                  styles.cardImage,
                  imageHeight ? { height: imageHeight } : null,
                ]}
                contentFit="cover"
                cachePolicy="disk"
                placeholder={IMAGE_PLACEHOLDER}
                transition={200}
              />
              <LinearGradient
                colors={["rgba(14,116,144,0.28)", "rgba(251,146,60,0.16)", "transparent"]}
                style={styles.cardTopTint}
                pointerEvents="none"
              />
              <View style={styles.cardTopRow}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{badge || "Destino"}</Text>
                </View>
              </View>
              <View style={styles.cardRating}>
                <Text style={styles.cardRatingText}>★ {rating || "4.5"}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {title}
              </Text>
              {distance ? (
                <View style={styles.cardDistanceContainer}>
                  <FontAwesome
                    name="location-arrow"
                    size={FONT_SIZES.sm}
                    color="#156436"
                  />
                  <Text style={styles.cardDistance}>{distance}</Text>
                </View>
              ) : null}
            </View>
            {subtitle ? (
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
            {meta ? (
              <View style={styles.cardMetaRow}>
                <FontAwesome
                  name="map-marker"
                  size={FONT_SIZES.md}
                  color={COLORS.textLight}
                />
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    );

    if (variant === "compact") {
      return renderCompact();
    }
    return renderDefault();
  },
);

PlaceCard.displayName = "PlaceCard";

export default PlaceCard;
