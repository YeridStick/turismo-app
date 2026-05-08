import React, { useRef, useEffect } from "react";
import {
  Animated,
  Pressable,
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
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const compactTag = badge || "Imperdible";

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, [fadeAnim]);

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
        style={[styles.popularCard, cardWidth ? { width: cardWidth } : null]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={{
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
              colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.8)"]}
              style={styles.popularFade}
              pointerEvents="none"
            />
            <View style={styles.popularTopRow}>
              <View style={styles.compactBadge}>
                <FontAwesome name="camera" size={10} color="#fff" />
                <Text style={styles.compactBadgeText}>{compactTag}</Text>
              </View>
              <View style={[styles.cardRating, styles.popularRating]}>
                <Text style={styles.cardRatingText}>★ {rating || "4.5"}</Text>
              </View>
            </View>
            <View style={styles.popularTextBlock}>
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
                    color="#0E7490"
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
