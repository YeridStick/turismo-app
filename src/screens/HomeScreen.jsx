import { FontAwesome } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
// Map components are now loaded dynamically.
import { WebView } from "react-native-webview";
import PlaceMap from "../components/PlaceMap";
import WebViewMap from "../components/WebViewMap";
import { ENDPOINTS } from "../config/api.config";
import api from "../services/api";
import { getPlaceArConfig } from "../services/ar";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";
import { BREAKPOINTS } from "../utils/responsive";
import { formatDistance } from "../utils/utils";

const screenWidth = Dimensions.get("window").width;
const IMAGE_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9WFd2b0AAAAASUVORK5CYII=";
const MAX_DISTANCE_KM = 100; // Fácil de subir si se requiere más radio máximo
const distanceOptions = [1, 2, 5, 10, 20, 50, MAX_DISTANCE_KM];
const fallbackCenter = { latitude: 2.9386, longitude: -75.2811 }; // Centro de respaldo para evitar coords vacías
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80";

const isSameCoords = (a, b, tolerance = 0.000001) => {
  if (!a || !b) return false;
  return (
    Math.abs(a.latitude - b.latitude) < tolerance &&
    Math.abs(a.longitude - b.longitude) < tolerance
  );
};

const distanceBetweenMeters = (from, to) => {
  if (!from || !to) return Infinity;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
};
const categoriesList = [
  { id: "todos", name: "Todos" },
  { id: 1, name: "Mirador" },
  { id: 2, name: "Museo" },
  { id: 3, name: "Cascada" },
  { id: 4, name: "Desierto" },
  { id: 5, name: "Parque" },
];

const navTabs = [
  { id: "todos", label: "Todos" },
  { id: 1, label: "Mirador" },
  { id: 2, label: "Museo" },
  { id: 3, label: "Cascada" },
  { id: 4, label: "Desierto" },
  { id: 5, label: "Parque" },
];

const Card = React.memo(
  ({
    title,
    subtitle,
    meta,
    variant = "full",
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
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.8)"]}
              style={styles.popularFade}
              pointerEvents="none"
            />
            <View style={styles.popularTopRow}>
              <View style={[styles.cardRating, styles.popularRating]}>
                <Text style={styles.cardRatingText}>★ {rating || "4.5"}</Text>
              </View>
            </View>
            <View style={styles.popularTextBlock}>
              <Text style={styles.popularTitle} numberOfLines={2}>
                {title}
              </Text>
              {meta ? (
                <View style={styles.popularMetaRow}>
                  <FontAwesome
                    name="map-marker"
                    size={FONT_SIZES.md}
                    color={COLORS.white}
                  />
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
            variant === "compact" && styles.cardCompact,
            variant === "wide" && styles.cardWide,
            variant === "compact" && cardWidth ? { width: cardWidth } : null,
            variant === "wide" && cardWidth ? { width: cardWidth } : null,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {image ? (
            <View style={styles.cardImageWrapper}>
              <Image
                source={{ uri: image }}
                style={[
                  styles.cardImage,
                  imageHeight ? { height: imageHeight } : null,
                ]}
                contentFit="cover"
                cachePolicy="disk"
                placeholder={IMAGE_PLACEHOLDER}
                transition={200}
              />
              <View style={styles.cardTopRow}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{badge || "Destino"}</Text>
                </View>
              </View>
              <View style={styles.cardRating}>
                <Text style={styles.cardRatingText}>★ {rating || "4.5"}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {title}
              </Text>
              {distance ? (
                <View style={styles.cardDistanceContainer}>
                  <FontAwesome
                    name="location-arrow"
                    size={FONT_SIZES.sm}
                    color="#5B3CF0"
                  />
                  <Text style={styles.cardDistance}>{distance}</Text>
                </View>
              ) : null}
            </View>
            {subtitle ? (
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
            {meta ? (
              <View style={styles.cardMetaRow}>
                <FontAwesome
                  name="map-marker"
                  size={FONT_SIZES.md}
                  color={COLORS.textLight}
                />
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    );

    if (variant === "compact") {
      return renderCompact();
    }
    return renderDefault();
  }
);

const Footer = () => {
  const socialIcons = [
    { name: "facebook", url: "#" },
    { name: "instagram", url: "#" },
    { name: "twitter", url: "#" },
    { name: "youtube-play", url: "#" },
  ];
  const legalLinks = ["Términos de Servicio", "Privacidad", "Cookies"];

  return (
    <View style={styles.footer}>
      <View style={styles.footerHeader}>
        <View style={styles.footerLogoBox}>
          <FontAwesome name="globe" size={20} color={COLORS.white} />
        </View>
        <View>
          <Text style={styles.footerTitle}>Turismo Huila</Text>
          <Text style={styles.footerSubtitle}>
            Descubre la magia del Huila. Naturaleza, cultura y aventura en un
            solo destino.
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
              <Text style={styles.footerContactValue}>
                info@turismohuila.com
              </Text>
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
              <Text style={styles.footerContactValue}>
                Neiva, Huila, Colombia
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footerDivider} />
      <View style={styles.footerBottomRow}>
        <Text style={styles.footerBottomText}>
          © 2025 Turismo Huila. Todos los derechos reservados.
        </Text>
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
  const cardCompactWidth = Math.max(Math.min(windowWidth * 0.55, 280), 190);
  const cardWideWidth = isSmall ? 280 : 340;
  const statusBarHeight = StatusBar.currentHeight || 0;
  const reservedTop = statusBarHeight + SPACING.lg * 2; // header + chips
  const detailImageHeight = Math.max(windowHeight - reservedTop, windowHeight * 0.9);

  const [places, setPlaces] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [popular, setPopular] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [distanceKm, setDistanceKm] = useState(5); // Aumentado de 2 a 5 km para mostrar más lugares
  const [activeTab, setActiveTab] = useState("places");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [coords, setCoords] = useState(null);
  const [nearbyCache, setNearbyCache] = useState({
    radiusKm: 0,
    coords: null,
    data: [],
    categoryId: null,
  });
  const [maxDistanceKm, setMaxDistanceKm] = useState(MAX_DISTANCE_KM);
  const [imageIndex, setImageIndex] = useState(0);
  const [arVisible, setArVisible] = useState(false);
  const [mapInteractiveVisible, setMapInteractiveVisible] = useState(false); // Nuevo estado para mapa interactivo
  const [showDetailInfo, setShowDetailInfo] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isInteractingWithMap, setIsInteractingWithMap] = useState(false);
  const imageListRef = useRef(null);
  const slideUpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAll();
    loadPopular();
  }, []);

  // Load nearby places when distance or category changes
  useEffect(() => {
    if (coords) {
      loadNearby();
    }
  }, [distanceKm, selectedCategory]);

  const handleMapTouchStart = useCallback(
    () => setIsInteractingWithMap(true),
    []
  );
  const handleMapTouchEnd = useCallback(
    () => setIsInteractingWithMap(false),
    []
  );

  const loadAll = async () => {
    setLoadingAll(true);
    setError("");
    try {
      // Always load ALL places for the "Todos los lugares" section
      const response = await api.get(ENDPOINTS.PLACES_ALL);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setPlaces(data);
      setRecommended(data.slice(6, 20)); // Show items 7-20 in recommended
    } catch (err) {
      setError("No se pudo cargar el catálogo.");
    } finally {
      setLoadingAll(false);
    }
  };

  const loadPopular = async () => {
    setError("");
    try {
      // Get location for nearby places
      let coordsData = coords;
      if (!coordsData) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          try {
            const loc = await Location.getCurrentPositionAsync({});
            coordsData = loc.coords;
            setCoords(coordsData);
          } catch (err) {
            // Location failed, fallback to all places for popular section
            const response = await api.get(ENDPOINTS.PLACES_ALL);
            const data = Array.isArray(response.data)
              ? response.data
              : response.data?.data || [];
            setPopular(data.slice(0, 10));
            return;
          }
        } else {
          // No location permission, fallback to all places
          const response = await api.get(ENDPOINTS.PLACES_ALL);
          const data = Array.isArray(response.data)
            ? response.data
            : response.data?.data || [];
          setPopular(data.slice(0, 10));
          return;
        }
      }

      // Load nearby places with user's current distance preference
      const response = await api.get(ENDPOINTS.PLACES_NEARBY, {
        params: {
          lat: coordsData.latitude,
          lng: coordsData.longitude,
          radiusMeters: distanceKm * 1000, // Use user's distance preference
          limit: 50, // Aumentado de 20 a 50 para consistencia
        },
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setNearby(data); // Save to nearby instead of popular
    } catch (err) {
      setError("No se pudo cargar lugares populares.");
    }
  };

  const ensureLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Permiso de ubicación denegado.");
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({});
    return loc.coords;
  };

  const performSearch = async () => {
    setLoadingAll(true);
    setError("");
    try {
      let coordsData = coords;
      if (!coordsData && distanceKm > 0) {
        coordsData = await ensureLocation();
        if (coordsData) setCoords(coordsData);
      }
      const response = await api.get(ENDPOINTS.PLACES_SEARCH, {
        params: {
          q: query.trim() || undefined,
          categoryId:
            selectedCategory !== "todos" ? selectedCategory : undefined,
          lat: coordsData?.latitude,
          lng: coordsData?.longitude,
          radiusMeters: coordsData ? distanceKm * 1000 : undefined,
        },
      });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setSearchResults(data); // Save search results separately
      // Also refresh nearby places with current distance
      if (coordsData) {
        loadNearby();
      }
    } catch (err) {
      setError("No se pudo realizar la búsqueda.");
    } finally {
      setLoadingAll(false);
      setFiltersVisible(false);
    }
  };

  const loadNearby = async () => {
    setLoadingNearby(true);
    setError("");
    try {
      const coordsData = await ensureLocation();
      if (!coordsData) {
        setLoadingNearby(false);
        return;
      }
      if (!isSameCoords(coords, coordsData)) {
        setCoords(coordsData);
      }

      const categoryId =
        selectedCategory !== "todos" ? Number(selectedCategory) : null;

      // Si ya tenemos un radio mayor en caché y mismas coords/categoría, filtramos sin pedir a la API
      const sameCoords =
        nearbyCache.coords &&
        Math.abs(nearbyCache.coords.latitude - coordsData.latitude) < 0.0001 &&
        Math.abs(nearbyCache.coords.longitude - coordsData.longitude) < 0.0001;
      const cacheCategory = nearbyCache.categoryId ?? null;
      const canReuseCategory = cacheCategory === categoryId;

      const targetRadiusMeters = distanceKm * 1000;

      if (
        sameCoords &&
        canReuseCategory &&
        nearbyCache.radiusKm >= distanceKm &&
        nearbyCache.data.length
      ) {
        const filtered = nearbyCache.data.filter((p) => {
          const withinDistance =
            typeof p.distanceMeters === "number"
              ? p.distanceMeters <= targetRadiusMeters
              : p.lat && p.lng
              ? distanceBetweenMeters(coordsData, {
                  latitude: p.lat,
                  longitude: p.lng,
                }) <= targetRadiusMeters
              : false;
          const withinCategory =
            categoryId == null
              ? true
              : Number(p.categoryId) === Number(categoryId);
          return withinDistance && withinCategory;
        });

        // Si el filtrado deja 0 resultados, reconsultamos para no mostrar vacío por un cache viejo
        if (filtered.length > 0) {
          setNearby(filtered);
          return;
        }
      }

      const params = {
        lat: coordsData.latitude,
        lng: coordsData.longitude,
        radiusMeters: targetRadiusMeters,
        limit: 50, // Aumentado de 12 a 50 para mostrar más resultados
        categoryId: categoryId ?? undefined,
      };
      const response = await api.get(ENDPOINTS.PLACES_NEARBY, { params });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setNearby(data);
      setNearbyCache({
        radiusKm: distanceKm,
        coords: coordsData,
        data,
        categoryId,
      });
    } catch (err) {
      setError("No se pudo cargar lugares cercanos.");
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadAll(), loadPopular()]);
  };

  const filteredNearby = useMemo(() => {
    if (selectedCategory === "todos") return nearby;
    return nearby.filter(
      (item) => Number(item.categoryId) === Number(selectedCategory)
    );
  }, [nearby, selectedCategory]);

  const filteredRecommended = useMemo(() => {
    if (selectedCategory === "todos") return recommended;
    return recommended.filter(
      (item) => Number(item.categoryId) === Number(selectedCategory)
    );
  }, [recommended, selectedCategory]);

  const renderNearbyMapBlock = () => {
    const center =
      coords &&
      Number.isFinite(coords.latitude) &&
      Number.isFinite(coords.longitude)
        ? coords
        : fallbackCenter;
    const hasCoords =
      Number.isFinite(center.latitude) && Number.isFinite(center.longitude);
    const delta = Math.max(distanceKm / 111, 0.06);
    const nearbyMarkers = filteredNearby
      .filter(
        (place) => Number.isFinite(place?.lat) && Number.isFinite(place?.lng)
      )
      .map((place) => ({
        latitude: place.lat,
        longitude: place.lng,
        title: place.name,
        description:
          place.description || `${formatDistance(place.distanceMeters)}`,
      }));

    if (!hasCoords) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Cargando ubicación...</Text>
        </View>
      );
    }

    if (Platform.OS === "web") {
      return (
        <View style={styles.paddingLeft}>
          <FlatList
            horizontal
            data={filteredNearby}
            keyExtractor={(item, idx) => `${item.id || idx}-nearby-web`}
            renderItem={({ item }) => renderPlace({ item, variant: "compact" })}
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
        </View>
      );
    }

    return (
      <View style={styles.mapCard}>
        <View
          style={styles.mapTouchWrapper}
          onTouchStart={handleMapTouchStart}
          onTouchEnd={handleMapTouchEnd}
          onTouchCancel={handleMapTouchEnd}
        >
          <WebViewMap
            initialRegion={{
              latitude: center.latitude,
              longitude: center.longitude,
              latitudeDelta: delta,
              longitudeDelta: delta,
            }}
            markers={nearbyMarkers}
            userLocation={center}
            showCircle={true}
            circleRadius={distanceKm * 1000}
          />
        </View>
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.65)"]}
          style={styles.mapCardGradient}
          pointerEvents="none"
        />
        <View style={styles.mapCardOverlay}>
          <Text style={styles.mapCardTitle}>
            Lugares en mapa ({filteredNearby.length})
          </Text>
          <FlatList
            horizontal
            data={filteredNearby}
            keyExtractor={(item, idx) => `${item.id || idx}-nearby-map`}
            renderItem={({ item }) =>
              renderPlace({
                item,
                variant: "compact",
                cardWidth: cardCompactWidth,
                imageHeight: 160,
              })
            }
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapOverlayList}
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
        </View>
      </View>
    );
  };

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
    ({
      item,
      variant = "full",
      cardWidth: overrideWidth,
      imageHeight: overrideHeight,
    }) => {
      const image =
        Array.isArray(item.imageUrls) && item.imageUrls.length
          ? item.imageUrls[0]
          : null;

      // Format distance from meters using utility function
      const distanceText = formatDistance(item.distanceMeters);

      return (
        <Card
          title={item.name || "Lugar sin nombre"}
          subtitle={item.description || "Sin descripción"}
          meta={item.address || item.city || "Ubicación no disponible"}
          image={image}
          onPress={() => openDetail(item)}
          variant={variant}
          badge={item.categoryName || "Popular"}
          rating={item.rating || item.score || "4.5"}
          distance={distanceText}
          cardWidth={
            overrideWidth ??
            (variant === "compact"
              ? cardCompactWidth
              : variant === "wide"
              ? cardWideWidth
              : undefined)
          }
          imageHeight={overrideHeight ?? (variant === "compact" ? 200 : 240)}
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
      const sliderData = [
        { type: "info" },
        ...(Array.isArray(images) ? images.map((uri) => ({ type: "image", uri })) : []),
      ];
      const totalSlides = sliderData.length;
      if (!totalSlides) return null;

      const getItemLayout = (_, index) => ({
        length: windowWidth,
        offset: windowWidth * index,
        index,
      });

      const infoDetails = [
        { icon: "ticket", label: "Entrada", value: "$12.000 COP" },
        { icon: "clock-o", label: "Horario", value: "8:00 AM - 6:00 PM" },
        { icon: "info-circle", label: "Servicios", value: "Guía local, Parqueadero, Zona picnic" },
        { icon: "road", label: "Recorrido", value: "2.3 km • 1h 45m" },
        { icon: "phone", label: "Contacto", value: "+57 310 123 4567" },
      ];

      const renderInfoSlide = () => (
        <View style={[styles.infoSlide, { width: windowWidth, height: detailImageHeight }]}>
          <View style={styles.infoSlideHeader}>
            <View style={styles.infoSlideTags}>
              <View style={styles.infoSlideTagPrimary}>
                <FontAwesome name="star" size={12} color="#5B3CF0" />
                <Text style={styles.infoSlideTagText}>
                  {selectedPlace?.rating || "4.8"}
                </Text>
              </View>
              {selectedPlace?.categoryName ? (
                <View style={styles.infoSlideTagSecondary}>
                  <FontAwesome name="tag" size={12} color="#0E9F6E" />
                  <Text style={styles.infoSlideTagText}>
                    {selectedPlace.categoryName}
                  </Text>
                </View>
              ) : null}
              {selectedPlace?.distanceMeters ? (
                <View style={styles.infoSlideTagMuted}>
                  <FontAwesome name="location-arrow" size={12} color="#111827" />
                  <Text style={styles.infoSlideTagMutedText}>
                    {formatDistance(selectedPlace.distanceMeters)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.infoSlideTitle}>{selectedPlace?.name || "Lugar destacado"}</Text>
            <Text style={styles.infoSlideSubtitle} numberOfLines={2}>
              {selectedPlace?.address || "Ubicación por confirmar"}
            </Text>
            <Text style={styles.infoSlideDescription} numberOfLines={3}>
              {selectedPlace?.description ||
                "Sendero tranquilo junto al río, ideal para caminatas cortas y fotografía de naturaleza."}
            </Text>
          </View>

          <View style={styles.infoSlideGrid}>
            {infoDetails.map((item, idx) => (
              <View key={`${item.label}-${idx}`} style={styles.infoSlideCard}>
                <FontAwesome name={item.icon} size={16} color="#5B3CF0" />
                <Text style={styles.infoSlideCardLabel}>{item.label}</Text>
                <Text style={styles.infoSlideCardValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.infoSlideActions}>
            <TouchableOpacity
              style={[styles.actionButtonRow, styles.actionButtonPrimary]}
              onPress={openDirectionsFromCurrent}
              disabled={!selectedPlace?.lat || !selectedPlace?.lng}
            >
              <FontAwesome name="location-arrow" size={14} color={COLORS.white} />
              <Text style={styles.actionButtonPrimaryText}>Cómo llegar</Text>
            </TouchableOpacity>
            {platformArUrl ? (
              <TouchableOpacity
                style={[styles.actionButtonRow, styles.actionButtonSecondary]}
                onPress={openNativeAR}
              >
                <FontAwesome name="cube" size={14} color="#111827" />
                <Text style={styles.actionButtonSecondaryText}>RA</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );

      const renderImageSlide = (uri) => (
        <View style={{ width: windowWidth, height: detailImageHeight }}>
          <Image
            source={{ uri }}
            style={[
              styles.detailImage,
              { width: windowWidth, height: detailImageHeight },
            ]}
            contentFit="cover"
            cachePolicy="disk"
            placeholder={IMAGE_PLACEHOLDER}
            transition={200}
          />
          <View style={styles.imageInfoOverlay}>
            <View style={styles.imageInfoTop}>
              <View style={styles.imageBadge}>
                <Text style={styles.imageBadgeText}>
                  {selectedPlace?.categoryName || "Destino"}
                </Text>
              </View>
              <Text style={styles.imageCounter}>
                {Math.min(Math.max(imageIndex, 1), Math.max(totalSlides - 1, 1))}
                /{Math.max(totalSlides - 1, 1)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.moreInfoButton}
              onPress={toggleDetailInfo}
            >
              <Text style={styles.moreInfoText}>
                {showDetailInfo ? "▼ Ocultar detalles" : "▲ Ver más detalles"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );

      return (
        <View
          style={[
            styles.sliderContainer,
            { height: detailImageHeight, minHeight: detailImageHeight },
          ]}
        >
          <FlatList
            ref={imageListRef}
            horizontal
            pagingEnabled
            snapToInterval={windowWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingBottom: 0 }}
            showsHorizontalScrollIndicator={false}
            data={sliderData}
            keyExtractor={(item, idx) => `${item.type}-${item.uri || idx}`}
            renderItem={({ item }) =>
              item.type === "info" ? renderInfoSlide() : renderImageSlide(item.uri)
            }
            getItemLayout={getItemLayout}
            windowSize={3}
            maxToRenderPerBatch={3}
            removeClippedSubviews
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
              setImageIndex(idx);
            }}
          />
          {totalSlides > 1 ? (
            <View style={styles.sliderDots}>
              {sliderData.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, imageIndex === idx && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
          {totalSlides > 1 ? (
            <View style={styles.sliderButtons}>
              <TouchableOpacity
                style={styles.sliderNav}
                onPress={() => {
                  const next = Math.max(imageIndex - 1, 0);
                  setImageIndex(next);
                  imageListRef.current?.scrollToIndex({
                    index: next,
                    animated: true,
                  });
                }}
              >
                <Text style={styles.sliderNavText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sliderNav}
                onPress={() => {
                  const next = Math.min(imageIndex + 1, totalSlides - 1);
                  setImageIndex(next);
                  imageListRef.current?.scrollToIndex({
                    index: next,
                    animated: true,
                  });
                }}
              >
                <Text style={styles.sliderNavText}>›</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Panel de información detallada deslizable */}
          {showDetailInfo ? (
            <Pressable
              style={styles.detailInfoBackdrop}
              onPress={toggleDetailInfo}
            />
          ) : null}
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
              <View style={styles.detailInfoHeader}>
                <Text style={styles.detailInfoTitle}>
                  {selectedPlace?.name}
                </Text>
                <TouchableOpacity
                  onPress={toggleDetailInfo}
                  style={styles.detailInfoClose}
                >
                  <Text style={styles.detailInfoCloseText}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.detailInfoDescription}>
                {selectedPlace?.description || "Sin descripción disponible"}
              </Text>
              <View style={styles.detailInfoStats}>
                <View style={styles.detailInfoStat}>
                  <Text style={styles.detailInfoStatIcon}>⭐</Text>
                  <Text style={styles.detailInfoStatText}>
                    {selectedPlace?.rating || "4.5"}
                  </Text>
                </View>
                <View style={styles.detailInfoStat}>
                  <FontAwesome
                    name="map-marker"
                    size={FONT_SIZES.lg}
                    color={COLORS.text}
                  />
                  <Text style={styles.detailInfoStatText}>
                    {selectedPlace?.city || selectedPlace?.province || "Huila"}
                  </Text>
                </View>
                {selectedPlace?.distanceMeters && (
                  <View style={styles.detailInfoStat}>
                    <Text style={styles.detailInfoStatIcon}>🚶</Text>
                    <Text style={styles.detailInfoStatText}>
                      {selectedPlace.distanceMeters.toFixed(0)} m
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      );
    },
    [
      detailImageHeight,
      imageIndex,
      windowWidth,
      showDetailInfo,
      slideUpAnim,
      selectedPlace,
      platformArUrl,
      openDirectionsFromCurrent,
      openNativeAR,
    ]
  );

  const arConfig = getPlaceArConfig(selectedPlace);
  const arUrl = arConfig?.arUrl;
  const platformArUrl =
    Platform.OS === "ios"
      ? arConfig?.iosQuicklookUrl || arUrl
      : arConfig?.sceneViewerIntent || arConfig?.sceneViewerUrl || arUrl;

  const openDirectionsFromCurrent = async () => {
    if (!selectedPlace?.lat || !selectedPlace?.lng) return;
    try {
      const userCoords = coords || (await ensureLocation());
      if (!userCoords) {
        setError("No se pudo obtener tu ubicación para las rutas.");
        return;
      }
      const origin = `${userCoords.latitude},${userCoords.longitude}`;
      const destination = `${selectedPlace.lat},${selectedPlace.lng}`;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
      Linking.openURL(url);
    } catch (e) {
      setError("No se pudo abrir Google Maps.");
    }
  };

  const openNativeAR = async () => {
    // Navegar a la pantalla AR nativa usando ViroReact
    if (navigation?.navigate) {
      navigation.navigate("ARView", {
        modelUrl: arConfig?.modelUrl || arConfig?.iosModelUrl || platformArUrl,
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
          <model-viewer src="${arConfig?.modelUrl || arUrl}" ios-src="${
      arConfig?.iosModelUrl || ""
    }"
            ar ar-modes="webxr scene-viewer quick-look" camera-controls auto-rotate shadow-intensity="1" exposure="1"
            style="width:100%;height:100%;">
          </model-viewer>
        </body>
      </html>`;
    const handleShouldStartLoad = (event) => {
      const url = event?.url || "";
      if (Platform.OS === "android" && url.startsWith("intent://")) {
        const fallback = arConfig?.sceneViewerUrl || arUrl;
        if (fallback) {
          Linking.openURL(fallback).catch(() => {});
        }
        return false;
      }
      return true;
    };

    return (
      <Modal
        visible={arVisible}
        animationType="slide"
        onRequestClose={() => setArVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <TouchableOpacity
            style={styles.arClose}
            onPress={() => setArVisible(false)}
          >
            <Text style={styles.arCloseText}>Cerrar</Text>
          </TouchableOpacity>
          <WebView
            originWhitelist={["*"]}
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
        refreshControl={
          <RefreshControl refreshing={loadingAll} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isInteractingWithMap}
      >
        <View style={styles.pageHeader}>
          <ImageBackground
            source={{ uri: HERO_IMAGE }}
            style={styles.heroBackground}
            imageStyle={styles.heroImage}
          >
            <LinearGradient
              colors={[
                "rgba(46, 24, 103, 0.75)",
                "rgba(23, 102, 172, 0.55)",
                "rgba(17, 49, 93, 0.8)",
              ]}
              style={styles.heroOverlay}
            >
              <View style={styles.topBar}>
                <View>
                  <Text style={styles.locationLabel}>Explora</Text>
                  <Text style={styles.locationValue}>Cerca de ti</Text>
                </View>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => {
                    /* TODO: Navigate to login */
                  }}
                >
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  ⚡ Más de 10,000 viajeros felices
                </Text>
              </View>

              <Text style={styles.heroTitle}>Descubre la magia del Huila</Text>
              <Text style={styles.heroSubtitle}>
                Explora paisajes únicos, cultura ancestral y experiencias
                inolvidables en el corazón de Colombia.
              </Text>

              <View style={styles.searchCard}>
                <View style={styles.searchRow}>
                  <View style={styles.searchInputWrapper}>
                    <FontAwesome name="map-marker" size={18} color="#7B5BFF" />
                    <TextInput
                      placeholder="¿A dónde quieres ir?"
                      placeholderTextColor="#8C8FA5"
                      value={query}
                      onChangeText={setQuery}
                      onSubmitEditing={performSearch}
                      style={styles.searchInput}
                      returnKeyType="search"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.searchIconButton}
                    onPress={performSearch}
                  >
                    <FontAwesome name="search" size={16} color="#fff" />
                    <Text style={styles.searchIconLabel}>
                      Explorar Destinos
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.searchActions}>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setFiltersVisible(true)}
                  >
                    <Text style={styles.filterButtonText}>Filtros</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.searchButton}
                    onPress={performSearch}
                  >
                    <Text style={styles.searchButtonText}>Descubrir</Text>
                  </TouchableOpacity>
                </View>
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
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>4.9★</Text>
                  <Text style={styles.statLabel}>Satisfacción</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <Text style={styles.sectionPill}>Destinos Populares</Text>
            <Text style={styles.sectionHeroTitle}>
              Explora Lugares Increíbles
            </Text>
            <Text style={styles.sectionDescription}>
              Descubre los destinos más fascinantes del Huila, desde maravillas
              naturales hasta tesoros culturales.
            </Text>
          </View>

          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesLabel}>Categorías</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
            >
              {categoriesList.map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={[
                    styles.categoryTab,
                    selectedCategory === chip.id && styles.categoryTabActive,
                  ]}
                  onPress={() => setSelectedCategory(chip.id)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      selectedCategory === chip.id &&
                        styles.categoryTabTextActive,
                    ]}
                  >
                    {chip.name}
                  </Text>
                  {selectedCategory === chip.id ? (
                    <View style={styles.categoryIndicator} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loadingNearby ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : filteredNearby.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay lugares cercanos en este radio. Prueba aumentar la
                distancia.
              </Text>
            </View>
          ) : (
            renderNearbyMapBlock()
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionAllIntro}>
            <Text style={styles.sectionPillSecondary}>Exploración</Text>
            <Text style={styles.sectionHeroTitle}>
              Encuentra Tu Próxima Aventura
            </Text>
            <Text style={styles.sectionDescription}>
              Personaliza tu búsqueda con filtros interactivos y cambia de lugar
              en el mapa con un solo clic.
            </Text>
          </View>

          {loadingAll ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : (
            <View style={styles.paddingLeft}>
              {emptyState}
              <FlatList
                horizontal
                data={places}
                keyExtractor={(item, idx) => `${item.id || idx}-all`}
                renderItem={({ item }) =>
                  renderPlace({
                    item,
                    variant: "compact",
                    cardWidth: cardCompactWidth,
                    imageHeight: 180,
                  })
                }
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
            </View>
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
              <Text style={[styles.modalSubtitle, { marginTop: SPACING.xs }]}>
                Distancia
              </Text>
              <View style={styles.quickRow}>
                {distanceOptions.map((km) => (
                  <TouchableOpacity
                    key={km}
                    style={[
                      styles.quickChip,
                      distanceKm === km && styles.quickChipActive,
                    ]}
                    onPress={() => setDistanceKm(km)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        distanceKm === km && styles.quickChipTextActive,
                      ]}
                    >
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Slider
                style={{ width: "100%", height: 40, marginTop: SPACING.sm }}
                minimumValue={1}
                maximumValue={maxDistanceKm}
                step={0.5}
                minimumTrackTintColor="#7B5BFF"
                maximumTrackTintColor={COLORS.border}
                thumbTintColor="#7B5BFF"
                value={distanceKm}
                onValueChange={setDistanceKm}
              />
              <Text style={styles.sliderValue}>
                Radio personalizado: {distanceKm.toFixed(1)} km (máx{" "}
                {maxDistanceKm} km)
              </Text>

              <Text style={styles.modalHint}>
                Ajusta la distancia para refinar lugares cercanos. Las
                categorías se seleccionan arriba.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondary}
                  onPress={() => setFiltersVisible(false)}
                >
                  <Text style={styles.modalSecondaryText}>Cerrar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPrimary}
                  onPress={performSearch}
                >
                  <Text style={styles.modalPrimaryText}>Aplicar filtros</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal detalle */}
      <Modal visible={detailVisible} animationType="slide">
        <ScrollView
          style={styles.detailContainer}
          contentContainerStyle={[styles.detailContent, { flexGrow: 1 }]}
        >
          <View style={styles.detailHero}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTag}>Selección activa</Text>
              {selectedPlace?.categoryName ? (
                <Text style={styles.detailTagSecondary}>
                  {selectedPlace.categoryName}
                </Text>
              ) : null}
              {selectedPlace?.distanceMeters ? (
                <Text style={styles.detailTagMuted}>
                  {formatDistance(selectedPlace.distanceMeters)}
                </Text>
              ) : null}
              <Pressable
                style={styles.closeButton}
                onPress={() => setDetailVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

      {detailLoading ? (
        <ActivityIndicator
          color={COLORS.primary}
          style={{ marginTop: SPACING.md }}
        />
      ) : null}
          </View>
          {renderImages(
            Array.isArray(selectedPlace?.imageUrls)
              ? selectedPlace.imageUrls
              : []
          )}
        </ScrollView>
      </Modal>

      {/* Modal mapa de lugares cercanos */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>Lugares Cercanos</Text>
              <Text style={styles.mapSubtitle}>
                {filteredNearby.length} lugares en {distanceKm.toFixed(1)} km
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapCloseButton}
              onPress={() => setShowMap(false)}
            >
              <Text style={styles.mapCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === "web" ? (
            <View style={styles.mapEmptyState}>
              <Text style={styles.mapEmptyText}>
                El mapa no está disponible en la versión web.
              </Text>
            </View>
          ) : (
            (() => {
              const center =
                coords &&
                Number.isFinite(coords.latitude) &&
                Number.isFinite(coords.longitude)
                  ? coords
                  : fallbackCenter;
              const hasCoords =
                Number.isFinite(center.latitude) &&
                Number.isFinite(center.longitude);

              if (!hasCoords) {
                return (
                  <View style={styles.mapEmptyState}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.mapEmptyText}>
                      Cargando ubicación...
                    </Text>
                  </View>
                );
              }

              const delta = Math.max(distanceKm / 111, 0.02);
              const nearbyMarkers = filteredNearby
                .filter(
                  (place) =>
                    Number.isFinite(place?.lat) && Number.isFinite(place?.lng)
                )
                .map((place) => ({
                  latitude: place.lat,
                  longitude: place.lng,
                  title: place.name,
                  description:
                    place.description || `${formatDistance(place.distance)}`,
                }));

              return (
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
                />
              );
            })()
          )}
        </View>
      </Modal>

      {renderArWebView()}

      {/* Mapa interactivo con OpenStreetMap */}
      <PlaceMap
        visible={mapInteractiveVisible}
        onClose={() => setMapInteractiveVisible(false)}
        place={
          selectedPlace
            ? {
                id: selectedPlace.id,
                name: selectedPlace.name,
                lat: selectedPlace.lat,
                lng: selectedPlace.lng,
                address: selectedPlace.address,
              }
            : null
        }
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F5FB",
  },
  pageHeader: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    backgroundColor: "#0f1c3a",
  },
  heroBackground: {
    width: "100%",
  },
  heroImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    transform: [{ scale: 1.02 }],
  },
  heroOverlay: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  heroBadge: {
    alignSelf: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  heroBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: FONT_SIZES.sm,
  },
  locationValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.white,
  },
  loginButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  loginButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#E3E6FF",
    borderRadius: 18,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  tabItem: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
    alignItems: "center",
  },
  tabItemActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#5B3CF0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tabText: {
    color: COLORS.textLight,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#5B3CF0",
  },
  tabIndicator: {
    marginTop: 6,
    height: 3,
    width: 28,
    backgroundColor: "#5B3CF0",
    borderRadius: 12,
  },
  categoriesSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: "#F3F5FB",
  },
  categoriesLabel: {
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: SPACING.xs,
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
    borderColor: "transparent",
    backgroundColor: "rgba(255,255,255,0.85)",
    marginRight: SPACING.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  categoryTabActive: {
    borderColor: "#7B5BFF",
    backgroundColor: "#F2EEFF",
  },
  categoryTabText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  categoryTabTextActive: {
    color: "#5B3CF0",
  },
  categoryIndicator: {
    marginTop: 6,
    height: 3,
    width: 28,
    backgroundColor: "#5B3CF0",
    borderRadius: 12,
    alignSelf: "center",
  },
  heroTitle: {
    fontSize: FONT_SIZES.xl + 4,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    lineHeight: 34,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    lineHeight: 22,
    textAlign: "center",
  },
  searchCard: {
    padding: SPACING.sm,
    borderRadius: 18,
    gap: SPACING.sm,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FD",
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.md,
    minHeight: 48,
  },
  searchIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#5B3CF0",
  },
  searchIconLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
  searchActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  filterButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E8F0",
    paddingVertical: SPACING.sm,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  filterButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  searchButton: {
    flex: 1,
    backgroundColor: "#5B3CF0",
    paddingVertical: SPACING.sm,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
  },
  searchButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  heroStats: {
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    flexWrap: "wrap",
  },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingVertical: SPACING.sm,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  statLabel: {
    color: "rgba(255,255,255,0.75)",
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
    fontWeight: "bold",
    fontSize: FONT_SIZES.sm,
  },
  secondaryButton: {
    backgroundColor: "#7B5BFF",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
  },
  statNumber: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: FONT_SIZES.md,
  },
  section: {
    paddingVertical: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  sectionText: {
    paddingHorizontal: SPACING.lg,
  },
  sectionTag: {
    alignSelf: "flex-start",
    color: "#7B5BFF",
    fontWeight: "bold",
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionLink: {
    color: "#5B3CF0",
    fontWeight: "600",
  },
  sectionIntro: {
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  sectionPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: "#EEF0FF",
    color: "#5B3CF0",
    fontWeight: "700",
    borderRadius: 999,
    fontSize: FONT_SIZES.xs,
  },
  sectionPillSecondary: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: "#F2E9FF",
    color: "#7B5BFF",
    fontWeight: "700",
    borderRadius: 999,
    fontSize: FONT_SIZES.xs,
  },
  sectionHeroTitle: {
    fontSize: FONT_SIZES.lg + 4,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  sectionDescription: {
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 20,
    marginHorizontal: SPACING.lg,
  },
  sectionAllIntro: {
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
  },
  mapCard: {
    width: "100%",
    height: 620,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#E5E8F0",
    marginTop: SPACING.md,
  },
  mapTouchWrapper: {
    flex: 1,
  },
  mapCardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  mapCardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
  },
  mapCardTitle: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  mapOverlayList: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  sectionSubtitle: {
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  paddingLeft: {
    paddingLeft: SPACING.md,
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
    width: "100%",
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 24,
    borderWidth: 0,
    overflow: "hidden",
  },
  cardCompact: {
    width: 300,
    marginBottom: 0,
  },
  cardWide: {
    width: 340,
  },
  cardImageWrapper: {
    position: "relative",
    marginBottom: SPACING.sm,
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.border,
  },
  cardTopRow: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBadge: {
    backgroundColor: "rgba(91, 60, 240, 0.9)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    backdropFilter: "blur(10px)",
  },
  cardBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  cardBookmark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bookmarkIcon: {
    color: "#E94057",
    fontSize: FONT_SIZES.lg,
  },
  cardRating: {
    position: "absolute",
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardRatingText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  cardBody: {
    gap: SPACING.xs,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
    color: COLORS.text,
    flex: 1,
  },
  cardSubtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  cardDistanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardDistance: {
    color: "#5B3CF0",
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
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
    overflow: "hidden",
    height: 280,
    backgroundColor: COLORS.border,
  },
  popularImage: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  popularImageRadius: {
    borderRadius: 24,
  },
  popularFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  popularTopRow: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  popularRating: {
    position: "relative",
    bottom: undefined,
    left: undefined,
    right: 0,
    top: 0,
  },
  popularTextBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  popularTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md + 2,
    fontWeight: "800",
  },
  popularMetaRow: {
    flexDirection: "row",
    alignItems: "center",
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
    borderColor: "#D7D8E0",
    backgroundColor: COLORS.white,
    minWidth: 140,
  },
  chipActive: {
    backgroundColor: "#EEEBFF",
    borderColor: "#5B3CF0",
  },
  chipText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    textAlign: "center",
  },
  chipTextActive: {
    color: "#5B3CF0",
    fontWeight: "700",
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    backgroundColor: "#EAE6FF",
    borderColor: "#7B5BFF",
  },
  quickChipText: {
    color: COLORS.text,
  },
  quickChipTextActive: {
    color: "#5B3CF0",
    fontWeight: "bold",
  },
  sliderValue: {
    textAlign: "center",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  empty: {
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  footer: {
    marginTop: SPACING.lg,
    backgroundColor: "#0c1325",
    borderRadius: 18,
    borderBottomEndRadius: 0,
    borderBottomStartRadius: 0,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  footerHeader: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
  },
  footerLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#5B3CF0",
    alignItems: "center",
    justifyContent: "center",
  },
  footerTitle: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: FONT_SIZES.lg,
  },
  footerSubtitle: {
    color: "#a5b1d6",
    marginTop: 2,
  },
  footerSocialRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  footerSocialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  footerColumns: {
    flexDirection: "row",
    gap: SPACING.lg,
  },
  footerHeading: {
    color: COLORS.white,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  footerLink: {
    color: "#d7def1",
    marginBottom: SPACING.xs,
  },
  footerContactRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  footerContactLabel: {
    color: COLORS.white,
    fontWeight: "700",
  },
  footerContactValue: {
    color: "#a5b1d6",
  },
  footerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  footerBottomRow: {
    gap: SPACING.sm,
  },
  footerBottomText: {
    color: "#a5b1d6",
    fontSize: FONT_SIZES.xs,
  },
  footerLegalRow: {
    flexDirection: "row",
    gap: SPACING.md,
    flexWrap: "wrap",
  },
  footerLegalText: {
    color: "#d7def1",
    fontSize: FONT_SIZES.xs,
  },
  arClose: {
    position: "absolute",
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  arCloseText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  errorText: {
    color: COLORS.error,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  secondaryButton: {
    backgroundColor: "#7B5BFF",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: FONT_SIZES.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    maxHeight: "80%",
    width: "100%",
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
    fontWeight: "bold",
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  modalSecondaryText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  modalPrimary: {
    flex: 1,
    backgroundColor: "#7B5BFF",
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  modalPrimaryText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  detailContainer: {
    flex: 1,
    backgroundColor: "#EEF1F7",
  },
  detailContent: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
    minHeight: "100%",
  },
  detailHero: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.md,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailTag: {
    backgroundColor: "rgba(91, 60, 240, 0.12)",
    color: "#5B3CF0",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    fontWeight: "700",
  },
  detailTagSecondary: {
    backgroundColor: "rgba(21, 155, 98, 0.12)",
    color: "#159B62",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    fontWeight: "700",
  },
  detailTagMuted: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    color: "#111827",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    fontWeight: "600",
  },
  closeButton: {
    marginLeft: "auto",
    backgroundColor: COLORS.border,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text,
  },
  detailCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  detailTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  detailTitle: {
    fontSize: FONT_SIZES.xl + 2,
    fontWeight: "800",
    color: COLORS.text,
  },
  detailLocation: {
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  detailSubtitle: {
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  detailMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 14,
  },
  metaPillText: {
    fontWeight: "700",
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
  },
  infoRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
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
    fontWeight: "600",
  },
  distanceText: {
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  detailActionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButtonRow: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: SPACING.xs,
  },
  actionButtonPrimary: {
    backgroundColor: "#5B3CF0",
    shadowColor: "#5B3CF0",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    flex: 1,
  },
  actionButtonPrimaryText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  actionButtonSecondary: {
    backgroundColor: "#F6F7FB",
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  actionButtonSecondaryText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  actionButton: {
    backgroundColor: "#7B5BFF",
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  sliderContainer: {
    position: "relative",
    marginVertical: 0,
  },
  infoSlide: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  infoSlideHeader: {
    gap: SPACING.xs,
  },
  infoSlideTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  infoSlideTagPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(91, 60, 240, 0.12)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 14,
  },
  infoSlideTagSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(14, 159, 110, 0.12)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 14,
  },
  infoSlideTagMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 14,
  },
  infoSlideTagText: {
    fontWeight: "700",
    color: COLORS.text,
  },
  infoSlideTagMutedText: {
    fontWeight: "600",
    color: "#111827",
  },
  infoSlideTitle: {
    fontSize: FONT_SIZES.xl + 2,
    fontWeight: "800",
    color: COLORS.text,
  },
  infoSlideSubtitle: {
    color: COLORS.textLight,
  },
  infoSlideDescription: {
    color: COLORS.text,
    lineHeight: 20,
  },
  infoSlideGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  infoSlideCard: {
    width: "48%",
    backgroundColor: "#F7F8FD",
    borderRadius: 14,
    padding: SPACING.md,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  infoSlideCardLabel: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  infoSlideCardValue: {
    color: COLORS.text,
    fontWeight: "700",
  },
  infoSlideActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  detailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  sliderDots: {
    flexDirection: "row",
    justifyContent: "center",
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
    backgroundColor: "#7B5BFF",
  },
  sliderButtons: {
    position: "absolute",
    top: "45%",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.sm,
  },
  sliderNav: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderNavText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  imageInfoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    padding: SPACING.lg,
  },
  imageInfoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  imageBadge: {
    backgroundColor: "rgba(91, 60, 240, 0.95)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backdropFilter: "blur(10px)",
  },
  imageBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  imageCounter: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  moreInfoButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  moreInfoText: {
    color: "#5B3CF0",
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  detailInfoPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  detailInfoContent: {
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  detailInfoHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  detailInfoClose: {
    marginLeft: "auto",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  detailInfoCloseText: {
    fontSize: 18,
    color: COLORS.text,
  },
  detailInfoTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "800",
    color: COLORS.text,
  },
  detailInfoDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    lineHeight: 24,
  },
  detailInfoStats: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  detailInfoStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: "#F7F8FD",
    padding: SPACING.md,
    borderRadius: 16,
  },
  detailInfoStatIcon: {
    fontSize: FONT_SIZES.xl,
  },
  detailInfoStatText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  detailInfoBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  // Map modal styles
  mapContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    paddingTop: Platform.OS === "ios" ? SPACING.xxl * 2 : SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mapTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  mapSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 4,
  },
  mapCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  mapCloseText: {
    fontSize: 30,
    fontWeight: "300",
    color: COLORS.text,
  },
  map: {
    flex: 1,
  },
  mapEmptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  mapEmptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: "center",
  },
});

export default HomeScreen;
