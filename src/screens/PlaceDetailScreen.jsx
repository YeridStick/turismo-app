import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  Easing,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { PremiumModal } from '../components/ui/PremiumModal';
import WebViewMap from '../components/WebViewMap';
import { ENDPOINTS } from '../config/api.config';
import { useAuth } from '../context/AuthContext';
import api, {
  addFavoritePlace,
  getFavoritePlaces,
  removeFavoritePlace,
} from '../services/api';
import { getPlaceArConfig } from '../services/ar';
import { logARDebug } from '../utils/arDebug';
import { COLORS, FONT_SIZES, PLACE_SERVICES, SPACING } from '../utils/constants';
import { BREAKPOINTS } from '../utils/responsive';
import { formatDistance } from '../utils/utils';
import { getCachedPlaceImages } from '../utils/placeMediaCache';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
const VISIT_NEAR_THRESHOLD_METERS = 120;
const VISIT_GPS_MAX_ACCURACY_METERS = 120;
const AUTO_VISIT_PREF_KEY = "turismo_auto_visit_enabled";

const getApiData = (response) => response?.data?.data ?? response?.data ?? null;
const ensureArray = (value) => (Array.isArray(value) ? value : []);
const extractItems = (payload) => {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};
const normalizeReviewsPayload = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.content)) return value.content;
  return [];
};
const getBackendErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "";
const composeLocalWithBackendError = (localMessage, error) => {
  const backendMessage = getBackendErrorMessage(error);
  if (!backendMessage) return localMessage;
  const normalizedLocal = String(localMessage || "").trim();
  const normalizedBackend = String(backendMessage).trim();
  if (!normalizedLocal) return normalizedBackend;
  if (normalizedLocal.toLowerCase() === normalizedBackend.toLowerCase()) return normalizedLocal;
  return `${normalizedLocal}\nDetalle backend: ${normalizedBackend}`;
};
const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
const pickVisitId = (payload) =>
  payload?.visitId ??
  payload?.visit_id ??
  payload?.id ??
  payload?.visit?.id ??
  null;
const pickAccuracy = (coords) => {
  const accuracy = Number(coords?.accuracy);
  return Number.isFinite(accuracy) && accuracy > 0 ? Math.round(accuracy) : 20;
};
const getOrCreateDeviceId = async () => {
  const key = 'turismo_device_id';
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const generated = `mobile-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  await AsyncStorage.setItem(key, generated);
  return generated;
};

// --- NUEVO COMPONENTE: GALERIA HD ---
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

const ReviewItem = ({ item }) => {
  const stars = Math.max(1, Math.min(5, Number(item?.rating) || 0));
  const dateLabel = item?.createdAt
    ? new Date(item.createdAt).toLocaleDateString("es-CO")
    : "";
  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHead}>
        <Text style={styles.reviewStars}>{"\u2605".repeat(stars)}</Text>
        {item?.verified ? (
          <View style={styles.verifiedPill}>
            <Ionicons name="checkmark-circle" size={12} color="#0E7490" />
            <Text style={styles.verifiedPillText}>Visita verificada</Text>
          </View>
        ) : null}
      </View>
      {item?.comment ? <Text style={styles.reviewComment}>{item.comment}</Text> : null}
      {dateLabel ? <Text style={styles.reviewDate}>{dateLabel}</Text> : null}
    </View>
  );
};

const GradientParticleButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  iconName,
  iconSet = "ionicons",
  backgroundColor = "#0E7490",
  borderColor,
  textColor = "#FFFFFF",
  iconColor = "#FFFFFF",
  particleColors = ["rgba(20,184,166,0.24)", "rgba(251,146,60,0.2)", "rgba(255,255,255,0.28)"],
  style,
  textStyle,
}) => {
  const particleConfigs = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, index) => ({
        id: `btn-particle-${index}`,
        startXPercent: 78 + Math.random() * 20,
        driftX: -(42 + Math.random() * 78),
        driftY: -7 + Math.random() * 14,
        delay: Math.floor(Math.random() * 1800),
        duration: 2500 + Math.floor(Math.random() * 1900),
        width: 7 + Math.random() * 9,
        height: 2.5 + Math.random() * 2.8,
        rotateDeg: -14 + Math.random() * 28,
        color: particleColors[index % particleColors.length],
      })),
    [particleColors],
  );
  const particleAnims = useRef(
    particleConfigs.map(() => new Animated.Value(0)),
  ).current;
  const pressSweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (disabled) {
      particleAnims.forEach((anim) => anim.setValue(0));
      return undefined;
    }
    const loops = particleAnims.map((anim, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(particleConfigs[idx].delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: particleConfigs[idx].duration,
            easing: Easing.inOut(Easing.bezier(0.35, 0, 0.2, 1)),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((loop, idx) => {
      particleAnims[idx].setValue(0);
      loop.start();
    });
    return () => loops.forEach((loop) => loop.stop());
  }, [disabled, particleAnims, particleConfigs]);

  useEffect(() => {
    if (!loading) {
      pressSweepAnim.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pressSweepAnim, {
          toValue: 1,
          duration: 860,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pressSweepAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loading, pressSweepAnim]);

  const renderIcon = () => {
    if (!iconName) return null;
    if (iconSet === "material") {
      return <MaterialIcons name={iconName} size={18} color={iconColor} />;
    }
    if (iconSet === "fontawesome") {
      return <FontAwesome name={iconName} size={16} color={iconColor} />;
    }
    return <Ionicons name={iconName} size={18} color={iconColor} />;
  };

  return (
    <TouchableOpacity
      style={[styles.gradientButtonBase, style, disabled && styles.disabledAction]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <View pointerEvents="none" style={styles.gradientParticleLayer}>
        {particleConfigs.map((particle, idx) => {
          const anim = particleAnims[idx];
          const opacity = anim.interpolate({
            inputRange: [0, 0.2, 0.78, 1],
            outputRange: [0, 0.3, 0.16, 0],
          });
          const scale = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.8, 1.06, 0.9],
          });
          const translateX = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, particle.driftX],
          });
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, particle.driftY],
          });
          return (
            <Animated.View
              key={particle.id}
              style={[
                styles.gradientParticle,
                {
                  width: particle.width,
                  height: particle.height,
                  borderRadius: 999,
                  left: `${particle.startXPercent}%`,
                  bottom: 8 + (idx % 3) * 9,
                  backgroundColor: particle.color,
                  opacity,
                  transform: [
                    { translateX },
                    { translateY },
                    { rotate: `${particle.rotateDeg}deg` },
                    { scale },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
      <View
        style={[
          styles.gradientButtonFill,
          {
            backgroundColor: disabled ? "#94A3B8" : backgroundColor,
            borderColor: borderColor || "transparent",
            borderWidth: borderColor ? 1 : 0,
          },
        ]}
      >
        {loading ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.buttonPressSweep,
              {
                transform: [
                  {
                    translateX: pressSweepAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-220, 220],
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}
        <View style={styles.gradientButtonContent}>
          {renderIcon()}
          <Text style={[styles.gradientButtonText, { color: textColor }, textStyle]}>{label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Componente para el contenido de un solo sitio
const PlaceDetailContent = React.memo(({ initialPlace, navigation }) => {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();
  const isSmall = windowWidth < BREAKPOINTS.medium;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullPlace, setFullPlace] = useState(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [ratingSummary, setRatingSummary] = useState({ avgRating: null, reviewsCount: 0 });
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [nearbyDistanceM, setNearbyDistanceM] = useState(null);
  const [pendingVisitId, setPendingVisitId] = useState(null);
  const [visitCountdown, setVisitCountdown] = useState(0);
  const [minStaySeconds, setMinStaySeconds] = useState(180);
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [placeMedia, setPlaceMedia] = useState([]);
  const [visitStartLoading, setVisitStartLoading] = useState(false);
  const [visitConfirmLoading, setVisitConfirmLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: "5", comment: "" });
  const [ratingSliderValue, setRatingSliderValue] = useState(5);
  const [ratingTrackWidth, setRatingTrackWidth] = useState(0);
  const [feedbackForm, setFeedbackForm] = useState({ type: "suggestion", message: "", contactEmail: user?.email || "" });
  const [statusModal, setStatusModal] = useState({ visible: false, type: "info", title: "", message: "" });
  const [autoVisitEnabled, setAutoVisitEnabled] = useState(false);
  const [autoVisitFlowArmed, setAutoVisitFlowArmed] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScrollViewRef = useRef(null);
  const confirmBadgeScale = useRef(new Animated.Value(1)).current;
  const confirmBadgeOpacity = useRef(new Animated.Value(1)).current;
  const confirmRingProgress = useRef(new Animated.Value(0)).current;
  const lastVisitConfirmedRef = useRef(false);
  const autoCheckinInFlightRef = useRef(false);
  const autoConfirmInFlightRef = useRef(false);
  const autoLastCheckinAttemptRef = useRef(0);
  const autoLastConfirmAttemptRef = useRef(0);
  const placeDetailDebugStartedAtRef = useRef(Date.now());
  const nearbyIntervalTickRef = useRef(0);
  const isFocusedRef = useRef(isFocused);

  isFocusedRef.current = isFocused;

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

  useEffect(() => {
    let isMounted = true;
    const fetchMedia = async () => {
      if (!initialPlace?.id || !isFocused) return;
      setPlaceMedia([]);
      try {
        const media = await getCachedPlaceImages(initialPlace.id);
        if (isMounted) {
          setPlaceMedia(media);
        }
      } catch (_mediaError) {
        // Mantener imageUrls como fallback para sitios heredados si media aún no está disponible.
        if (isMounted) setPlaceMedia([]);
      }
    };
    fetchMedia();
    return () => { isMounted = false; };
  }, [initialPlace?.id, isFocused]);

  const place = useMemo(() => {
    if (!fullPlace) return initialPlace;
    return { ...initialPlace, ...fullPlace };
  }, [initialPlace, fullPlace]);

  const getPlaceDetailFocusState = useCallback(() => {
    return isFocusedRef.current;
  }, []);

  useEffect(() => {
    logARDebug("PlaceDetailContent mount", {
      placeId: initialPlace?.id,
      placeName: initialPlace?.name,
      focused: getPlaceDetailFocusState(),
      appState: AppState.currentState,
    }, placeDetailDebugStartedAtRef.current);

    return () => {
      logARDebug("PlaceDetailContent unmount", {
        placeId: initialPlace?.id,
        placeName: initialPlace?.name,
        intervalTicks: nearbyIntervalTickRef.current,
      }, placeDetailDebugStartedAtRef.current);
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      logARDebug("PlaceDetailContent AppState change", {
        appState: nextState,
        placeId: place?.id,
        focused: getPlaceDetailFocusState(),
      }, placeDetailDebugStartedAtRef.current);
    });

    return () => {
      subscription?.remove?.();
    };
  }, [getPlaceDetailFocusState, place?.id]);

  useEffect(() => {
    const unsubscribeFocus = navigation?.addListener?.("focus", () => {
      isFocusedRef.current = true;
      logARDebug("PlaceDetailContent navigation focus", {
        placeId: place?.id,
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
    });

    const unsubscribeBlur = navigation?.addListener?.("blur", () => {
      isFocusedRef.current = false;
      logARDebug("PlaceDetailContent navigation blur", {
        placeId: place?.id,
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
    });

    return () => {
      unsubscribeFocus?.();
      unsubscribeBlur?.();
    };
  }, [navigation, place?.id]);

  const images = useMemo(() => {
    if (placeMedia.length > 0) {
      return placeMedia.map((media) => ({ id: media.id, uri: media.url, media }));
    }
    if (Array.isArray(place.imageUrls) && place.imageUrls.length > 0) {
      return place.imageUrls.map((uri, id) => ({ id, uri }));
    }
    return [{ id: 'placeholder', uri: IMAGE_PLACEHOLDER }];
  }, [place.imageUrls, placeMedia]);

  // --- LOGICA DE AUTO-PLAY ---
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
  const isNearPlace = typeof nearbyDistanceM === "number" && nearbyDistanceM <= VISIT_NEAR_THRESHOLD_METERS;
  const canCreateReview = !!user && isNearPlace;
  const canSendFeedback = !!user && isNearPlace && visitConfirmed;
  const ratingValue = Math.max(1, Math.min(5, Number(reviewForm.rating) || 1));
  const ratingProgress = Math.max(0, Math.min(1, (ratingSliderValue - 1) / 4));
  const confirmRingScale = confirmRingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1.28],
  });
  const confirmRingOpacity = confirmRingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.34, 0],
  });

  useEffect(() => {
    setFeedbackForm((prev) => ({ ...prev, contactEmail: user?.email || prev.contactEmail || "" }));
  }, [user?.email]);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(AUTO_VISIT_PREF_KEY)
      .then(async (value) => {
        if (!isMounted) return;
        if (value === null) {
          setAutoVisitEnabled(true);
          await AsyncStorage.setItem(AUTO_VISIT_PREF_KEY, "true");
          return;
        }
        setAutoVisitEnabled(value === "true");
      })
      .catch(() => {
        if (isMounted) setAutoVisitEnabled(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setAutoVisitFlowArmed(false);
    autoCheckinInFlightRef.current = false;
    autoConfirmInFlightRef.current = false;
  }, [place?.id]);

  useEffect(() => {
    if (autoVisitEnabled) return;
    setAutoVisitFlowArmed(false);
  }, [autoVisitEnabled]);

  useEffect(() => {
    if (visitCountdown <= 0) return undefined;
    const timer = setTimeout(() => setVisitCountdown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [visitCountdown]);

  useEffect(() => {
    const justConfirmed = visitConfirmed && !lastVisitConfirmedRef.current;
    lastVisitConfirmedRef.current = visitConfirmed;
    if (!justConfirmed) return;

    confirmBadgeScale.setValue(0.86);
    confirmBadgeOpacity.setValue(0.62);
    confirmRingProgress.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(confirmBadgeOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(confirmBadgeScale, {
          toValue: 1.08,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(confirmBadgeScale, {
          toValue: 1,
          friction: 7,
          tension: 110,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(confirmRingProgress, {
        toValue: 1,
        duration: 760,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    visitConfirmed,
    confirmBadgeScale,
    confirmBadgeOpacity,
    confirmRingProgress,
  ]);

  useEffect(() => {
    if (!reviewModalVisible) return;
    setRatingSliderValue(ratingValue);
  }, [reviewModalVisible, ratingValue]);

  const handleRatingChange = useCallback((value) => {
    const safeValue = Math.max(1, Math.min(5, Number(value) || 1));
    setRatingSliderValue(safeValue);
    const nextValue = Math.max(1, Math.min(5, Math.round(safeValue)));
    setReviewForm((prev) => {
      const nextRating = String(nextValue);
      return prev.rating === nextRating ? prev : { ...prev, rating: nextRating };
    });
  }, []);

  const handleRatingSlidingComplete = useCallback((value) => {
    const snapped = Math.max(1, Math.min(5, Math.round(Number(value) || ratingValue)));
    setRatingSliderValue(snapped);
    setReviewForm((prev) => ({ ...prev, rating: String(snapped) }));
  }, [ratingValue]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const handleHorizontalScroll = useCallback((event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== activeImageIndex) setActiveImageIndex(index);
  }, [activeImageIndex]);

  const loadReviewsAndRating = useCallback(async () => {
    if (!place?.id) return;
    setLoadingReviews(true);
    try {
      const [ratingResult, reviewsResult] = await Promise.allSettled([
        api.get(ENDPOINTS.PLACE_RATING(place.id)),
        api.get(ENDPOINTS.PLACE_REVIEWS(place.id)),
      ]);

      const ratingData =
        ratingResult.status === "fulfilled"
          ? getApiData(ratingResult.value) || {}
          : {};

      const reviewsDataRaw =
        reviewsResult.status === "fulfilled"
          ? getApiData(reviewsResult.value)
          : [];
      const reviewsData = normalizeReviewsPayload(reviewsDataRaw);

      const fallbackAvg =
        reviewsData.length > 0
          ? reviewsData.reduce((acc, item) => acc + (toNum(item?.rating) || 0), 0) /
            reviewsData.length
          : null;

      const avgRating = toNum(ratingData.avgRating) ?? fallbackAvg;
      const reviewsCount = toNum(ratingData.reviewsCount) || reviewsData.length || 0;

      if (reviewsResult.status === "fulfilled") {
        setReviews(reviewsData);
      }
      if (ratingResult.status === "fulfilled" || reviewsResult.status === "fulfilled") {
        setRatingSummary({
          avgRating,
          reviewsCount,
        });
      }
    } catch (_err) {
      // Mantener datos previos visibles si hay fallo temporal
    } finally {
      setLoadingReviews(false);
    }
  }, [place?.id]);

  const refreshNearbyState = useCallback(async () => {
    logARDebug("PlaceDetail refreshNearbyState start", {
      placeId: place?.id,
      hasUser: Boolean(user),
      focused: getPlaceDetailFocusState(),
      appState: AppState.currentState,
    }, placeDetailDebugStartedAtRef.current);

    if (!isFocusedRef.current) {
      logARDebug("PlaceDetail refreshNearbyState skipped", {
        reason: "screen-blurred",
        placeId: place?.id,
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      return;
    }

    if (!user || !place?.id) {
      logARDebug("PlaceDetail refreshNearbyState skipped", {
        reason: !user ? "missing-user" : "missing-place",
        focused: getPlaceDetailFocusState(),
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      setNearbyDistanceM(null);
      setPendingVisitId(null);
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        logARDebug("PlaceDetail refreshNearbyState permission denied", {
          status,
          focused: getPlaceDetailFocusState(),
        }, placeDetailDebugStartedAtRef.current);
        setNearbyDistanceM(null);
        return;
      }
      const locationStartedAt = Date.now();
      logARDebug("PlaceDetail location start", {
        placeId: place.id,
        focused: getPlaceDetailFocusState(),
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      logARDebug("PlaceDetail location end", {
        placeId: place.id,
        durationMs: Date.now() - locationStartedAt,
        hasCoords: Boolean(current?.coords),
        accuracy: current?.coords?.accuracy,
        focused: getPlaceDetailFocusState(),
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      const lat = current?.coords?.latitude;
      const lng = current?.coords?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const nearbyStartedAt = Date.now();
      const nearbyParams = { lat, lng, radius: 200, limit: 5 };
      logARDebug("PlaceDetail nearby request start", {
        placeId: place.id,
        endpoint: ENDPOINTS.PLACES_NEARBY_CONTEXT,
        params: nearbyParams,
        focused: getPlaceDetailFocusState(),
      }, placeDetailDebugStartedAtRef.current);
      const response = await api.get(ENDPOINTS.PLACES_NEARBY_CONTEXT, {
        params: nearbyParams,
      });
      const nearbyList = ensureArray(getApiData(response));
      const matched = nearbyList.find((item) => {
        const candidateId = item?.place?.id ?? item?.placeId ?? item?.place_id;
        return String(candidateId) === String(place.id);
      });
      const distance = toNum(matched?.distanceM ?? matched?.distance_m);
      const possibleVisitId = pickVisitId(matched);
      logARDebug("PlaceDetail nearby request end", {
        placeId: place.id,
        durationMs: Date.now() - nearbyStartedAt,
        resultCount: nearbyList.length,
        matched: Boolean(matched),
        distance,
        possibleVisitId,
        focused: getPlaceDetailFocusState(),
      }, placeDetailDebugStartedAtRef.current);
      setNearbyDistanceM(distance);
      if (possibleVisitId != null) {
        setPendingVisitId(possibleVisitId);
        if (autoVisitEnabled) {
          setAutoVisitFlowArmed(true);
        }
      }
    } catch (_err) {
      logARDebug("PlaceDetail refreshNearbyState error", {
        placeId: place?.id,
        message: _err?.message || String(_err),
        focused: getPlaceDetailFocusState(),
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      setNearbyDistanceM(null);
    }
  }, [autoVisitEnabled, getPlaceDetailFocusState, user, place?.id]);

  useEffect(() => {
    if (!isFocused) {
      logARDebug("PlaceDetail focused refresh paused", {
        placeId: place?.id,
        focused: false,
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      return undefined;
    }

    loadReviewsAndRating();
    refreshNearbyState();
    return undefined;
  }, [isFocused, loadReviewsAndRating, place?.id, refreshNearbyState]);

  useEffect(() => {
    if (!isFocused) {
      logARDebug("PlaceDetail nearby interval paused", {
        placeId: place?.id,
        focused: false,
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      return undefined;
    }

    if (!user || !place?.id) return undefined;
    logARDebug("PlaceDetail nearby interval setup", {
      placeId: place.id,
      focused: getPlaceDetailFocusState(),
      appState: AppState.currentState,
      intervalMs: 20000,
    }, placeDetailDebugStartedAtRef.current);
    const timer = setInterval(() => {
      nearbyIntervalTickRef.current += 1;
      logARDebug("PlaceDetail nearby interval tick", {
        tick: nearbyIntervalTickRef.current,
        placeId: place.id,
        focused: getPlaceDetailFocusState(),
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      refreshNearbyState();
    }, 20000);
    return () => {
      logARDebug("PlaceDetail nearby interval cleanup", {
        placeId: place.id,
        ticks: nearbyIntervalTickRef.current,
        focused: getPlaceDetailFocusState(),
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      clearInterval(timer);
    };
  }, [getPlaceDetailFocusState, isFocused, user, place?.id, refreshNearbyState]);

  const handleStartVisit = useCallback(async () => {
    if (!isFocusedRef.current) {
      logARDebug("PlaceDetail handleStartVisit skipped", {
        reason: "screen-blurred",
        placeId: place?.id,
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      return;
    }

    if (!user || !place?.id || !isNearPlace) return;
    setVisitStartLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc?.coords?.latitude;
      const lng = loc?.coords?.longitude;
      const accuracy = pickAccuracy(loc?.coords);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("NO_COORDS");
      }
      if (accuracy > VISIT_GPS_MAX_ACCURACY_METERS) {
        if (!autoVisitEnabled) {
          setStatusModal({
            visible: true,
            type: "warning",
            title: "GPS inestable",
            message: `La precision de tu GPS supera ${VISIT_GPS_MAX_ACCURACY_METERS}m. Intenta en un espacio abierto.`,
          });
        }
        return;
      }

      const deviceId = await getOrCreateDeviceId();
      const payload = {
        lat,
        lng,
        accuracy_m: accuracy,
        device_id: deviceId,
        meta: JSON.stringify({ appVersion: "mobile-app", source: "place-detail" }),
      };
      const checkinRes = await api.post(ENDPOINTS.PLACE_CHECKIN(place.id), payload);
      const checkinData = getApiData(checkinRes) || {};
      const createdVisitId = pickVisitId(checkinData);
      const requiredStay = Math.max(1, toNum(checkinData?.min_stay_seconds) || 180);

      if (!createdVisitId) {
        if (!autoVisitEnabled) {
          setStatusModal({
            visible: true,
            type: "warning",
            title: "Visita pendiente",
            message: "No se pudo abrir una visita para confirmar. Intenta de nuevo en unos segundos.",
          });
        }
        return;
      }

      setPendingVisitId(createdVisitId);
      setMinStaySeconds(requiredStay);
      setVisitCountdown(requiredStay);
      if (autoVisitEnabled) {
        setAutoVisitFlowArmed(true);
      }
      if (!autoVisitEnabled) {
        setStatusModal({
          visible: true,
          type: "info",
          title: "Validacion iniciada",
          message: `Debes permanecer ${requiredStay} segundos en el sitio para confirmar tu visita.`,
        });
      }
    } catch (err) {
      if (!autoVisitEnabled) {
        setStatusModal({
          visible: true,
          type: "error",
          title: "No fue posible iniciar visita",
          message: composeLocalWithBackendError("Activa tu ubicacion y vuelve a intentarlo.", err),
        });
      }
    } finally {
      setVisitStartLoading(false);
    }
  }, [autoVisitEnabled, isNearPlace, place?.id, user]);

  const handleConfirmVisit = useCallback(async () => {
    if (!isFocusedRef.current) {
      logARDebug("PlaceDetail handleConfirmVisit skipped", {
        reason: "screen-blurred",
        pendingVisitId,
        placeId: place?.id,
        appState: AppState.currentState,
      }, placeDetailDebugStartedAtRef.current);
      return;
    }

    if (!pendingVisitId || visitCountdown > 0) return;
    setVisitConfirmLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc?.coords?.latitude;
      const lng = loc?.coords?.longitude;
      const accuracy = pickAccuracy(loc?.coords);
      if (accuracy > VISIT_GPS_MAX_ACCURACY_METERS) {
        if (!autoVisitEnabled) {
          setStatusModal({
            visible: true,
            type: "warning",
            title: "GPS inestable",
            message: `La precision de tu GPS supera ${VISIT_GPS_MAX_ACCURACY_METERS}m. Mejora la senal y vuelve a confirmar.`,
          });
        }
        return;
      }
      const payload = { lat, lng, accuracy_m: accuracy };
      await api.patch(ENDPOINTS.VISIT_CONFIRM(pendingVisitId), payload);
      setVisitConfirmed(true);
      setPendingVisitId(null);
      setVisitCountdown(0);
      setAutoVisitFlowArmed(false);
      if (!autoVisitEnabled) {
        setStatusModal({
          visible: true,
          type: "success",
          title: "Visita confirmada",
          message: "Ya puedes dejar feedback y tus resenas contaran como verificadas.",
        });
      }
      refreshNearbyState();
      loadReviewsAndRating();
    } catch (err) {
      if (!autoVisitEnabled) {
        setStatusModal({
          visible: true,
          type: "error",
          title: "Confirmacion fallida",
          message: composeLocalWithBackendError(
            "No se pudo confirmar la visita. Mantente cerca del sitio e intenta de nuevo.",
            err,
          ),
        });
      }
    } finally {
      setVisitConfirmLoading(false);
    }
  }, [autoVisitEnabled, loadReviewsAndRating, pendingVisitId, place?.id, refreshNearbyState, visitCountdown]);

  useEffect(() => {
    if (!isFocused) return;
    if (!autoVisitEnabled || !user || !isNearPlace || visitConfirmed || pendingVisitId) return;
    if (autoCheckinInFlightRef.current) return;
    if (Date.now() - autoLastCheckinAttemptRef.current < 30000) return;

    autoCheckinInFlightRef.current = true;
    autoLastCheckinAttemptRef.current = Date.now();
    setAutoVisitFlowArmed(true);

    Promise.resolve(handleStartVisit())
      .finally(() => {
        autoCheckinInFlightRef.current = false;
      });
  }, [
    autoVisitEnabled,
    user,
    isNearPlace,
    visitConfirmed,
    pendingVisitId,
    handleStartVisit,
    isFocused,
  ]);

  useEffect(() => {
    if (!isFocused) return;
    if (!autoVisitEnabled || !autoVisitFlowArmed || !pendingVisitId || visitConfirmed) return;
    if (visitCountdown > 0) return;
    if (autoConfirmInFlightRef.current) return;
    if (Date.now() - autoLastConfirmAttemptRef.current < 15000) return;

    autoConfirmInFlightRef.current = true;
    autoLastConfirmAttemptRef.current = Date.now();
    Promise.resolve(handleConfirmVisit())
      .finally(() => {
        autoConfirmInFlightRef.current = false;
      });
  }, [
    autoVisitEnabled,
    autoVisitFlowArmed,
    pendingVisitId,
    visitConfirmed,
    visitCountdown,
    handleConfirmVisit,
    isFocused,
  ]);

  const handleSubmitReview = async () => {
    if (!canCreateReview || reviewSubmitting) return;
    const rating = Math.max(1, Math.min(5, Number(reviewForm.rating) || 0));
    const comment = reviewForm.comment.trim();
    if (!rating || !comment) {
      setStatusModal({
        visible: true,
        type: "warning",
        title: "Datos incompletos",
        message: "Agrega una calificacion (1 a 5) y un comentario.",
      });
      return;
    }
    setReviewSubmitting(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      await api.post(ENDPOINTS.PLACE_REVIEWS(place.id), {
        rating,
        comment,
        device_id: deviceId,
      });
      setReviewModalVisible(false);
      setReviewForm({ rating: "5", comment: "" });
      await loadReviewsAndRating();
      setStatusModal({
        visible: true,
        type: "success",
        title: "Resena registrada",
        message: "Gracias por compartir tu experiencia en este sitio.",
      });
    } catch (_err) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "No se pudo enviar resena",
        message: "Valida que estes cerca del sitio y vuelve a intentarlo.",
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!canSendFeedback || feedbackSubmitting) return;
    const message = feedbackForm.message.trim();
    if (!message) {
      setStatusModal({
        visible: true,
        type: "warning",
        title: "Feedback incompleto",
        message: "Escribe el detalle del feedback para continuar.",
      });
      return;
    }
    setFeedbackSubmitting(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      await api.post(ENDPOINTS.PLACE_FEEDBACK(place.id), {
        type: feedbackForm.type || "suggestion",
        message,
        contact_email: feedbackForm.contactEmail.trim() || undefined,
        device_id: deviceId,
      });
      setFeedbackModalVisible(false);
      setFeedbackForm((prev) => ({ ...prev, message: "" }));
      setStatusModal({
        visible: true,
        type: "success",
        title: "Feedback enviado",
        message: "Gracias. Tu reporte quedo asociado a este sitio.",
      });
    } catch (_err) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "No se pudo enviar feedback",
        message: "Intenta de nuevo en unos segundos.",
      });
    } finally {
      setFeedbackSubmitting(false);
    }
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
          <View style={styles.detailHeroCard}>
            <View style={styles.detailHeroTopRow}>
              <View style={styles.detailTitleWrap}>
                <Text style={styles.title}>{place.name || 'Lugar sin nombre'}</Text>

                {place.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={18} color="#0E7490" />
                    <Text style={styles.infoText}>{place.address}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailRatingBadge}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.detailRatingValue}>
                  {ratingSummary.avgRating != null ? ratingSummary.avgRating.toFixed(1) : "0.0"}
                </Text>
              </View>
            </View>

            {(hasValidCoordinates || arConfig?.modelUrl) && (
              <View style={styles.actionRow}>
                {hasValidCoordinates && (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={[styles.detailCtaButton, styles.detailCtaPrimary]}
                    onPress={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="navigate-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.detailCtaPrimaryText}>Como llegar</Text>
                  </TouchableOpacity>
                )}

                {arConfig?.modelUrl && (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={[styles.detailCtaButton, styles.detailCtaSecondary]}
                    onPress={() => {
                      navigation.navigate('ARView', { 
                        modelUrl: arConfig.modelUrl,
                        placeName: place.name 
                      });
                    }}
                  >
                    <Ionicons name="cube-outline" size={15} color="#0E7490" />
                    <Text style={styles.detailCtaSecondaryText}>Realidad aumentada</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {place.description && (
              <View style={styles.descriptionCard}>
                <Text style={styles.description}>{place.description}</Text>
              </View>
            )}
          </View>

          {infoDetails.length > 0 && (
            <View style={styles.detailsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Ionicons name="information-circle-outline" size={16} color="#0E7490" />
                </View>
                <Text style={styles.sectionTitle}>Detalles del sitio</Text>
              </View>
              <View style={styles.detailsGrid}>
                {infoDetails.map((detail, idx) => (
                  <View key={idx} style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}>
                      <FontAwesome name={detail.icon} size={15} color="#0E7490" />
                    </View>
                    <View style={styles.detailTextWrapper}>
                      <Text style={styles.detailLabel}>{detail.label}</Text>
                      <Text style={styles.detailValue}>{detail.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          {Array.isArray(place.services) && place.services.length > 0 && (
            <View style={styles.amenitiesSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Ionicons name="sparkles-outline" size={16} color="#0E7490" />
                </View>
                <Text style={styles.sectionTitle}>Servicios y Comodidades</Text>
              </View>
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

          {!!user && isNearPlace && (
            <View style={styles.visitSection}>
              <Text style={styles.sectionTitle}>Validacion de visita</Text>
              {typeof nearbyDistanceM === "number" ? (
                <Text style={styles.visitMetaText}>Distancia: {Math.round(nearbyDistanceM)} m</Text>
              ) : null}

              {visitConfirmed ? (
                <View style={styles.successInlineWrap}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.successInlineRing,
                      {
                        opacity: confirmRingOpacity,
                        transform: [{ scale: confirmRingScale }],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.successInline,
                      {
                        opacity: confirmBadgeOpacity,
                        transform: [{ scale: confirmBadgeScale }],
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#047857" />
                    <Text style={styles.successInlineText}>Visita confirmada</Text>
                  </Animated.View>
                </View>
              ) : autoVisitEnabled ? (
                <View style={{ marginTop: SPACING.sm }}>
                  <Text style={styles.visitMetaText}>Modo automatico activado</Text>
                  <Text style={styles.visitMetaText}>
                    {pendingVisitId
                      ? (visitCountdown > 0 ? `Confirmacion en ${visitCountdown}s` : "Confirmando...")
                      : "Iniciando check-in..."}
                  </Text>
                </View>
              ) : (
                <View style={styles.visitActionsRow}>
                  <GradientParticleButton
                    style={[styles.visitManualStartButton, !isNearPlace && styles.disabledAction]}
                    disabled={!isNearPlace || visitStartLoading || visitConfirmLoading}
                    loading={visitStartLoading}
                    onPress={handleStartVisit}
                    label={visitStartLoading ? "Iniciando..." : "Iniciar"}
                    iconName="play-outline"
                    backgroundColor="#FFFFFF"
                    borderColor="#0E7490"
                    textColor="#0E7490"
                    iconColor="#0E7490"
                    particleColors={["rgba(14,116,144,0.24)", "rgba(20,184,166,0.2)", "rgba(251,146,60,0.16)"]}
                  />
                  <GradientParticleButton
                    style={[
                      styles.visitManualConfirmButton,
                      (!pendingVisitId || visitCountdown > 0) && styles.disabledAction
                    ]}
                    disabled={!pendingVisitId || visitCountdown > 0 || visitConfirmLoading || visitStartLoading}
                    loading={visitConfirmLoading}
                    onPress={handleConfirmVisit}
                    label={
                      visitConfirmLoading
                        ? "Confirmando..."
                        : (visitCountdown > 0 ? `En ${visitCountdown}s` : "Confirmar")
                    }
                    iconName="checkmark-outline"
                    backgroundColor="#0E7490"
                    particleColors={["rgba(255,255,255,0.34)", "rgba(20,184,166,0.22)", "rgba(251,146,60,0.2)"]}
                  />
                </View>
              )}

              {!visitConfirmed ? (
                <Text style={styles.lockHintText}>Minimo: {minStaySeconds}s</Text>
              ) : null}
            </View>
          )}

          <View style={styles.reviewSection}>
            <View style={styles.reviewHeaderRow}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0E7490" />
                </View>
                <Text style={styles.sectionTitle}>Reseñas del sitio</Text>
              </View>
              {loadingReviews ? <ActivityIndicator size="small" color="#0E7490" /> : null}
            </View>
            <View style={styles.reviewSummaryCard}>
              <View style={styles.reviewScoreCircle}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.reviewScoreText}>
                  {ratingSummary.avgRating != null ? ratingSummary.avgRating.toFixed(1) : "0.0"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewSummaryTitle}>
                  {ratingSummary.reviewsCount || 0} reseñas registradas
                </Text>
                <Text style={styles.reviewSummaryText}>
                  {reviews.length > 0
                    ? "Opiniones recientes de visitantes."
                    : "Aun no hay reseñas para este lugar."}
                </Text>
              </View>
            </View>
            {reviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {reviews.slice(0, 4).map((item, idx) => (
                  <ReviewItem key={`rv-${item.id || idx}`} item={item} />
                ))}
              </View>
            ) : (
              <View style={styles.reviewEmptyState}>
                <Ionicons name="sparkles-outline" size={22} color="#94A3B8" />
                <Text style={styles.reviewEmptyText}>
                  Sé de los primeros en compartir tu experiencia cuando visites este sitio.
                </Text>
              </View>
            )}
            {canCreateReview ? (
              <GradientParticleButton
                style={styles.reviewCtaButton}
                onPress={() => setReviewModalVisible(true)}
                label="Escribir reseña"
                iconName="create-outline"
                backgroundColor="#0E7490"
                particleColors={["rgba(255,255,255,0.34)", "rgba(20,184,166,0.22)", "rgba(251,146,60,0.2)"]}
              />
            ) : (
              <TouchableOpacity
                style={styles.infoMiniButton}
                onPress={() =>
                  setStatusModal({
                    visible: true,
                    type: "info",
                    title: "Reseñas en sitio",
                    message: "Solo puedes crear una reseña cuando te encuentres en el sitio.",
                  })
                }
              >
                <Ionicons name="information-circle-outline" size={14} color="#0E7490" />
                <Text style={styles.infoMiniButtonText}>Solo en sitio</Text>
              </TouchableOpacity>
            )}
          </View>

          {!!user && isNearPlace && (
            <View style={styles.feedbackSection}>
              <Text style={styles.sectionTitle}>Feedback de ubicacion y datos</Text>
              <TouchableOpacity
                style={[styles.secondaryButton, !canSendFeedback && styles.disabledAction]}
                disabled={!canSendFeedback}
                onPress={() => setFeedbackModalVisible(true)}
              >
                <Text style={styles.secondaryButtonText}>Enviar feedback del sitio</Text>
              </TouchableOpacity>
              {!canSendFeedback ? (
                <Text style={styles.lockHintText}>
                  El feedback se habilita despues de confirmar visita.
                </Text>
              ) : null}
            </View>
          )}

          {hasValidCoordinates ? (
            <View style={styles.locationSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Ionicons name="map-outline" size={16} color="#0E7490" />
                </View>
                <Text style={styles.sectionTitle}>Ubicacion</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.locationMapCard}
                onPress={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
                  Linking.openURL(url);
                }}
              >
                <WebViewMap
                  initialRegion={{
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  markers={[{
                    id: place.id || "place-location",
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    title: place.name || "Ubicacion",
                    description: place.address || "Localizacion exacta",
                  }]}
                  showCircle={false}
                  showUserLocation={false}
                />
                  <View style={styles.locationMapScrim} pointerEvents="none" />
                  <View style={styles.locationExactPill}>
                    <Ionicons name="navigate-circle-outline" size={13} color="#0E7490" />
                    <Text style={styles.locationExactText}>Localizacion exacta</Text>
                  </View>
              </TouchableOpacity>
              <Text style={styles.locationAddressText} numberOfLines={2}>
                {place.address || `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* Visor HD FullScreen */}
      <ImageGalleryModal 
        visible={galleryVisible}
        images={images}
        initialIndex={activeImageIndex}
        onClose={() => setGalleryVisible(false)}
      />

      <Modal visible={reviewModalVisible} transparent animationType="fade" onRequestClose={() => setReviewModalVisible(false)}>
        <View style={styles.formModalOverlay}>
          <View style={styles.formModalCard}>
            <View style={styles.formModalHeader}>
              <View style={styles.formModalIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#0E7490" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formModalTitle}>Escribir reseña</Text>
                <Text style={styles.formModalSubtitle}>Comparte una opinión breve y útil para otros viajeros.</Text>
              </View>
            </View>
            <Text style={styles.formFieldLabel}>Calificacion</Text>
            <View style={styles.ratingSliderTouch}>
              <View
                style={styles.ratingSliderTrack}
                onLayout={(event) => setRatingTrackWidth(event.nativeEvent.layout.width)}
              >
                <View style={styles.ratingSliderTrackBase} />
                <View
                  pointerEvents="none"
                  style={[
                    styles.ratingSliderFill,
                    { width: Math.max(0, ratingTrackWidth * ratingProgress) },
                  ]}
                />
                <View style={styles.ratingTicksRow} pointerEvents="none">
                  {[1, 2, 3, 4, 5].map((level, index) => (
                    <View
                      key={`tick-${level}`}
                      style={[
                        styles.ratingSliderTick,
                        index === 0 && styles.ratingSliderTickEdge,
                        index === 4 && styles.ratingSliderTickEdge,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.ratingSliderLevelText}>Nivel {reviewForm.rating}/5</Text>
                <View
                  pointerEvents="none"
                  style={[
                    styles.ratingSliderThumbGhost,
                    {
                      left: Math.max(
                        0,
                        Math.min(
                          Math.max(0, ratingTrackWidth - 26),
                          ratingTrackWidth * ratingProgress - 13,
                        ),
                      ),
                    },
                  ]}
                />
                <Slider
                  style={styles.ratingSliderNative}
                  minimumValue={1}
                  maximumValue={5}
                  step={0.05}
                  value={ratingSliderValue}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor="transparent"
                  onValueChange={handleRatingChange}
                  onSlidingComplete={handleRatingSlidingComplete}
                />
              </View>
            </View>
            <Text style={styles.ratingBarHint}>Desliza para elegir nivel</Text>
            <Text style={styles.formFieldLabel}>Comentario</Text>
            <TextInput
              style={[styles.formInput, styles.formInputArea]}
              value={reviewForm.comment}
              onChangeText={(value) => setReviewForm((prev) => ({ ...prev, comment: value }))}
              placeholder="Comparte tu experiencia en este lugar"
              multiline
            />
            <View style={styles.formActionsRow}>
              <TouchableOpacity style={styles.formCancelButton} onPress={() => setReviewModalVisible(false)}>
                <Text style={styles.formCancelText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formSubmitButton} onPress={handleSubmitReview} disabled={reviewSubmitting}>
                {reviewSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.formSubmitText}>Publicar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={feedbackModalVisible} transparent animationType="fade" onRequestClose={() => setFeedbackModalVisible(false)}>
        <View style={styles.formModalOverlay}>
          <View style={styles.formModalCard}>
            <Text style={styles.formModalTitle}>Feedback del sitio</Text>
            <Text style={styles.formFieldLabel}>Tipo</Text>
            <View style={styles.feedbackTypeRow}>
              {["suggestion", "issue", "other"].map((type) => {
                const active = feedbackForm.type === type;
                return (
                  <TouchableOpacity
                    key={`fb-${type}`}
                    style={[styles.feedbackTypeChip, active && styles.feedbackTypeChipActive]}
                    onPress={() => setFeedbackForm((prev) => ({ ...prev, type }))}
                  >
                    <Text style={[styles.feedbackTypeText, active && styles.feedbackTypeTextActive]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.formFieldLabel}>Correo de contacto</Text>
            <TextInput
              style={styles.formInput}
              value={feedbackForm.contactEmail}
              onChangeText={(value) => setFeedbackForm((prev) => ({ ...prev, contactEmail: value }))}
              keyboardType="email-address"
              placeholder="correo@ejemplo.com"
              autoCapitalize="none"
            />
            <Text style={styles.formFieldLabel}>Mensaje</Text>
            <TextInput
              style={[styles.formInput, styles.formInputArea]}
              value={feedbackForm.message}
              onChangeText={(value) => setFeedbackForm((prev) => ({ ...prev, message: value }))}
              placeholder="Describe la mejora o el problema detectado"
              multiline
            />
            <View style={styles.formActionsRow}>
              <TouchableOpacity style={styles.formCancelButton} onPress={() => setFeedbackModalVisible(false)}>
                <Text style={styles.formCancelText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formSubmitButton} onPress={handleSubmitFeedback} disabled={feedbackSubmitting}>
                {feedbackSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.formSubmitText}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PremiumModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
});
PlaceDetailContent.displayName = 'PlaceDetailContent';

const PlaceDetailScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { places = [], initialIndex = 0, place } = route?.params || {};
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  
  const displayPlaces = useMemo(() => {
    if (places.length > 0) return places;
    if (place) return [place];
    return [];
  }, [places, place]);
  const currentPlace = displayPlaces[currentIndex] || displayPlaces[0];
  const currentPlaceId = currentPlace?.id;
  const isFavorite = currentPlaceId != null && favoriteIds.has(String(currentPlaceId));

  useEffect(() => {
    let mounted = true;

    const loadFavorites = async () => {
      if (!user) {
        setFavoriteIds(new Set());
        return;
      }

      try {
        const response = await getFavoritePlaces({ limit: 100, offset: 0 });
        if (!mounted) return;
        const nextIds = new Set(
          extractItems(response)
            .map((item) => item?.place?.id)
            .filter((id) => id != null)
            .map((id) => String(id)),
        );
        setFavoriteIds(nextIds);
      } catch (_err) {
        if (mounted) setFavoriteIds(new Set());
      }
    };

    loadFavorites();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentPlaceId || favoriteLoading) return;
    if (!user) {
      navigation.navigate("Auth");
      return;
    }

    const placeKey = String(currentPlaceId);
    const nextFavorite = !favoriteIds.has(placeKey);
    const previousIds = new Set(favoriteIds);
    const optimisticIds = new Set(favoriteIds);

    if (nextFavorite) {
      optimisticIds.add(placeKey);
    } else {
      optimisticIds.delete(placeKey);
    }

    setFavoriteIds(optimisticIds);
    setFavoriteLoading(true);

    try {
      if (nextFavorite) {
        await addFavoritePlace(currentPlaceId);
      } else {
        await removeFavoritePlace(currentPlaceId);
      }
    } catch (err) {
      setFavoriteIds(previousIds);
      if (err?.response?.status === 401) {
        navigation.navigate("Auth");
        return;
      }
      Alert.alert(
        "Favoritos",
        getBackendErrorMessage(err) || "No pudimos actualizar este favorito.",
      );
    } finally {
      setFavoriteLoading(false);
    }
  }, [currentPlaceId, favoriteIds, favoriteLoading, navigation, user]);

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
        <TouchableOpacity
          style={[
            styles.favoriteButton,
            isFavorite && styles.favoriteButtonActive,
            favoriteLoading && styles.favoriteButtonLoading,
          ]}
          onPress={handleToggleFavorite}
          disabled={favoriteLoading}
          activeOpacity={0.86}
        >
          {favoriteLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#FB7185" : COLORS.white}
            />
          )}
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
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          if (nextIndex !== currentIndex) {
            setCurrentIndex(nextIndex);
          }
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
  favoriteButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  favoriteButtonLoading: {
    opacity: 0.72,
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: "#F4FBFD",
  },
  detailHeroCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 24,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.12)",
    shadowColor: "#0E7490",
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  detailHeroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  detailTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: "#0F172A",
    marginBottom: 4,
    lineHeight: 29,
  },
  detailRatingBadge: {
    minWidth: 58,
    minHeight: 36,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.22)",
  },
  detailRatingValue: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: 13,
    color: "#64748B",
    flex: 1,
    lineHeight: 18,
  },
  description: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  descriptionCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 18,
    backgroundColor: "rgba(248, 250, 252, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.sm,
  },
  sectionHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.14)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: "#0F172A",
    lineHeight: 19,
  },
  actionButton: {
    overflow: "visible",
    borderRadius: 999,
    minHeight: 50,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  detailCtaButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  detailCtaPrimary: {
    backgroundColor: "#0E7490",
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.5)",
    shadowColor: "#0E7490",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  detailCtaSecondary: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.22)",
  },
  detailCtaPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  detailCtaSecondaryText: {
    color: "#0E7490",
    fontSize: 13,
    fontWeight: "800",
  },
  arActionButton: {
    flex: 1,
  },
  gradientButtonBase: {
    minHeight: 46,
    borderRadius: 14,
    overflow: "visible",
    justifyContent: "center",
  },
  gradientButtonFill: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonPressSweep: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "46%",
    backgroundColor: "rgba(255,255,255,0.26)",
    borderRadius: 14,
  },
  gradientButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
  },
  gradientButtonText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
  },
  gradientParticleLayer: {
    position: "absolute",
    left: -8,
    right: -8,
    top: -10,
    bottom: -10,
    zIndex: 3,
  },
  gradientParticle: {
    position: "absolute",
    borderRadius: 999,
  },
  detailsSection: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  detailItem: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.94)',
    padding: SPACING.sm + 2,
    borderRadius: 18,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(14, 116, 144, 0.12)',
    shadowColor: "#0F172A",
    shadowOpacity: 0.035,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '900',
    marginTop: 4,
  },
  amenitiesSection: {
    marginTop: SPACING.xl,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 22,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.10)",
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E4ECF2',
  },
  amenityText: {
    fontSize: 11,
    color: '#0E7490',
    fontWeight: '800',
  },
  visitSection: {
    marginTop: SPACING.xl,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  visitMetaText: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  visitActionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  visitManualStartButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    shadowColor: "#0E7490",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  visitManualStartText: {
    color: "#0E7490",
    fontSize: 13,
    fontWeight: "800",
  },
  visitManualConfirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  visitManualConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0E7490",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
    backgroundColor: "#ECFEFF",
  },
  secondaryButtonText: {
    color: "#0E7490",
    fontSize: 13,
    fontWeight: "700",
  },
  primarySmallButton: {
    marginTop: SPACING.sm,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#0E7490",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  primarySmallButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  reviewCtaButton: {
    marginTop: SPACING.sm,
    minHeight: 40,
    borderRadius: 999,
    alignSelf: "flex-start",
    minWidth: 156,
    shadowColor: "#0E7490",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  reviewCtaButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  disabledAction: {
    opacity: 0.45,
  },
  successInlineWrap: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
    position: "relative",
  },
  successInlineRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.55)",
    backgroundColor: "rgba(16,185,129,0.1)",
  },
  successInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  successInlineText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
  },
  reviewSection: {
    marginTop: SPACING.xl,
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 22,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.10)",
  },
  reviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewSummaryText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    lineHeight: 17,
  },
  reviewSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.92)",
  },
  reviewScoreCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewScoreText: {
    marginTop: 2,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  reviewSummaryTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },
  reviewsList: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  reviewEmptyState: {
    marginTop: SPACING.sm,
    minHeight: 86,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.92)",
  },
  reviewEmptyText: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "600",
  },
  reviewItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: SPACING.sm,
  },
  reviewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  reviewStars: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "800",
  },
  reviewComment: {
    marginTop: 6,
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
  },
  reviewDate: {
    marginTop: 6,
    color: "#94A3B8",
    fontSize: 11,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFEFF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedPillText: {
    color: "#0E7490",
    fontSize: 11,
    fontWeight: "700",
  },
  feedbackSection: {
    marginTop: SPACING.lg,
  },
  locationSection: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 22,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.10)",
  },
  locationMapCard: {
    height: 170,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#AEB2C8",
    borderWidth: 1,
    borderColor: "#DCE3ED",
  },
  locationMapScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14, 116, 144, 0.04)",
  },
  locationExactPill: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  locationExactText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "800",
  },
  locationAddressText: {
    marginTop: SPACING.xs,
    fontSize: 12,
    color: "#64748B",
  },
  lockHintText: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748B",
  },
  infoMiniButton: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.28)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoMiniButtonText: {
    color: "#0E7490",
    fontSize: 12,
    fontWeight: "700",
  },
  formModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.62)",
    justifyContent: "flex-end",
    padding: SPACING.lg,
  },
  formModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: SPACING.lg,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  formModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  formModalIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#ECFEFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.16)",
  },
  formModalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },
  formModalSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginTop: SPACING.sm,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#DCE3ED",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  formInputArea: {
    minHeight: 104,
    maxHeight: 150,
    textAlignVertical: "top",
  },
  ratingBarWrap: {
    marginTop: 2,
  },
  ratingSliderTouch: {
    width: "100%",
    minHeight: 38,
    justifyContent: "center",
  },
  ratingSliderTrack: {
    height: 34,
    borderRadius: 999,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#BEEAF2",
    overflow: "hidden",
    justifyContent: "center",
    position: "relative",
  },
  ratingSliderTrackBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,184,166,0.10)",
  },
  ratingSliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "rgba(20,184,166,0.38)",
  },
  ratingTicksRow: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingSliderTick: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(14,116,144,0.26)",
  },
  ratingSliderTickEdge: {
    opacity: 0.5,
  },
  ratingSliderLevelText: {
    position: "absolute",
    alignSelf: "center",
    color: "#0E7490",
    fontSize: 12,
    fontWeight: "800",
    zIndex: 2,
    pointerEvents: "none",
  },
  ratingSliderThumbGhost: {
    position: "absolute",
    top: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#A5E4EC",
    shadowColor: "#0E7490",
    shadowOpacity: 0.20,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  ratingSliderNative: {
    position: "absolute",
    left: -8,
    right: -8,
    top: 0,
    bottom: 0,
    transform: [{ scaleY: 1.65 }],
  },
  ratingBarHint: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  formActionsRow: {
    marginTop: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.sm,
  },
  formCancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  formCancelText: {
    color: "#475569",
    fontWeight: "700",
  },
  formSubmitButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "#0E7490",
    alignItems: "center",
    justifyContent: "center",
  },
  formSubmitText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  feedbackTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  feedbackTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  feedbackTypeChipActive: {
    borderColor: "#0E7490",
    backgroundColor: "#ECFEFF",
  },
  feedbackTypeText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  feedbackTypeTextActive: {
    color: "#0E7490",
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
