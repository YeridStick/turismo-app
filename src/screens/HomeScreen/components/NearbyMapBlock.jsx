import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
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

  const center =
    coords &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude)
      ? coords
      : FALLBACK_CENTER;

  const delta = Math.max(distanceKm / 110, 0.015);
  const nearbyMarkers = filteredNearby
    .filter((place) => Number.isFinite(place?.lat) && Number.isFinite(place?.lng))
    .map((place) => ({
      latitude: place.lat,
      longitude: place.lng,
      title: place.name,
      description:
        place.description ||
        (place.distanceMeters ? formatDistance(place.distanceMeters) : ""),
    }));

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
            initialRegion={{
              latitude: center.latitude,
              longitude: center.longitude,
              latitudeDelta: delta,
              longitudeDelta: delta,
            }}
            markers={nearbyMarkers}
            userLocation={
              coords &&
              Number.isFinite(coords.latitude) &&
              Number.isFinite(coords.longitude)
                ? coords
                : null
            }
            showCircle={true}
            circleRadius={distanceKm * 1000}
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
            keyExtractor={(item, idx) => `nearby-${item.id || idx}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapCarrouselContent}
            renderItem={({ item, index }) => (
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
                onPress={() => onPlacePress(item, index)}
                onArPress={() => onArPress(item)}
              />
            )}
          />
        ) : (
          <View style={styles.mapEmptyCard}>
            <View style={styles.mapEmptyIconContainer}>
              <FontAwesome name="map-marker" size={24} color="#0E7490" />
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.mapEmptyTitle}>Sin sitios cercanos</Text>
              <Text style={styles.mapEmptyDesc}>
                No hay lugares en tu rango actual ({distanceKm}km). Aqui
                apareceran destinos, rutas y experiencias cercanas cuando
                tengamos informacion disponible.
              </Text>
            </View>
            <View style={styles.mapEmptyActions}>
              <TouchableOpacity
                style={styles.mapEmptyButton}
                onPress={onIncreaseRadius}
                activeOpacity={0.8}
              >
                <FontAwesome name="search-plus" size={16} color="#FFF" />
                <Text style={styles.mapEmptyButtonText}>Explorar mas lejos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapEmptyButton, styles.mapEmptyButtonSecondary]}
                onPress={onReloadNearby}
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
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default React.memo(NearbyMapBlock);
