import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  ScrollView,
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

  useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealAnim]);

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
  const vibeTags = [
    pkg.days >= 3 ? "Ruta extendida" : "Escapada",
    "Experiencia local",
  ];

  const revealStyle = {
    opacity: revealAnim,
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={revealStyle}>
      <Pressable style={[styles.packageCard, { width }]} onPress={onOpenDetails}>
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
                colors={["rgba(0,0,0,0.01)", "rgba(0,0,0,0.55)"]}
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

            <View style={styles.packageRatingRow}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={styles.packageRatingText}>{pkg.rating ?? 4.8}</Text>
              {pkg.agencyName ? (
                <Text style={styles.packageAgency} numberOfLines={1}>
                  · {pkg.agencyName}
                </Text>
              ) : null}
            </View>

            <View style={styles.packageMetaCleanRow}>
              <View style={styles.packageMetaCleanItem}>
                <FontAwesome name="clock-o" size={12} color="#94A3B8" />
                <Text style={styles.packageMetaCleanText}>
                  {pkg.days}D / {pkg.nights}N
                </Text>
              </View>
              <View style={styles.packageMetaCleanItem}>
                <FontAwesome name="user" size={12} color="#94A3B8" />
                <Text style={styles.packageMetaCleanText}>{pkg.people}</Text>
              </View>
            </View>

            <View style={styles.packageRouteBlock}>
              <View style={styles.packageRouteHeader}>
                <FontAwesome name="map-signs" size={11} color="#0E7490" />
                <Text style={styles.packageRouteTitle}>Sitios del paquete</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.packageRouteScroller}
                nestedScrollEnabled
                directionalLockEnabled
                keyboardShouldPersistTaps="handled"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onTouchStart={(event) => event.stopPropagation?.()}
                onTouchMove={(event) => event.stopPropagation?.()}
              >
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
                        style={styles.packageRouteChip}
                      >
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
              </ScrollView>
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
            <Text style={styles.packageDetailHint}>
              Toca la tarjeta para ver más detalles
            </Text>
          </View>

          <View style={styles.packageFooter}>
            <View style={styles.packagePriceCol}>
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
