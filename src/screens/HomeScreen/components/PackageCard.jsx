import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { IMAGE_PLACEHOLDER } from "../utils/constants";
import { formatPrice } from "../utils/helpers";
import styles from "../styles";

const PackageCard = ({
  pkg,
  width,
  onOpenDetails,
  onReservePress,
  getImage,
  getGradient,
  places = [],
}) => {
  const revealAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealAnim]);

  useEffect(() => {
    const shineLoop = Animated.loop(
      Animated.timing(shineAnim, {
        toValue: 1,
        duration: 3400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1700,
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

  const sanitizedIncludes = Array.isArray(pkg.includes)
    ? pkg.includes.filter((item) => item && String(item).trim())
    : [];
  const includeList = sanitizedIncludes.slice(0, 2);
  const remaining = Math.max(sanitizedIncludes.length - includeList.length, 0);
  const cityTags = pkg.city ? pkg.city.split("/").map((c) => c.trim()) : [];
  const packageImage = getImage(pkg);
  const hasImage = Boolean(packageImage);
  const fallbackGradient = getGradient(pkg);
  const placeLookup = new Map(
    (places || [])
      .filter((place) => place?.id != null)
      .map((place) => [String(place.id), place]),
  );
  const rawPackagePlaces =
    (Array.isArray(pkg.places) && pkg.places) ||
    (Array.isArray(pkg.sites) && pkg.sites) ||
    (Array.isArray(pkg.destinations) && pkg.destinations) ||
    [];
  const placeIds =
    (Array.isArray(pkg.placeIds) && pkg.placeIds) ||
    (Array.isArray(pkg.place_ids) && pkg.place_ids) ||
    (Array.isArray(pkg.siteIds) && pkg.siteIds) ||
    (Array.isArray(pkg.site_ids) && pkg.site_ids) ||
    [];
  const routePlaces = rawPackagePlaces.length
    ? rawPackagePlaces
        .map((place) => {
          const placeId = place?.place_id ?? place?.placeId ?? place?.id ?? place;
          const found = placeLookup.get(String(placeId));
          return found || place;
        })
        .filter(Boolean)
    : placeIds
        .map((placeId) => placeLookup.get(String(placeId)) || { id: placeId })
        .filter(Boolean);
  const visibleRoutePlaces = routePlaces.slice(0, 6);
  const description =
    pkg.description ||
    pkg.summary ||
    pkg.shortDescription ||
    pkg.subtitle ||
    "";
  const vibeTags = [
    pkg.days >= 3 ? "Ruta extendida" : "Escapada",
    "Experiencia local",
  ];

  const cardAnimatedStyle = {
    opacity: revealAnim,
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: pressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.985],
        }),
      },
    ],
  };
  const shineStyle = {
    opacity: shineAnim.interpolate({
      inputRange: [0, 0.18, 0.52, 1],
      outputRange: [0, 0.22, 0.08, 0],
    }),
    transform: [
      {
        translateX: shineAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-width * 0.7, width * 0.92],
        }),
      },
      { rotate: "18deg" },
    ],
  };
  const pulseStyle = {
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
  };

  const animatePress = (toValue) => {
    Animated.timing(pressAnim, {
      toValue,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={cardAnimatedStyle}>
      <Pressable
        style={[styles.packageCard, { width }]}
        onPress={onOpenDetails}
        onPressIn={() => animatePress(1)}
        onPressOut={() => animatePress(0)}
      >
        <View style={styles.packageImageWrapper}>
          {hasImage ? (
            <>
              <Image
                source={{ uri: packageImage }}
                style={styles.packageImage}
                contentFit="cover"
                cachePolicy="disk"
                placeholder={IMAGE_PLACEHOLDER}
                transition={200}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.60)"]}
                style={styles.packageImageOverlay}
              />
            </>
          ) : (
            <LinearGradient
              colors={fallbackGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.packageImage, styles.packageImageFallback]}
            >
              <FontAwesome
                name="suitcase"
                size={22}
                color="rgba(255,255,255,0.7)"
              />
            </LinearGradient>
          )}

          <Animated.View pointerEvents="none" style={[styles.packageImageGlowOrb, pulseStyle]} />
          <Animated.View pointerEvents="none" style={[styles.packageImageShine, shineStyle]} />

          {cityTags.length > 0 && (
            <View style={styles.packageLocationRow}>
              {cityTags.slice(0, 2).map((tag, idx) => (
                <View
                  key={`${pkg.id}-city-${idx}`}
                  style={styles.packageLocationChip}
                >
                  <FontAwesome name="map-marker" size={9} color="#fff" />
                  <Text style={styles.packageLocationText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.packageHeroMetricRow}>
            <View style={styles.packageHeroMetric}>
              <FontAwesome name="calendar-o" size={10} color="#FFFFFF" />
              <Text style={styles.packageHeroMetricText}>
                {pkg.days || 1}D / {pkg.nights || 0}N
              </Text>
            </View>
            <View style={styles.packageHeroMetric}>
              <FontAwesome name="users" size={10} color="#FFFFFF" />
              <Text style={styles.packageHeroMetricText}>
                {pkg.people || "Flexible"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.packageBody}>
          <View style={styles.packageBodyContent}>
            <View style={styles.packageVibeRow}>
              <View style={styles.packageVibeChip}>
                <FontAwesome name="sun-o" size={10} color="#9A3412" />
                <Text style={styles.packageVibeText}>{vibeTags[0]}</Text>
              </View>
              <View style={styles.packageVibeChip}>
                <FontAwesome name="leaf" size={10} color="#0F766E" />
                <Text style={styles.packageVibeText}>{vibeTags[1]}</Text>
              </View>
            </View>

            <Text style={styles.packageTitle} numberOfLines={3}>
              {pkg.title}
            </Text>

            {description ? (
              <Text style={styles.packageDescription} numberOfLines={3}>
                {description}
              </Text>
            ) : null}

            <View style={styles.packageRatingRow}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={styles.packageRatingText}>{pkg.rating ?? 4.8}</Text>
              {pkg.agencyName ? (
                <Text style={styles.packageAgency} numberOfLines={1}>
                  · {pkg.agencyName}
                </Text>
              ) : null}
            </View>

            <View style={styles.packageMetaGrid}>
              <View style={styles.packageMetricCard}>
                <FontAwesome name="clock-o" size={12} color="#94A3B8" />
                <Text style={styles.packageMetricLabel}>Duración</Text>
                <Text style={styles.packageMetricValue}>
                  {pkg.days || 1}D / {pkg.nights || 0}N
                </Text>
              </View>
              <View style={styles.packageMetricCard}>
                <FontAwesome name="user" size={12} color="#94A3B8" />
                <Text style={styles.packageMetricLabel}>Capacidad</Text>
                <Text style={styles.packageMetricValue}>
                  {pkg.people || "Flexible"}
                </Text>
              </View>
            </View>

            <View style={styles.packageRouteBlock}>
              <View style={styles.packageRouteHeader}>
                <FontAwesome name="map-signs" size={11} color="#0E7490" />
                <Text style={styles.packageRouteTitle}>Sitios del paquete</Text>
              </View>
              <View style={styles.packageRouteVerticalList}>
                {visibleRoutePlaces.length > 0 ? (
                  visibleRoutePlaces.map((place, idx) => {
                    const placeId =
                      place?.place_id ?? place?.placeId ?? place?.id ?? idx;
                    const placeName =
                      place?.name ||
                      place?.placeName ||
                      place?.title ||
                      `Sitio #${placeId}`;
                    const placeMeta =
                      place?.categoryName ||
                      place?.category?.name ||
                      place?.city ||
                      place?.location ||
                      "Destino";
                    return (
                      <View
                        key={`${pkg.id}-route-${placeId}-${idx}`}
                        style={styles.packageRouteChipVertical}
                      >
                        {idx < visibleRoutePlaces.length - 1 ? (
                          <View style={styles.packageRouteLine} />
                        ) : null}
                        <View style={styles.packageRouteIndex}>
                          <Text style={styles.packageRouteIndexText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.packageRouteInfo}>
                          <Text style={styles.packageRouteName} numberOfLines={1}>
                            {placeName}
                          </Text>
                          <Text style={styles.packageRouteMeta} numberOfLines={1}>
                            {placeMeta}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.packageRouteChipMuted}>
                    <FontAwesome name="map-marker" size={11} color="#64748B" />
                    <Text style={styles.packageRouteMutedText}>
                      Sitios por confirmar
                    </Text>
                  </View>
                )}
                {routePlaces.length > visibleRoutePlaces.length ? (
                  <View style={styles.packageRouteMoreChip}>
                    <Text style={styles.packageRouteMoreText}>
                      +{routePlaces.length - visibleRoutePlaces.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {includeList.length > 0 && (
              <View style={styles.packageIncludesClean}>
                {includeList.map((item, idx) => (
                  <View
                    key={`${pkg.id}-inc-${idx}`}
                    style={styles.packageIncludeCleanRow}
                  >
                    <View style={styles.packageIncludeBullet} />
                    <Text style={styles.packageIncludeCleanText} numberOfLines={1}>
                      {item}
                    </Text>
                  </View>
                ))}
                {remaining > 0 && (
                  <Text style={[styles.packageIncludeCleanText, { color: "#94A3B8" }]}>
                    +{remaining} más
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.packageFooter}>
            <View style={styles.packagePriceCol}>
              <Text style={styles.packageDetailHint}>
                Toca para ver detalles
              </Text>
              <Text style={styles.packagePriceNote}>por persona</Text>
              <Text style={styles.packagePrice}>{formatPrice(pkg.price)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.packageButtonClean, styles.packageReserveGlow]}
              onPress={(e) => {
                e?.stopPropagation?.();
                onReservePress?.();
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.packageButtonCleanText}>Reservar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default React.memo(PackageCard);
