import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
  Platform,
} from 'react-native';
// Import MapView only on native platforms (iOS/Android)
let MapView, Marker;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../utils/constants';
import { BREAKPOINTS } from '../utils/responsive';

const { width } = Dimensions.get('window');

const IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9WFd2b0AAAAASUVORK5CYII=';

const PlaceDetailScreen = ({ route, navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isSmall = windowWidth < BREAKPOINTS.medium;
  const { place } = route.params;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryHeight = useMemo(() => (isSmall ? 200 : 220), [isSmall]);
  const mapHeight = useMemo(() => (isSmall ? 200 : 240), [isSmall]);

  // Imágenes de ejemplo (en producción vendrían del lugar)
  const images = place.images || [
    { id: 1, uri: 'https://picsum.photos/400/300?random=1' },
    { id: 2, uri: 'https://picsum.photos/400/300?random=2' },
    { id: 3, uri: 'https://picsum.photos/400/300?random=3' },
  ];

  const coordinates = {
    latitude: place.latitude || 2.9273,
    longitude: place.longitude || -75.2819,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setActiveImageIndex(index);
  };

  return (
    <View style={styles.container}>
      {/* Header con botón de regreso */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Galería de imágenes */}
        <View style={[styles.galleryContainer, { height: galleryHeight }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {images.map((image, index) => (
              <Image
                key={image.id || index}
                source={{ uri: image.uri }}
                style={[styles.image, { width: windowWidth, height: galleryHeight }]}
                contentFit="cover"
                cachePolicy="disk"
                placeholder={IMAGE_PLACEHOLDER}
                transition={200}
              />
            ))}
          </ScrollView>

          {/* Indicadores de página */}
          <View style={styles.pagination}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === activeImageIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Información del lugar */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{place.name || 'Lugar sin nombre'}</Text>

          {place.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>{place.address}</Text>
            </View>
          )}

          {place.description && (
            <Text style={styles.description}>{place.description}</Text>
          )}

          {/* Mapa interactivo */}
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <View style={[styles.mapContainer, { height: mapHeight }]}>
              {Platform.OS === 'web' ? (
                <View style={styles.webMapPlaceholder}>
                  <Ionicons name="map-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.webMapText}>
                    El mapa interactivo no está disponible en web
                  </Text>
                  <Text style={styles.webMapSubtext}>
                    Usa la app móvil para ver el mapa
                  </Text>
                </View>
              ) : MapView ? (
                <MapView
                  style={styles.map}
                  initialRegion={coordinates}
                  scrollEnabled={true}
                  zoomEnabled={true}
                >
                  <Marker
                    coordinate={{
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                    }}
                    title={place.name}
                    description={place.address}
                  />
                </MapView>
              ) : null}
            </View>
          </View>

          {/* Botón de acción */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="navigate-outline" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Cómo llegar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.xl + 10,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  galleryContainer: {
    height: 220,
    position: 'relative',
  },
  image: {
    width: width,
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    backgroundColor: COLORS.white,
    width: 20,
  },
  infoContainer: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: FONT_SIZES.xxl + 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    flex: 1,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 26,
    marginBottom: SPACING.lg,
  },
  mapSection: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  webMapText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontWeight: '600',
  },
  webMapSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    minHeight: 48,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
});

export default PlaceDetailScreen;
