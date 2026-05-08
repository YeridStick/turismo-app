import { Image } from 'expo-image';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Animated,
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
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons, Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, PLACE_SERVICES } from '../utils/constants';
import { BREAKPOINTS } from '../utils/responsive';
import { getPlaceArConfig } from '../services/ar';
import { formatDistance } from '../utils/utils';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  // Aliases para coordenadas
  if (normalized.lat != null && normalized.latitude == null) {
    normalized.latitude = normalized.lat;
  }
  if (normalized.lng != null && normalized.longitude == null) {
    normalized.longitude = normalized.lng;
  }
  if (normalized.latitude != null && normalized.lat == null) {
    normalized.lat = normalized.latitude;
  }
  if (normalized.longitude != null && normalized.lng == null) {
    normalized.lng = normalized.longitude;
  }

  return normalized;
};

const parseFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9WFd2b0AAAAASUVORK5CYII=';

// --- NUEVO COMPONENTE: GALERÃƒÆ’Ã‚ÂA HD ---
const ImageGalleryModal = ({ visible, images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <TouchableOpacity style={styles.modalClose} onPress={onClose}>
          <Ionicons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
        
        <FlatList
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(item, idx) => `full-${idx}`}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
          }}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center' }}>
              <Image 
                source={{ uri: item.uri }} 
                style={{ width: '100%', height: '70%' }} 
                contentFit="contain"
                placeholder={IMAGE_PLACEHOLDER}
              />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
        />

        <View style={styles.modalCounter}>
          <Text style={styles.modalCounterText}>{currentIndex + 1} / {images.length}</Text>
        </View>
      </View>
    </Modal>
  );
};

// Componente para el contenido de un solo sitio
const PlaceDetailContent = React.memo(({ initialPlace, navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isSmall = windowWidth < BREAKPOINTS.medium;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullPlace, setFullPlace] = useState(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScrollViewRef = useRef(null);

  // Cargar datos detallados en segundo plano
  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      if (!initialPlace?.id) return;
      try {
        const response = await api.get(ENDPOINTS.PLACE_DETAIL(initialPlace.id));
        const data = response.data?.data || response.data;
        if (data && isMounted) {
          const normalized = normalizePlace(data);
          setFullPlace(normalized);
        }
      } catch (err) {
        console.warn("Silent fetch error:", err);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [initialPlace?.id]);

  const place = useMemo(() => {
    if (!fullPlace) return initialPlace;
    return { ...initialPlace, ...fullPlace };
  }, [initialPlace, fullPlace]);

  const images = useMemo(() => {
    if (Array.isArray(place.imageUrls) && place.imageUrls.length > 0) {
      return place.imageUrls.map((uri, id) => ({ id, uri }));
    }
    return [{ id: 'placeholder', uri: IMAGE_PLACEHOLDER }];
  }, [place.imageUrls]);

  // --- LÃƒÆ’Ã¢â‚¬Å“GICA DE AUTO-PLAY ---
  useEffect(() => {
    if (images.length <= 1 || galleryVisible) return;
    
    const interval = setInterval(() => {
      const nextIndex = (activeImageIndex + 1) % images.length;
      imageScrollViewRef.current?.scrollTo({ x: nextIndex * windowWidth, animated: true });
      setActiveImageIndex(nextIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length, activeImageIndex, galleryVisible, windowWidth]);

  const arConfig = useMemo(() => {
    if (!place) return null;
    return getPlaceArConfig(place);
  }, [place]);

  const galleryHeight = isSmall ? 200 : 220;
  
  const headerHeight = scrollY.interpolate({
    inputRange: [-galleryHeight, 0],
    outputRange: [galleryHeight * 2, galleryHeight],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-galleryHeight, 0],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-galleryHeight, 0],
    outputRange: [-galleryHeight / 2, 0],
    extrapolate: 'clamp',
  });

  const latitude = parseFiniteNumber(place?.latitude ?? place?.lat);
  const longitude = parseFiniteNumber(place?.longitude ?? place?.lng);
  const hasValidCoordinates = latitude != null && longitude != null;
  const coordinates = hasValidCoordinates
    ? {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : null;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const handleHorizontalScroll = useCallback((event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== activeImageIndex) setActiveImageIndex(index);
  }, [activeImageIndex]);

  const handleNextImage = () => {
    const nextIndex = (activeImageIndex + 1) % images.length;
    imageScrollViewRef.current?.scrollTo({ x: nextIndex * windowWidth, animated: true });
  };

  const handlePrevImage = () => {
    const prevIndex = (activeImageIndex - 1 + images.length) % images.length;
    imageScrollViewRef.current?.scrollTo({ x: prevIndex * windowWidth, animated: true });
  };

  const infoDetails = useMemo(() => {
    const details = [];
    const price = place?.price;
    const openingHours = place?.openingHours || place?.opening_hours;
    const distance = formatDistance(place?.distanceMeters);
    const phone = place?.phone || place?.contactPhone || place?.contact_phone;

    if (price != null && String(price).trim() !== "") {
      details.push({ icon: "ticket", label: "Entrada/Precio", value: `$${price}` });
    }
    if (openingHours && String(openingHours).trim() !== "") {
      details.push({ icon: "clock-o", label: "Horario", value: String(openingHours) });
    }
    if (distance && String(distance).trim() !== "") {
      details.push({ icon: "map-marker", label: "Distancia", value: String(distance) });
    }
    if (phone && String(phone).trim() !== "") {
      details.push({ icon: "phone", label: "Contacto", value: String(phone) });
    }

    return details;
  }, [place]);

  return (
    <View style={{ width: windowWidth, height: '100%' }}>
      <Animated.ScrollView 
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={styles.content}
        bounces={true}
        overScrollMode="always"
        alwaysBounceVertical={true}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Animated.View style={[
          styles.galleryContainer, 
          { 
            height: headerHeight,
            transform: [{ translateY: headerTranslateY }] 
          }
        ]}>
          <ScrollView
            ref={imageScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleHorizontalScroll}
            scrollEventThrottle={16}
            scrollEnabled={false} // Desactivamos el swipe manual para evitar conflicto con swipe de sitio
          >
            {images.map((image, index) => (
              <TouchableOpacity
                activeOpacity={0.9}
                key={image.id || index} 
                onPress={() => setGalleryVisible(true)}
                style={{ 
                  width: windowWidth, 
                  height: '100%',
                }}
              >
                <Animated.View style={{ flex: 1, transform: [{ scale: imageScale }] }}>
                  <Image
                    source={{ uri: image.uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="disk"
                    placeholder={IMAGE_PLACEHOLDER}
                    transition={200}
                  />
                </Animated.View>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
        </Animated.View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>{place.name || 'Lugar sin nombre'}</Text>

          {place.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#0E7490" />
              <Text style={styles.infoText}>{place.address}</Text>
            </View>
          )}

          {place.description && (
            <Text style={styles.description}>{place.description}</Text>
          )}
          {infoDetails.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Detalles del sitio</Text>
              {infoDetails.map((detail, idx) => (
                <View key={idx} style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <FontAwesome name={detail.icon} size={16} color="#0E7490" />
                  </View>
                  <View style={styles.detailTextWrapper}>
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
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
                        color="#0E7490" 
                      />
                      <Text style={styles.amenityText}>{service}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          {(hasValidCoordinates || arConfig?.modelUrl) && (
            <View style={styles.actionRow}>
              {hasValidCoordinates && (
                <TouchableOpacity style={[styles.actionButton, { flex: 1 }]} onPress={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
                  Linking.openURL(url);
                }}>
                  <Ionicons name="navigate-outline" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Cómo llegar</Text>
                </TouchableOpacity>
              )}

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
          )}
        </View>
      </Animated.ScrollView>

      {/* Visor HD FullScreen */}
      <ImageGalleryModal 
        visible={galleryVisible}
        images={images}
        initialIndex={activeImageIndex}
        onClose={() => setGalleryVisible(false)}
      />
    </View>
  );
});
PlaceDetailContent.displayName = 'PlaceDetailContent';

const PlaceDetailScreen = ({ route, navigation }) => {
  const { places = [], initialIndex = 0, place } = route?.params || {};
  
  const displayPlaces = useMemo(() => {
    if (places.length > 0) return places;
    if (place) return [place];
    return [];
  }, [places, place]);

  if (displayPlaces.length === 0) return null;

  return (
    <View style={styles.container}>
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

      <FlatList
        horizontal
        pagingEnabled
        data={displayPlaces}
        keyExtractor={(item) => `detail-${item.id || Math.random()}`}
        initialScrollIndex={initialIndex}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
        removeClippedSubviews={Platform.OS === 'android'}
        onScrollToIndexFailed={(info) => {
          console.warn('Scroll failed:', info);
        }}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <PlaceDetailContent initialPlace={item} navigation={navigation} />
        )}
        showsHorizontalScrollIndicator={false}
      />
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
    zIndex: 100,
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
    overflow: 'hidden',
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
    backgroundColor: COLORS.background,
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
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
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
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  arActionButton: {
    backgroundColor: "#0E7490",
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
  // ESTILOS MODAL HD
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalCounterText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ESTILOS FLECHAS SLIDER
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  arrowLeft: {
    left: 10,
  },
  arrowRight: {
    right: 10,
  },
});

export default PlaceDetailScreen;
