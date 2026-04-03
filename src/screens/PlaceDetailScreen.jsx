import { Image } from 'expo-image';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, PLACE_SERVICES } from '../utils/constants';
import { BREAKPOINTS } from '../utils/responsive';
import { getPlaceArConfig } from '../services/ar';
import { formatDistance } from '../utils/utils';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';

const getModelType = (url) => {
  if (typeof url !== "string") return null;
  const cleanUrl = url.trim().split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".usdz")) return "usdz";
  if (cleanUrl.endsWith(".glb")) return "glb";
  if (cleanUrl.endsWith(".gltf")) return "gltf";
  return null;
};

const normalizePlace = (place) => {
  if (!place || typeof place !== "object") return place;
  const normalized = { ...place };
  
  const parseUrlList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return [];
    return value
      .replace(/^\{|\}$/g, "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  if (normalized.model_3d_urls && !normalized.model3dUrls) {
    normalized.model3dUrls = parseUrlList(normalized.model_3d_urls);
  }
  if (normalized.model3dUrls && !Array.isArray(normalized.model3dUrls)) {
    normalized.model3dUrls = parseUrlList(normalized.model3dUrls);
  }
  if (normalized.image_urls && !normalized.imageUrls) {
    normalized.imageUrls = parseUrlList(normalized.image_urls);
  }
  if (normalized.imageUrls && !Array.isArray(normalized.imageUrls)) {
    normalized.imageUrls = parseUrlList(normalized.image_urls);
  }
  if (normalized.services && !Array.isArray(normalized.services)) {
    normalized.services = parseUrlList(normalized.services);
  }
  return normalized;
};

const { width } = Dimensions.get('window');

const IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9WFd2b0AAAAASUVORK5CYII=';

const PlaceDetailScreen = ({ route, navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isSmall = windowWidth < BREAKPOINTS.medium;
  const { place: initialPlace } = route?.params || {};
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullPlace, setFullPlace] = useState(null);

  // Cargar datos detallados (incluyendo modelos 3D) en segundo plano
  useEffect(() => {
    const fetchDetails = async () => {
      if (!initialPlace?.id) return;
      try {
        const response = await api.get(ENDPOINTS.PLACE_DETAIL(initialPlace.id));
        const data = response.data?.data || response.data;
        if (data) {
          const normalized = normalizePlace(data);
          setFullPlace(normalized);
        }
      } catch (err) {
        console.warn("Silent fetch error:", err);
      }
    };
    fetchDetails();
  }, [initialPlace?.id]);

  const place = useMemo(() => {
    if (!fullPlace) return initialPlace;
    // Combinar para no perder distancias y otros metadatos calculados en el home
    return { ...initialPlace, ...fullPlace };
  }, [initialPlace, fullPlace]);

  const arConfig = useMemo(() => {
    if (!place) return null;
    return getPlaceArConfig(place);
  }, [place]);

  if (!place) return null;

  const galleryHeight = isSmall ? 200 : 220;
  const mapHeight = isSmall ? 200 : 240;

  // Imágenes reales del lugar
  const images = useMemo(() => {
    if (Array.isArray(place.imageUrls) && place.imageUrls.length > 0) {
      return place.imageUrls.map((uri, id) => ({ id, uri }));
    }
    return [{ id: 'placeholder', uri: IMAGE_PLACEHOLDER }];
  }, [place.imageUrls]);

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

  const infoDetails = useMemo(() => [
    { icon: "ticket", label: "Entrada/Precio", value: place.price ? `$${place.price}` : "Acceso libre" },
    { icon: "clock-o", label: "Horario", value: place.openingHours || "08:00 AM - 05:00 PM" },
    { icon: "info-circle", label: "Servicios", value: Array.isArray(place.services) ? `${place.services.length} disponibles` : "No especificados" },
    { icon: "map-marker", label: "Distancia", value: formatDistance(place.distanceMeters) || "Cerca de ti" },
    { icon: "phone", label: "Contacto", value: place.phone || "+57 321 000 0000" },
  ], [place]);

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
              <Ionicons name="location-outline" size={18} color="#5B3CF0" />
              <Text style={styles.infoText}>{place.address}</Text>
            </View>
          )}

          {place.description && (
            <Text style={styles.description}>{place.description}</Text>
          )}

          {/* Sección de Detalles Extendida */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Detalles del sitio</Text>
            {infoDetails.map((detail, idx) => (
              <View key={idx} style={styles.detailItem}>
                <View style={styles.detailIconWrapper}>
                  <FontAwesome name={detail.icon} size={16} color="#5B3CF0" />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                  <Text style={styles.detailValue}>{detail.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* AMENITIES SECTION (Dynamic from DB) */}
          {Array.isArray(place.services) && place.services.length > 0 && (
            <View style={styles.amenitiesSection}>
              <Text style={styles.sectionTitle}>Servicios y Comodidades</Text>
              <View style={styles.amenitiesGrid}>
                {place.services.map((service, idx) => {
                  const serviceInfo = PLACE_SERVICES.find(ps => ps.label.toLowerCase() === service.toLowerCase());
                  return (
                    <View key={`amenity-${idx}`} style={styles.amenityChip}>
                      <MaterialIcons 
                        name={serviceInfo?.icon || 'check-circle'} 
                        size={18} 
                        color="#5B3CF0" 
                      />
                      <Text style={styles.amenityText}>{service}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Botones de acción */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, { flex: 1 }]} onPress={() => {
              const url = coordinates ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}` : '';
              if (url) Linking.openURL(url);
            }}>
              <Ionicons name="navigate-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Cómo llegar</Text>
            </TouchableOpacity>

            {arConfig?.modelUrl && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.arActionButton]} 
                onPress={() => {
                  navigation.navigate('ARView', { 
                    modelUrl: arConfig.modelUrl,
                    placeName: place.name 
                  });
                }}
              >
                <Ionicons name="cube-outline" size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Ver en AR</Text>
              </TouchableOpacity>
            )}
          </View>
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
  actionButton: {
    backgroundColor: "#0f172a",
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
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },
  arSection: {
    marginTop: SPACING.lg,
  },
  arPreviewContainer: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  arWebView: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  arActionButton: {
    backgroundColor: "#5B3CF0",
    flex: 1,
  },
  detailsSection: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: SPACING.md,
    borderRadius: 16,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
    marginTop: 2,
  },
  amenitiesSection: {
    marginTop: SPACING.xl,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  amenityText: {
    fontSize: 13,
    color: '#3730A3',
    fontWeight: '600',
  },
});

export default PlaceDetailScreen;
