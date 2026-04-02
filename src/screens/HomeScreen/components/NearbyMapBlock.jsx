import React from "react";
import { 
  View, 
  Text, 
  Platform, 
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import WebViewMap from "../../../components/WebViewMap";
import PlaceCard from "./PlaceCard";
import { formatDistance } from "../utils/helpers";
import { FALLBACK_CENTER } from "../utils/constants";
import { COLORS, SPACING } from "../../../utils/constants";
import styles from "../styles";

const NearbyMapBlock = ({
  coords,
  filteredNearby,
  distanceKm,
  isInteractingWithMap,
  onMapTouchStart,
  onMapTouchEnd,
  onPlacePress,
  onArPress,
  onIncreaseRadius,
  getTopPlaceMeta,
  loadingNearby,
}) => {
  const center =
    coords &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude)
      ? coords
      : FALLBACK_CENTER;

  const delta = Math.max(distanceKm / 110, 0.015);
  const nearbyMarkers = filteredNearby
    .filter(
      (place) =>
        Number.isFinite(place?.lat) && Number.isFinite(place?.lng),
    )
    .map((place) => ({
      latitude: place.lat,
      longitude: place.lng,
      title: place.name,
      description:
        place.description || (place.distanceMeters ? formatDistance(place.distanceMeters) : ""),
    }));

  return (
    <View style={styles.mapCard}>
      <View 
        style={styles.mapTouchWrapper}
        onTouchStart={onMapTouchStart}
        onTouchEnd={onMapTouchEnd}
        onTouchCancel={onMapTouchEnd}
      >
        {Platform.OS === "web" ? (
          <View style={styles.mapEmptyState}>
            <Text style={styles.mapEmptyText}>
              El mapa no está disponible en la versión web.
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
            scrollEnabled={isInteractingWithMap}
            zoomEnabled={isInteractingWithMap}
          />
        )}
      </View>
      
      {/* Nearby Sites Carrousel Over Map */}
      <View 
        style={styles.mapNearbyCarrousel}
        pointerEvents="box-none"
      >
        {loadingNearby ? (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#5B3CF0" />
            <Text style={styles.mapLoadingText}>Buscando...</Text>
          </View>
        ) : filteredNearby.length > 0 ? (
          <FlatList
            horizontal
            data={filteredNearby}
            keyExtractor={(item, idx) => `nearby-${item.id || idx}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapCarrouselContent}
            renderItem={({ item }) => (
              <PlaceCard 
                title={item.name}
                subtitle={item.description}
                meta={getTopPlaceMeta(item)}
                image={item.image}
                rating={item.rating}
                distance={item.distance}
                variant="compact"
                cardWidth={250}
                imageHeight={180} // Increased more for full visibility
                onPress={() => onPlacePress(item)} 
                onArPress={() => onArPress(item)}
              />
            )}
          />
        ) : (
          <View style={styles.mapEmptyCard}>
            <View style={styles.mapEmptyIconContainer}>
              <FontAwesome name="map-marker" size={24} color="#5B3CF0" />
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.mapEmptyTitle}>Sin sitios cercanos</Text>
              <Text style={styles.mapEmptyDesc}>
                No hay lugares en tu rango actual ({distanceKm}km).
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.mapEmptyButton}
              onPress={onIncreaseRadius}
              activeOpacity={0.8}
            >
              <FontAwesome name="search-plus" size={16} color="#FFF" />
              <Text style={styles.mapEmptyButtonText}>Explorar más lejos</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default React.memo(NearbyMapBlock);
