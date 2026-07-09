import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WebViewMap from "../../../components/WebViewMap";
import styles from "../styles";
import { FALLBACK_CENTER } from "../utils/constants";
import { formatDistance, getPlaceImage } from "../utils/helpers";
import PlaceCard from "./PlaceCard";

const nearbyKeyExtractor = (item, idx) => `nearby-${item.id || idx}`;

const isValidCoordinate = (value) =>
  Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);

const NearbyPlaceItem = React.memo(({
  item,
  index,
  getTopPlaceMeta,
  onPlacePress,
  onArPress,
}) => {
  const handlePress = useCallback(() => {
    onPlacePress(item, index);
  }, [index, item, onPlacePress]);

  const handleArPress = useCallback(() => {
    onArPress(item);
  }, [item, onArPress]);

  return (
    <PlaceCard
      title={item.name}
      subtitle={item.description}
      meta={getTopPlaceMeta(item)}
      image={getPlaceImage(item)}
      rating={item.rating}
      distance={item.distance}
      variant="compact"
      cardWidth={250}
      imageHeight={180}
      onPress={handlePress}
      onArPress={handleArPress}
    />
  );
});

const NearbyMapBlock = ({
  coords,
  filteredNearby,
  distanceKm,
  mapGestureLocked,
  isInteractingWithMap,
  onMapTouchStart,
  onMapTouchEnd,
  onToggleMapGestureLock,
  onUnlockMapGesture,
  onPlacePress,
  onArPress,
  onIncreaseRadius,
  onReloadNearby,
  getTopPlaceMeta,
  loadingNearby,
  nearbyError = "",
  locationError = "",
  pauseMapUpdates = false,
}) => {
  const lastTapRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const carouselOpacity = useRef(new Animated.Value(mapGestureLocked ? 0 : 1)).current;

  useEffect(() => {
    let pulseLoop = null;

    if (mapGestureLocked) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 620,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 620,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
    };
  }, [mapGestureLocked, pulseAnim]);

  useEffect(() => {
    Animated.timing(carouselOpacity, {
      toValue: mapGestureLocked ? 0 : 1,
      duration: mapGestureLocked ? 160 : 220,
      useNativeDriver: true,
    }).start();
  }, [carouselOpacity, mapGestureLocked]);

  const handleTouchEnd = useCallback(
    (event) => {
      if (mapGestureLocked) {
        onMapTouchEnd?.(event);
        return;
      }

      const now = Date.now();
      if (now - lastTapRef.current < 260) {
        onToggleMapGestureLock?.();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
      onMapTouchEnd?.(event);
    },
    [mapGestureLocked, onMapTouchEnd, onToggleMapGestureLock],
  );

  const renderNearbyItem = useCallback(
    ({ item, index }) => (
      <NearbyPlaceItem
        item={item}
        index={index}
        getTopPlaceMeta={getTopPlaceMeta}
        onPlacePress={onPlacePress}
        onArPress={onArPress}
      />
    ),
    [getTopPlaceMeta, onArPress, onPlacePress],
  );

  const userLocation = useMemo(
    () =>
      isValidCoordinate(coords)
        ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }
        : null,
    [coords?.latitude, coords?.longitude],
  );

  const center = useMemo(
    () => userLocation || FALLBACK_CENTER,
    [userLocation],
  );

  const delta = useMemo(() => Math.max(distanceKm / 110, 0.015), [distanceKm]);

  const initialRegion = useMemo(
    () => ({
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: delta,
      longitudeDelta: delta,
    }),
    [center.latitude, center.longitude, delta],
  );

  const nearbyMarkers = useMemo(
    () =>
      filteredNearby
        .filter((place) => Number.isFinite(place?.lat) && Number.isFinite(place?.lng))
        .map((place) => ({
          latitude: place.lat,
          longitude: place.lng,
          title: place.name,
          description:
            place.description ||
            (place.distanceMeters ? formatDistance(place.distanceMeters) : ""),
        })),
    [filteredNearby],
  );

  const circleRadius = useMemo(() => distanceKm * 1000, [distanceKm]);

  const emptyState = useMemo(() => {
    if (!userLocation) {
      return {
        icon: "location-arrow",
        title: "Sin ubicación disponible",
        description:
          locationError ||
          "Activa el permiso de ubicación para encontrar lugares cercanos.",
        primaryLabel: "Intentar ubicación",
        primaryIcon: "refresh",
        showSecondary: false,
      };
    }

    if (nearbyError) {
      return {
        icon: "exclamation-circle",
        title: "No pudimos cargar cercanos",
        description:
          nearbyError ||
          "Conservamos el mapa actual. Puedes intentar cargar esta sección nuevamente.",
        primaryLabel: "Volver a cargar",
        primaryIcon: "refresh",
        showSecondary: false,
      };
    }

    return {
      icon: "map-marker",
      title: "Sin sitios cercanos",
      description: `No hay lugares en tu rango actual (${distanceKm}km). Aqui apareceran destinos, rutas y experiencias cercanas cuando tengamos informacion disponible.`,
      primaryLabel: "Explorar mas lejos",
      primaryIcon: "search-plus",
      showSecondary: true,
    };
  }, [distanceKm, locationError, nearbyError, userLocation]);

  return (
    <View style={styles.mapCard}>
      <View
        style={styles.mapTouchWrapper}
        onTouchStart={onMapTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={onMapTouchEnd}
      >
        {Platform.OS === "web" ? (
          <View style={styles.mapEmptyState}>
            <Text style={styles.mapEmptyText}>
              El mapa no esta disponible en la version web.
            </Text>
          </View>
        ) : (
          <WebViewMap
            initialRegion={initialRegion}
            markers={nearbyMarkers}
            userLocation={userLocation}
            showCircle={true}
            circleRadius={circleRadius}
            pauseUpdates={pauseMapUpdates}
            scrollEnabled={isInteractingWithMap || mapGestureLocked}
            zoomEnabled={isInteractingWithMap || mapGestureLocked}
          />
        )}

        {mapGestureLocked ? (
          <Animated.View
            style={[
              styles.mapLockBadgePulseWrap,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.06],
                  outputRange: [0.92, 1],
                }),
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.mapLockBadge}
              onPress={onUnlockMapGesture}
            >
              <FontAwesome name="lock" size={11} color="#0E7490" />
              <Text style={styles.mapLockBadgeText}>Modo mapa activo - Salir</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.mapLockBadgeHint}>
            <FontAwesome name="hand-pointer-o" size={11} color="#64748B" />
            <Text style={styles.mapLockBadgeHintText}>
              Doble toque para fijar el mapa
            </Text>
          </View>
        )}
      </View>

      <Animated.View
        style={[styles.mapNearbyCarrousel, { opacity: carouselOpacity }]}
        pointerEvents={mapGestureLocked ? "none" : "box-none"}
      >
        {loadingNearby ? (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#0E7490" />
            <Text style={styles.mapLoadingText}>Buscando...</Text>
          </View>
        ) : filteredNearby.length > 0 ? (
          <FlatList
            horizontal
            data={filteredNearby}
            keyExtractor={nearbyKeyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapCarrouselContent}
            renderItem={renderNearbyItem}
            initialNumToRender={3}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
          />
        ) : (
          <View style={styles.mapEmptyCard}>
            <View style={styles.mapEmptyIconContainer}>
              <FontAwesome name={emptyState.icon} size={24} color="#0E7490" />
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.mapEmptyTitle}>{emptyState.title}</Text>
              <Text style={styles.mapEmptyDesc}>
                {emptyState.description}
              </Text>
            </View>
            <View style={styles.mapEmptyActions}>
              <TouchableOpacity
                style={styles.mapEmptyButton}
                onPress={emptyState.showSecondary ? onIncreaseRadius : onReloadNearby}
                disabled={loadingNearby}
                activeOpacity={0.8}
              >
                <FontAwesome name={emptyState.primaryIcon} size={16} color="#FFF" />
                <Text style={styles.mapEmptyButtonText}>{emptyState.primaryLabel}</Text>
              </TouchableOpacity>
              {emptyState.showSecondary ? (
                <TouchableOpacity
                  style={[styles.mapEmptyButton, styles.mapEmptyButtonSecondary]}
                  onPress={onReloadNearby}
                  disabled={loadingNearby}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="refresh" size={15} color="#0E7490" />
                  <Text
                    style={[
                      styles.mapEmptyButtonText,
                      styles.mapEmptyButtonSecondaryText,
                    ]}
                  >
                    Volver a cargar
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default React.memo(NearbyMapBlock);
