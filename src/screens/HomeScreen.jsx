import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  View,
  useWindowDimensions,
  ImageBackground
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ENDPOINTS } from '../config/api.config';
import api from '../services/api';
import { getPlaceArConfig } from '../services/ar';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
import { BREAKPOINTS } from '../utils/responsive';

const screenWidth = Dimensions.get('window').width;
const IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9WFd2b0AAAAASUVORK5CYII=';
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

const Card = React.memo(
  ({
    title,
    subtitle,
    meta,
    variant = 'full',
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

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, []);

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
            <View style={styles.popularFadeLayerOne} pointerEvents="none" />
            <View style={styles.popularFadeLayerTwo} pointerEvents="none" />
            <View style={styles.popularFadeLayerThree} pointerEvents="none" />
            <View style={styles.popularTopRow}>
              <View style={[styles.cardRating, styles.popularRating]}>
                <Text style={styles.cardRatingText}>★ {rating || '4.5'}</Text>
              </View>
            </View>
            <View style={styles.popularTextBlock}>
              <Text style={styles.popularTitle} numberOfLines={2}>
                {title}
              </Text>
              {meta ? (
                <View style={styles.popularMetaRow}>
                  <FontAwesome name="map-marker" size={FONT_SIZES.md} color={COLORS.white} />
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
            variant === 'compact' && styles.cardCompact,
            variant === 'wide' && styles.cardWide,
            variant === 'compact' && cardWidth ? { width: cardWidth } : null,
            variant === 'wide' && cardWidth ? { width: cardWidth } : null,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {image ? (
            <View style={styles.cardImageWrapper}>
              <Image
                source={{ uri: image }}
                style={[styles.cardImage, imageHeight ? { height: imageHeight } : null]}
                contentFit="cover"
                cachePolicy="disk"
                placeholder={IMAGE_PLACEHOLDER}
                transition={200}
              />
              <View style={styles.cardTopRow}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{badge || 'Destino'}</Text>
                </View>
              </View>
              <View style={styles.cardRating}>
                <Text style={styles.cardRatingText}>★ {rating || '4.5'}</Text>
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
              <View style={styles.cardMetaRow}>
                <FontAwesome name="map-marker" size={FONT_SIZES.md} color={COLORS.textLight} />
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    );

    if (variant === 'compact') {
      return renderCompact();
    }
    return renderDefault();
  }
);

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isSmall = windowWidth < BREAKPOINTS.medium;
  const cardCompactWidth = Math.min(windowWidth - SPACING.lg * 1.5, isSmall ? windowWidth - SPACING.md * 2 : 420);
  const cardWideWidth = isSmall ? 280 : 340;
  const detailImageHeight = windowHeight * 0.65;

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
  const [showDetailInfo, setShowDetailInfo] = useState(false);
  const imageListRef = useRef(null);
  const slideUpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoadingAll(true);
    setError('');
    try {
      const response = await api.get(ENDPOINTS.PLACES_ALL);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
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

  const openDetail = useCallback(async (item) => {
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
  }, []);

  const renderPlace = useCallback(
    ({ item, variant = 'full' }) => {
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
          cardWidth={
            variant === 'compact' ? cardCompactWidth : variant === 'wide' ? cardWideWidth : undefined
          }
          imageHeight={variant === 'compact' ? 200 : 240}
        />
      );
    },
    [openDetail, cardCompactWidth, cardWideWidth]
  );

  const emptyState = useMemo(() => {
    if (loadingAll) return null;
    return <Text style={styles.empty}>No hay lugares aún.</Text>;
  }, [loadingAll]);

  const toggleDetailInfo = () => {
    const toValue = showDetailInfo ? 0 : 1;
    setShowDetailInfo(!showDetailInfo);
    Animated.spring(slideUpAnim, {
      toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const renderImages = useCallback(
    (images) => {
      if (!images?.length) return null;
      const getItemLayout = (_, index) => ({
        length: windowWidth,
        offset: windowWidth * index,
        index,
      });

      return (
        <View style={[styles.sliderContainer, { height: detailImageHeight }]}>
          <FlatList
            ref={imageListRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={images}
            keyExtractor={(uri, idx) => `${uri}-${idx}`}
            renderItem={({ item }) => (
              <View style={{ width: windowWidth, height: detailImageHeight }}>
                <Image
                  source={{ uri: item }}
                  style={[styles.detailImage, { width: windowWidth, height: detailImageHeight }]}
                  contentFit="cover"
                  cachePolicy="disk"
                  placeholder={IMAGE_PLACEHOLDER}
                  transition={200}
                />
                {/* Información sencilla sobre la imagen */}
                <View style={styles.imageInfoOverlay}>
                  <View style={styles.imageInfoTop}>
                    <View style={styles.imageBadge}>
                      <Text style={styles.imageBadgeText}>{selectedPlace?.categoryName || 'Destino'}</Text>
                    </View>
                    <Text style={styles.imageCounter}>{imageIndex + 1}/{images.length}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.moreInfoButton}
                    onPress={toggleDetailInfo}
                  >
                    <Text style={styles.moreInfoText}>
                      {showDetailInfo ? '▼ Ocultar detalles' : '▲ Ver más detalles'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            getItemLayout={getItemLayout}
            windowSize={3}
            maxToRenderPerBatch={3}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
              setImageIndex(idx);
            }}
          />
          {images.length > 1 ? (
            <View style={styles.sliderDots}>
              {images.map((_, idx) => (
                <View key={idx} style={[styles.dot, imageIndex === idx && styles.dotActive]} />
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

          {/* Panel de información detallada deslizable */}
          <Animated.View
            style={[
              styles.detailInfoPanel,
              {
                transform: [
                  {
                    translateY: slideUpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
                opacity: slideUpAnim,
              },
            ]}
          >
            <View style={styles.detailInfoContent}>
              <Text style={styles.detailInfoTitle}>{selectedPlace?.name}</Text>
              <Text style={styles.detailInfoDescription}>
                {selectedPlace?.description || 'Sin descripción disponible'}
              </Text>
              <View style={styles.detailInfoStats}>
                <View style={styles.detailInfoStat}>
                  <Text style={styles.detailInfoStatIcon}>⭐</Text>
                  <Text style={styles.detailInfoStatText}>{selectedPlace?.rating || '4.5'}</Text>
                </View>
                <View style={styles.detailInfoStat}>
                  <FontAwesome name="map-marker" size={FONT_SIZES.lg} color={COLORS.text} />
                  <Text style={styles.detailInfoStatText}>{selectedPlace?.city || selectedPlace?.province || 'Huila'}</Text>
                </View>
                {selectedPlace?.distanceMeters && (
                  <View style={styles.detailInfoStat}>
                    <Text style={styles.detailInfoStatIcon}>🚶</Text>
                    <Text style={styles.detailInfoStatText}>{selectedPlace.distanceMeters.toFixed(0)} m</Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      );
    },
    [detailImageHeight, imageIndex, windowWidth, showDetailInfo, slideUpAnim, selectedPlace]
  );

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
        refreshControl={<RefreshControl refreshing={loadingAll} onRefresh={loadAll} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.locationLabel}>Explora</Text>
              <Text style={styles.locationValue}>Cerca de ti</Text>
            </View>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {/* TODO: Navigate to login */}}
            >
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            </TouchableOpacity>
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
          <View style={[styles.sectionHeader, styles.sectionText]}>
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
              snapToInterval={cardCompactWidth + SPACING.md}
              decelerationRate="fast"
              snapToAlignment="start"
              getItemLayout={(_, index) => ({
                length: cardCompactWidth + SPACING.md,
                offset: (cardCompactWidth + SPACING.md) * index,
                index,
              })}
              windowSize={5}
              maxToRenderPerBatch={5}
              initialNumToRender={6}
              removeClippedSubviews
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTag}>Catálogo</Text>
            <Text style={styles.sectionTitle}>Todos los lugares</Text>
          </View>
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
              snapToInterval={cardWideWidth + SPACING.md}
              decelerationRate="fast"
              snapToAlignment="start"
              getItemLayout={(_, index) => ({
                length: cardWideWidth + SPACING.md,
                offset: (cardWideWidth + SPACING.md) * index,
                index,
              })}
              windowSize={5}
              maxToRenderPerBatch={5}
              initialNumToRender={6}
              removeClippedSubviews
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
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
  loginButton: {
    backgroundColor: '#5B3CF0',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    shadowColor: '#5B3CF0',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  loginButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZES.sm,
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
    minHeight: 48,
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
    minHeight: 46,
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
    minHeight: 46,
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
    paddingVertical: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sectionText: {
    paddingHorizontal: SPACING.lg,
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
    padding: SPACING.lg,
    borderRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
  },
  cardCompact: {
    width: 300,
    marginBottom: 0,
  },
  cardWide: {
    width: 340,
  },
  cardImageWrapper: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.border,
  },
  cardTopRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBadge: {
    backgroundColor: 'rgba(91, 60, 240, 0.9)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  cardBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  cardBookmark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bookmarkIcon: {
    color: '#E94057',
    fontSize: FONT_SIZES.lg,
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
    gap: SPACING.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
  },
  cardSubtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
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
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cardMetaIcon: {
    fontSize: FONT_SIZES.md,
  },
  cardMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    flex: 1,
  },
  popularCard: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 360,
    backgroundColor: COLORS.border,
  },
  popularImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  popularImageRadius: {
    borderRadius: 24,
  },
  popularFadeLayerOne: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  popularFadeLayerTwo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  popularFadeLayerThree: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  popularTopRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  popularRating: {
    position: 'relative',
    bottom: undefined,
    left: undefined,
    right: 0,
    top: 0,
  },
  popularTextBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  popularTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
  },
  popularMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  popularMeta: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    flex: 1,
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
    height: 220,
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
  imageInfoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  imageInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageBadge: {
    backgroundColor: 'rgba(91, 60, 240, 0.95)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  imageBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  imageCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  moreInfoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  moreInfoText: {
    color: '#5B3CF0',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  detailInfoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  detailInfoContent: {
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  detailInfoTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  detailInfoDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    lineHeight: 24,
  },
  detailInfoStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  detailInfoStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#F7F8FD',
    padding: SPACING.md,
    borderRadius: 16,
  },
  detailInfoStatIcon: {
    fontSize: FONT_SIZES.xl,
  },
  detailInfoStatText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
});

export default HomeScreen;
