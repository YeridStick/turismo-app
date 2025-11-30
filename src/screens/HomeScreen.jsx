import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ENDPOINTS } from '../config/api.config';
import api from '../services/api';
import { getPlaceArConfig } from '../services/ar';
import DataCacheService from '../services/DataCacheService'; // Importar servicio de caché
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

const screenWidth = Dimensions.get('window').width;
const distanceOptions = [1, 2, 5, 10, 20, 50];
const categoriesList = [
  { id: 'todos', name: 'Todos' },
  { id: 1, name: 'Mirador' },
  { id: 2, name: 'Museo' },
  { id: 3, name: 'Cascada' },
  { id: 4, name: 'Desierto' },
  { id: 5, name: 'Parque' },
];

const navTabs = [
  { id: 'todos', label: 'Todos' },
  { id: 1, label: 'Mirador' },
  { id: 2, label: 'Museo' },
  { id: 3, label: 'Cascada' },
  { id: 4, label: 'Desierto' },
  { id: 5, label: 'Parque' },
];

const Card = ({
  title,
  subtitle,
  meta,
  variant = 'full',
  image,
  onPress,
  badge,
  rating,
  distance,
}) => {
  return (
    <Pressable
      style={[styles.card, variant === 'compact' && styles.cardCompact, variant === 'wide' && styles.cardWide]}
      onPress={onPress}
    >
      {image ? (
        <View style={styles.cardImageWrapper}>
          <Image source={{ uri: image }} style={styles.cardImage} contentFit="cover" />
          <View style={styles.cardTopRow}>
            <Text style={styles.cardBadge}>{badge || 'Destino'}</Text>
            <TouchableOpacity style={styles.cardBookmark} onPress={onPress}>
              <Text style={styles.bookmarkIcon}>S</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cardRating}>
            <Text style={styles.cardRatingText}>* {rating || '4.5'}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          {distance ? <Text style={styles.cardDistance}>{distance}</Text> : null}
        </View>
        {subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const Footer = () => {
  const socialIcons = [
    { name: 'facebook', url: '#' },
    { name: 'instagram', url: '#' },
    { name: 'twitter', url: '#' },
    { name: 'youtube-play', url: '#' },
  ];
  const legalLinks = ['Términos de Servicio', 'Privacidad', 'Cookies'];

  return (
    <View style={styles.footer}>
      <View style={styles.footerHeader}>
        <View style={styles.footerLogoBox}>
          <FontAwesome name="globe" size={20} color={COLORS.white} />
        </View>
        <View>
          <Text style={styles.footerTitle}>Turismo Huila</Text>
          <Text style={styles.footerSubtitle}>
            Descubre la magia del Huila. Naturaleza, cultura y aventura en un solo destino.
          </Text>
        </View>
      </View>

      <View style={styles.footerSocialRow}>
        {socialIcons.map((icon) => (
          <TouchableOpacity key={icon.name} style={styles.footerSocialButton}>
            <FontAwesome name={icon.name} size={16} color={COLORS.white} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footerColumns}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerHeading}>Contacto</Text>
          <View style={styles.footerContactRow}>
            <FontAwesome name="envelope" size={16} color="#7C8EEB" />
            <View>
              <Text style={styles.footerContactLabel}>Email</Text>
              <Text style={styles.footerContactValue}>info@turismohuila.com</Text>
            </View>
          </View>
          <View style={styles.footerContactRow}>
            <FontAwesome name="phone" size={16} color="#7C8EEB" />
            <View>
              <Text style={styles.footerContactLabel}>Teléfono</Text>
              <Text style={styles.footerContactValue}>+57 (8) 123 4567</Text>
            </View>
          </View>
          <View style={styles.footerContactRow}>
            <FontAwesome name="map-marker" size={16} color="#7C8EEB" />
            <View>
              <Text style={styles.footerContactLabel}>Ubicación</Text>
              <Text style={styles.footerContactValue}>Neiva, Huila, Colombia</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footerDivider} />
      <View style={styles.footerBottomRow}>
        <Text style={styles.footerBottomText}>© 2025 Turismo Huila. Todos los derechos reservados.</Text>
        <View style={styles.footerLegalRow}>
          {legalLinks.map((item) => (
            <Text key={item} style={styles.footerLegalText}>
              {item}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const [places, setPlaces] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [popular, setPopular] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [distanceKm, setDistanceKm] = useState(2);
  const [activeTab, setActiveTab] = useState('places');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [coords, setCoords] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [arVisible, setArVisible] = useState(false);
  const imageListRef = useRef(null);

  useEffect(() => {
    loadAll(false); // Carga inicial usa caché si existe
  }, []);

  const loadAll = async (forceRefresh = false) => {
    setLoadingAll(true);
    setError('');
    try {
      // Usamos el servicio de caché en lugar de llamar a la API directamente
      const data = await DataCacheService.getPlaces(forceRefresh);

      setPlaces(data);
      setPopular(data.slice(0, 6));
      setRecommended(data.slice(6, 12));
    } catch (err) {
      setError('No se pudo cargar el catálogo.');
    } finally {
      setLoadingAll(false);
    }
  };

  const ensureLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permiso de ubicación denegado.');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({});
    return loc.coords;
  };

  const performSearch = async () => {
    setLoadingAll(true);
    setError('');
    try {
      let coordsData = coords;
      if (!coordsData && distanceKm > 0) {
        coordsData = await ensureLocation();
        if (coordsData) setCoords(coordsData);
      }
      const response = await api.get(ENDPOINTS.PLACES_SEARCH, {
        params: {
          q: query.trim() || undefined,
          categoryId: selectedCategory !== 'todos' ? selectedCategory : undefined,
          lat: coordsData?.latitude,
          lng: coordsData?.longitude,
          radiusMeters: coordsData ? distanceKm * 1000 : undefined,
        },
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setPopular(data.slice(0, 6));
    } catch (err) {
      setError('No se pudo realizar la búsqueda.');
    } finally {
      setLoadingAll(false);
      setFiltersVisible(false);
    }
  };

  const loadNearby = async () => {
    setLoadingNearby(true);
    setError('');
    try {
      const coordsData = await ensureLocation();
      if (!coordsData) {
        setLoadingNearby(false);
        return;
      }
      setCoords(coordsData);
      const params = {
        lat: coordsData.latitude,
        lng: coordsData.longitude,
        radiusMeters: distanceKm * 1000,
        limit: 12,
      };
      const response = await api.get(ENDPOINTS.PLACES_NEARBY, { params });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setNearby(data);
    } catch (err) {
      setError('No se pudo cargar lugares cercanos.');
    } finally {
      setLoadingNearby(false);
    }
  };

  const filteredPopular = useMemo(() => {
    if (selectedCategory === 'todos') return popular;
    return popular.filter((item) => item.categoryId === selectedCategory);
  }, [popular, selectedCategory]);

  const filteredRecommended = useMemo(() => {
    if (selectedCategory === 'todos') return recommended;
    return recommended.filter((item) => item.categoryId === selectedCategory);
  }, [recommended, selectedCategory]);

  const openDetail = async (item) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setImageIndex(0);
    try {
      if (item?.id) {
        const response = await api.get(ENDPOINTS.PLACE_DETAIL(item.id));
        const data = response.data?.data || response.data || item;
        setSelectedPlace(data);
      } else {
        setSelectedPlace(item);
      }
    } catch (err) {
      setSelectedPlace(item);
    } finally {
      setDetailLoading(false);
    }
  };

  const renderPlace = ({ item, variant = 'full' }) => {
    const image =
      Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls[0] : null;
    const distanceText =
      item.distanceMeters && item.distanceMeters > 0
        ? `${item.distanceMeters?.toFixed?.(0)} m`
        : null;
    return (
      <Card
        title={item.name || 'Lugar sin nombre'}
        subtitle={item.description || 'Sin descripción'}
        meta={item.address || item.city || 'Ubicación no disponible'}
        image={image}
        onPress={() => openDetail(item)}
        variant={variant}
        badge={item.categoryName || 'Popular'}
        rating={item.rating || item.score || '4.5'}
        distance={distanceText}
      />
    );
  };

  const emptyState = useMemo(() => {
    if (loadingAll) return null;
    return <Text style={styles.empty}>No hay lugares aún.</Text>;
  }, [loadingAll]);

  const renderImages = (images) => {
    if (!images?.length) return null;
    return (
      <View style={styles.sliderContainer}>
        <FlatList
          ref={imageListRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={images}
          keyExtractor={(uri, idx) => `${uri}-${idx}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.detailImage} contentFit="cover" />
          )}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setImageIndex(idx);
          }}
        />
        {images.length > 1 ? (
          <View style={styles.sliderDots}>
            {images.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, imageIndex === idx && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}
        {images.length > 1 ? (
          <View style={styles.sliderButtons}>
            <TouchableOpacity
              style={styles.sliderNav}
              onPress={() => {
                const next = Math.max(imageIndex - 1, 0);
                setImageIndex(next);
                imageListRef.current?.scrollToIndex({ index: next, animated: true });
              }}
            >
              <Text style={styles.sliderNavText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sliderNav}
              onPress={() => {
                const next = Math.min(imageIndex + 1, images.length - 1);
                setImageIndex(next);
                imageListRef.current?.scrollToIndex({ index: next, animated: true });
              }}
            >
              <Text style={styles.sliderNavText}>›</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const mapUrl = selectedPlace?.lat && selectedPlace?.lng
    ? `https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`
    : null;
  const arConfig = getPlaceArConfig(selectedPlace);
  const arUrl = arConfig?.arUrl;
  const arQr = arConfig?.qrUrl;
  const platformArUrl =
    Platform.OS === 'ios'
      ? arConfig?.iosQuicklookUrl || arUrl
      : arConfig?.sceneViewerIntent || arConfig?.sceneViewerUrl || arUrl;

  const openNativeAR = async () => {
    // Navegar a la pantalla AR nativa usando ViroReact
    if (navigation?.navigate) {
      navigation.navigate('ARView', {
        modelUrl: arConfig?.modelUrl || arConfig?.iosModelUrl || platformArUrl
      });
    }
  };

  const renderArWebView = () => {
    if (!arUrl) return null;
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
          <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
          <style>html,body{margin:0;padding:0;height:100%;background:#0b1021;} model-viewer{width:100%;height:100%;}</style>
        </head>
        <body>
          <model-viewer src="${arConfig?.modelUrl || arUrl}" ios-src="${arConfig?.iosModelUrl || ''}"
            ar ar-modes="webxr scene-viewer quick-look" camera-controls auto-rotate shadow-intensity="1" exposure="1"
            style="width:100%;height:100%;">
          </model-viewer>
        </body>
      </html>`;
    const handleShouldStartLoad = (event) => {
      const url = event?.url || '';
      if (Platform.OS === 'android' && url.startsWith('intent://')) {
        const fallback = arConfig?.sceneViewerUrl || arUrl;
        if (fallback) {
          Linking.openURL(fallback).catch(() => { });
        }
        return false;
      }
      return true;
    };

    return (
      <Modal visible={arVisible} animationType="slide" onRequestClose={() => setArVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity style={styles.arClose} onPress={() => setArVisible(false)}>
            <Text style={styles.arCloseText}>Cerrar</Text>
          </TouchableOpacity>
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            allowsInlineMediaPlayback
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState
            onShouldStartLoadWithRequest={handleShouldStartLoad}
          />
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="height">
      <ScrollView
        refreshControl={<RefreshControl refreshing={loadingAll} onRefresh={() => loadAll(true)} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.locationLabel}>Explora</Text>
              <Text style={styles.locationValue}>Cerca de ti</Text>
            </View>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=60',
              }}
              style={styles.avatar}
              contentFit="cover"
            />
          </View>



          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabs}
          >
            {categoriesList.map((chip) => (
              <TouchableOpacity
                key={chip.id}
                style={[styles.categoryTab, selectedCategory === chip.id && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(chip.id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === chip.id && styles.categoryTabTextActive,
                  ]}
                >
                  {chip.name}
                </Text>
                {selectedCategory === chip.id ? <View style={styles.categoryIndicator} /> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.searchCard}>
            <Text style={styles.heroTitle}>Descubre lugares increíbles</Text>
            <Text style={styles.heroSubtitle}>
              Ajusta filtros y desliza para ver los sitios destacados.
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                placeholder="¿A dónde quieres ir?"
                placeholderTextColor={COLORS.textLight}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={performSearch}
                style={styles.searchInput}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchIconButton} onPress={performSearch}>
                <Text style={styles.searchIcon}>IR</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchActions}>
              <TouchableOpacity style={styles.filterButton} onPress={() => setFiltersVisible(true)}>
                <Text style={styles.filterButtonText}>Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchButton} onPress={performSearch}>
                <Text style={styles.searchButtonText}>Explorar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>200+</Text>
                <Text style={styles.statLabel}>Destinos</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>500+</Text>
                <Text style={styles.statLabel}>Experiencias</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>50K+</Text>
                <Text style={styles.statLabel}>Visitantes</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTag}>Destinos Populares</Text>
              <Text style={styles.sectionTitle}>Desliza para inspirarte</Text>
            </View>
            <Text style={styles.sectionLink}>Ver todo</Text>
          </View>

          {loadingAll ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : (
            <FlatList
              horizontal
              data={filteredPopular}
              keyExtractor={(item, idx) => `${item.id || idx}-popular`}
              renderItem={({ item }) => renderPlace({ item, variant: 'compact' })}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={220}
              decelerationRate="fast"
              snapToAlignment="start"
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTag}>Catálogo</Text>
          <Text style={styles.sectionTitle}>Todos los lugares</Text>
          {loadingAll ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : (
            <>
              {emptyState}
              <FlatList
                horizontal
                data={places}
                keyExtractor={(item, idx) => `${item.id || idx}-all`}
                renderItem={({ item }) => renderPlace({ item, variant: 'wide' })}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                snapToInterval={260}
                decelerationRate="fast"
                snapToAlignment="start"
              />
            </>
          )}
        </View>
        <Footer />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Modal filtros */}
      <Modal
        visible={filtersVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Configura tu búsqueda</Text>
              <Text style={[styles.modalSubtitle, { marginTop: SPACING.xs }]}>Distancia</Text>
              <View style={styles.quickRow}>
                {distanceOptions.map((km) => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.quickChip, distanceKm === km && styles.quickChipActive]}
                    onPress={() => setDistanceKm(km)}
                  >
                    <Text
                      style={[styles.quickChipText, distanceKm === km && styles.quickChipTextActive]}
                    >
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Slider
                style={{ width: '100%', height: 40, marginTop: SPACING.sm }}
                minimumValue={1}
                maximumValue={50}
                step={0.5}
                minimumTrackTintColor="#7B5BFF"
                maximumTrackTintColor={COLORS.border}
                thumbTintColor="#7B5BFF"
                value={distanceKm}
                onValueChange={setDistanceKm}
              />
              <Text style={styles.sliderValue}>Radio personalizado: {distanceKm.toFixed(1)} km</Text>

              <Text style={styles.modalHint}>
                Ajusta la distancia para refinar lugares cercanos. Las categorías se seleccionan arriba.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalSecondary} onPress={() => setFiltersVisible(false)}>
                  <Text style={styles.modalSecondaryText}>Cerrar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalPrimary} onPress={performSearch}>
                  <Text style={styles.modalPrimaryText}>Aplicar filtros</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal detalle */}
      <Modal visible={detailVisible} animationType="slide">
        <ScrollView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTag}>Selección activa</Text>
            {selectedPlace?.categoryId ? (
              <Text style={styles.detailTagSecondary}>Categoría {selectedPlace.categoryId}</Text>
            ) : null}
            <Pressable style={styles.closeButton} onPress={() => setDetailVisible(false)}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          {detailLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.md }} />
          ) : (
            <>
              {renderImages(
                Array.isArray(selectedPlace?.imageUrls) ? selectedPlace.imageUrls : []
              )}
              <View style={styles.detailCard}>
                <View style={styles.detailTitleRow}>
                  <View>
                    <Text style={styles.detailTitle}>{selectedPlace?.name || 'Lugar'}</Text>
                    <Text style={styles.detailLocation}>
                      {selectedPlace?.address || 'Ubicación no disponible'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.cardBookmark} onPress={() => setDetailVisible(false)}>
                    <Text style={styles.bookmarkIcon}>S</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.detailSubtitle}>
                  {selectedPlace?.description || 'Descripción no disponible.'}
                </Text>

                <View style={styles.infoRow}>
                  <View style={styles.infoPill}>
                    <Text style={styles.infoLabel}>Ubicación</Text>
                    <Text style={styles.infoValue}>{selectedPlace?.city || selectedPlace?.province || 'Cerca de ti'}</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Text style={styles.infoLabel}>Coordenadas</Text>
                    <Text style={styles.infoValue}>
                      {selectedPlace?.lat && selectedPlace?.lng
                        ? `${selectedPlace.lat}, ${selectedPlace.lng}`
                        : 'No disponibles'}
                    </Text>
                  </View>
                </View>

                {selectedPlace?.distanceMeters ? (
                  <Text style={styles.distanceText}>
                    Distancia aproximada: {selectedPlace.distanceMeters?.toFixed?.(0)} m
                  </Text>
                ) : null}
              </View>

              {mapUrl ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => Linking.openURL(mapUrl)}
                >
                  <Text style={styles.actionButtonText}>Abrir en Google Maps</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.actionButtonAlt} onPress={() => setDetailVisible(false)}>
                <Text style={styles.actionButtonAltText}>Ver mapa interactivo</Text>
              </TouchableOpacity>
              {platformArUrl ? (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={openNativeAR}>
                    <Text style={styles.actionButtonText}>
                      Ver en Realidad Aumentada
                    </Text>
                  </TouchableOpacity>
                  {arQr ? (
                    <View style={styles.qrContainer}>
                      <Text style={styles.qrLabel}>Escanea para abrir en AR</Text>
                      <Image source={{ uri: arQr }} style={styles.qrImage} contentFit="contain" />
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </Modal>
      {renderArWebView()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5FB',
  },
  pageHeader: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    backgroundColor: '#E9EDFF',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: SPACING.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationLabel: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  locationValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E3E6FF',
    borderRadius: 18,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  tabItem: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#5B3CF0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tabText: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#5B3CF0',
  },
  tabIndicator: {
    marginTop: 6,
    height: 3,
    width: 28,
    backgroundColor: '#5B3CF0',
    borderRadius: 12,
  },
  categoryTabs: {
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  categoryTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginRight: SPACING.sm,
  },
  categoryTabActive: {
    borderColor: '#5B3CF0',
    backgroundColor: '#F2EEFF',
  },
  categoryTabText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: '#5B3CF0',
  },
  categoryIndicator: {
    marginTop: 6,
    height: 3,
    width: 28,
    backgroundColor: '#5B3CF0',
    borderRadius: 12,
    alignSelf: 'center',
  },
  heroTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  heroSubtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  searchCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 18,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    backgroundColor: '#F7F8FD',
  },
  searchIconButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#5B3CF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: COLORS.white,
    fontWeight: '700',
  },
  searchActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#5B3CF0',
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  searchButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  heroStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: '#F7F8FD',
    padding: SPACING.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.sm,
  },
  secondaryButton: {
    backgroundColor: '#7B5BFF',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
  },
  statNumber: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sectionTag: {
    alignSelf: 'flex-start',
    color: '#7B5BFF',
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionLink: {
    color: '#5B3CF0',
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  loader: {
    marginTop: SPACING.md,
  },
  list: {
    gap: SPACING.sm,
  },
  horizontalList: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
  },
  cardCompact: {
    width: 220,
    marginBottom: 0,
  },
  cardWide: {
    width: 260,
  },
  cardImageWrapper: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  cardImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.border,
  },
  cardTopRow: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBadge: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    color: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: FONT_SIZES.xs,
  },
  cardBookmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkIcon: {
    color: '#E94057',
    fontWeight: '700',
  },
  cardRating: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardRatingText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  cardBody: {
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  cardDistance: {
    color: '#5B3CF0',
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  chipRow: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  chipColumn: {
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7D8E0',
    backgroundColor: COLORS.white,
    minWidth: 140,
  },
  chipActive: {
    backgroundColor: '#EEEBFF',
    borderColor: '#5B3CF0',
  },
  chipText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  chipTextActive: {
    color: '#5B3CF0',
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipActive: {
    backgroundColor: '#EAE6FF',
    borderColor: '#7B5BFF',
  },
  quickChipText: {
    color: COLORS.text,
  },
  quickChipTextActive: {
    color: '#5B3CF0',
    fontWeight: 'bold',
  },
  sliderValue: {
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  empty: {
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  footer: {
    marginTop: SPACING.lg,
    backgroundColor: '#0c1325',
    borderRadius: 18,
    borderBottomEndRadius: 0,
    borderBottomStartRadius: 0,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  footerHeader: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  footerLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#5B3CF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerTitle: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZES.lg,
  },
  footerSubtitle: {
    color: '#a5b1d6',
    marginTop: 2,
  },
  footerSocialRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  footerSocialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  footerColumns: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  footerHeading: {
    color: COLORS.white,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  footerLink: {
    color: '#d7def1',
    marginBottom: SPACING.xs,
  },
  footerContactRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  footerContactLabel: {
    color: COLORS.white,
    fontWeight: '700',
  },
  footerContactValue: {
    color: '#a5b1d6',
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  footerBottomRow: {
    gap: SPACING.sm,
  },
  footerBottomText: {
    color: '#a5b1d6',
    fontSize: FONT_SIZES.xs,
  },
  footerLegalRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  footerLegalText: {
    color: '#d7def1',
    fontSize: FONT_SIZES.xs,
  },
  arClose: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  arCloseText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.error,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  secondaryButton: {
    backgroundColor: '#7B5BFF',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    maxHeight: '80%',
    width: '100%',
  },
  modalScroll: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  modalHint: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  modalPrimary: {
    flex: 1,
    backgroundColor: '#7B5BFF',
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailTag: {
    backgroundColor: '#EAE6FF',
    color: '#5B3CF0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  detailTagSecondary: {
    backgroundColor: '#E0F7EC',
    color: '#159B62',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  closeButton: {
    marginLeft: 'auto',
    backgroundColor: COLORS.border,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text,
  },
  detailCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginTop: SPACING.sm,
  },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailLocation: {
    color: COLORS.textLight,
  },
  detailSubtitle: {
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoPill: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  infoLabel: {
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    color: COLORS.text,
    fontWeight: '600',
  },
  distanceText: {
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  actionButton: {
    backgroundColor: '#7B5BFF',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  actionButtonAlt: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  actionButtonAltText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  sliderContainer: {
    position: 'relative',
    marginVertical: SPACING.md,
  },
  detailImage: {
    width: screenWidth,
    height: 240,
    borderRadius: 16,
  },
  sliderDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: '#7B5BFF',
  },
  sliderButtons: {
    position: 'absolute',
    top: '45%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  sliderNav: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderNavText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  qrLabel: {
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
});

export default HomeScreen;
