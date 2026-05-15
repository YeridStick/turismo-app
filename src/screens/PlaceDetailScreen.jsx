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
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, PLACE_SERVICES } from '../utils/constants';
import { BREAKPOINTS } from '../utils/responsive';
import { getPlaceArConfig } from '../services/ar';
import { formatDistance } from '../utils/utils';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';
import { useAuth } from '../context/AuthContext';
import { PremiumModal } from '../components/ui/PremiumModal';

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
const VISIT_NEAR_THRESHOLD_METERS = 80;

const getApiData = (response) => response?.data?.data ?? response?.data ?? null;
const ensureArray = (value) => (Array.isArray(value) ? value : []);
const getApiMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  fallback;
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

// Componente para el contenido de un solo sitio
const PlaceDetailContent = React.memo(({ initialPlace, navigation }) => {
  const { user } = useAuth();
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
  const [reviewForm, setReviewForm] = useState({ rating: "5", comment: "" });
  const [feedbackForm, setFeedbackForm] = useState({ type: "suggestion", message: "", contactEmail: user?.email || "" });
  const [statusModal, setStatusModal] = useState({ visible: false, type: "info", title: "", message: "" });
  
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

  useEffect(() => {
    setFeedbackForm((prev) => ({ ...prev, contactEmail: user?.email || prev.contactEmail || "" }));
  }, [user?.email]);

  useEffect(() => {
    if (visitCountdown <= 0) return undefined;
    const timer = setTimeout(() => setVisitCountdown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [visitCountdown]);

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
      const [ratingRes, reviewsRes] = await Promise.all([
        api.get(ENDPOINTS.PLACE_RATING(place.id)),
        api.get(ENDPOINTS.PLACE_REVIEWS(place.id)),
      ]);
      const ratingData = getApiData(ratingRes) || {};
      const reviewsData = ensureArray(getApiData(reviewsRes));
      setRatingSummary({
        avgRating: toNum(ratingData.avgRating),
        reviewsCount: toNum(ratingData.reviewsCount) || reviewsData.length || 0,
      });
      setReviews(reviewsData);
    } catch (_err) {
      setRatingSummary({ avgRating: null, reviewsCount: 0 });
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, [place?.id]);

  const refreshNearbyState = useCallback(async () => {
    if (!user || !place?.id) {
      setNearbyDistanceM(null);
      setPendingVisitId(null);
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setNearbyDistanceM(null);
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = current?.coords?.latitude;
      const lng = current?.coords?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const response = await api.get(ENDPOINTS.PLACES_NEARBY_CONTEXT, {
        params: { lat, lng, radius: 150, limit: 5 },
      });
      const nearbyList = ensureArray(getApiData(response));
      const matched = nearbyList.find((item) => {
        const candidateId = item?.place?.id ?? item?.placeId ?? item?.place_id;
        return String(candidateId) === String(place.id);
      });
      const distance = toNum(matched?.distanceM ?? matched?.distance_m);
      const possibleVisitId = pickVisitId(matched);
      setNearbyDistanceM(distance);
      if (possibleVisitId != null) {
        setPendingVisitId(possibleVisitId);
      }
    } catch (_err) {
      setNearbyDistanceM(null);
    }
  }, [user, place?.id]);

  useEffect(() => {
    loadReviewsAndRating();
    refreshNearbyState();
  }, [loadReviewsAndRating, refreshNearbyState]);

  const handleStartVisit = async () => {
    if (!user || !place?.id || !isNearPlace) return;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc?.coords?.latitude;
      const lng = loc?.coords?.longitude;
      const accuracy = pickAccuracy(loc?.coords);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("NO_COORDS");
      }
      if (accuracy > 75) {
        setStatusModal({
          visible: true,
          type: "warning",
          title: "GPS inestable",
          message: "La precision de tu GPS supera 75m. Intenta en un espacio abierto.",
        });
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
        setStatusModal({
          visible: true,
          type: "warning",
          title: "Visita pendiente",
          message: "No se pudo abrir una visita para confirmar. Intenta de nuevo en unos segundos.",
        });
        return;
      }

      setPendingVisitId(createdVisitId);
      setMinStaySeconds(requiredStay);
      setVisitCountdown(requiredStay);
      setStatusModal({
        visible: true,
        type: "info",
        title: "Validacion iniciada",
        message: `Debes permanecer ${requiredStay} segundos en el sitio para confirmar tu visita.`,
      });
    } catch (err) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "No fue posible iniciar visita",
        message: getApiMessage(err, "Activa tu ubicacion y vuelve a intentarlo."),
      });
    }
  };

  const handleConfirmVisit = async () => {
    if (!pendingVisitId || visitCountdown > 0) return;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc?.coords?.latitude;
      const lng = loc?.coords?.longitude;
      const accuracy = pickAccuracy(loc?.coords);
      if (accuracy > 75) {
        setStatusModal({
          visible: true,
          type: "warning",
          title: "GPS inestable",
          message: "La precision de tu GPS supera 75m. Mejora la señal y vuelve a confirmar.",
        });
        return;
      }
      const payload = { lat, lng, accuracy_m: accuracy };
      await api.patch(ENDPOINTS.VISIT_CONFIRM(pendingVisitId), payload);
      setVisitConfirmed(true);
      setPendingVisitId(null);
      setVisitCountdown(0);
      setStatusModal({
        visible: true,
        type: "success",
        title: "Visita confirmada",
        message: "Ya puedes dejar feedback y tus reseñas contaran como verificadas.",
      });
      refreshNearbyState();
      loadReviewsAndRating();
    } catch (err) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "Confirmacion fallida",
        message: getApiMessage(err, "No se pudo confirmar la visita. Mantente cerca del sitio e intenta de nuevo."),
      });
    }
  };

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
          {!!user && isNearPlace && (
            <View style={styles.visitSection}>
              <Text style={styles.sectionTitle}>Validacion de visita</Text>
              {typeof nearbyDistanceM === "number" ? (
                <Text style={styles.visitMetaText}>
                  Distancia actual: {Math.round(nearbyDistanceM)} m
                </Text>
              ) : (
                <Text style={styles.visitMetaText}>
                  Activa ubicacion para validar si estas cerca de este lugar.
                </Text>
              )}
              {visitConfirmed ? (
                <View style={styles.successInline}>
                  <Ionicons name="checkmark-circle" size={16} color="#047857" />
                  <Text style={styles.successInlineText}>Visita confirmada</Text>
                </View>
              ) : (
                <View style={styles.visitActionsRow}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, !isNearPlace && styles.disabledAction]}
                    disabled={!isNearPlace}
                    onPress={handleStartVisit}
                  >
                    <Text style={styles.secondaryButtonText}>Iniciar visita</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primarySmallButton, (!pendingVisitId || visitCountdown > 0) && styles.disabledAction]}
                    disabled={!pendingVisitId || visitCountdown > 0}
                    onPress={handleConfirmVisit}
                  >
                    <Text style={styles.primarySmallButtonText}>
                      {visitCountdown > 0 ? `Confirmar en ${visitCountdown}s` : "Confirmar visita"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {!visitConfirmed ? (
                <Text style={styles.lockHintText}>
                  Permanencia minima requerida: {minStaySeconds}s.
                </Text>
              ) : null}
            </View>
          )}

          <View style={styles.reviewSection}>
            <View style={styles.reviewHeaderRow}>
              <Text style={styles.sectionTitle}>Resenas del sitio</Text>
              {loadingReviews ? <ActivityIndicator size="small" color="#0E7490" /> : null}
            </View>
            <Text style={styles.reviewSummaryText}>
              {ratingSummary.avgRating != null ? `★ ${ratingSummary.avgRating.toFixed(1)}` : "Sin calificacion"} · {ratingSummary.reviewsCount || 0} resenas
            </Text>
            {reviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {reviews.slice(0, 4).map((item, idx) => (
                  <ReviewItem key={`rv-${item.id || idx}`} item={item} />
                ))}
              </View>
            ) : (
              <Text style={styles.visitMetaText}>Aun no hay resenas para este lugar.</Text>
            )}
            {canCreateReview ? (
              <TouchableOpacity
                style={styles.primarySmallButton}
                onPress={() => setReviewModalVisible(true)}
              >
                <Text style={styles.primarySmallButtonText}>Escribir resena</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.infoMiniButton}
                onPress={() =>
                  setStatusModal({
                    visible: true,
                    type: "info",
                    title: "Resenas en sitio",
                    message: "Solo puedes crear una resena cuando te encuentres en el sitio.",
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

          {(hasValidCoordinates || arConfig?.modelUrl) && (
            <View style={styles.actionRow}>
              {hasValidCoordinates && (
                <TouchableOpacity style={[styles.actionButton, { flex: 1 }]} onPress={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
                  Linking.openURL(url);
                }}>
                  <Ionicons name="navigate-outline" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Como llegar</Text>
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

      <Modal visible={reviewModalVisible} transparent animationType="fade" onRequestClose={() => setReviewModalVisible(false)}>
        <View style={styles.formModalOverlay}>
          <View style={styles.formModalCard}>
            <Text style={styles.formModalTitle}>Nueva resena</Text>
            <Text style={styles.formFieldLabel}>Calificacion (1 a 5)</Text>
            <TextInput
              style={styles.formInput}
              value={reviewForm.rating}
              onChangeText={(value) => setReviewForm((prev) => ({ ...prev, rating: value.replace(/[^0-9]/g, "") }))}
              keyboardType="numeric"
              maxLength={1}
              placeholder="5"
            />
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
  disabledAction: {
    opacity: 0.45,
  },
  successInline: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  successInlineText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
  },
  reviewSection: {
    marginTop: SPACING.xl,
  },
  reviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewSummaryText: {
    marginTop: 2,
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  reviewsList: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  reviewItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
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
    marginTop: SPACING.xl,
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
    justifyContent: "center",
    padding: SPACING.lg,
  },
  formModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: SPACING.lg,
  },
  formModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: SPACING.sm,
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
    minHeight: 92,
    textAlignVertical: "top",
  },
  formActionsRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    gap: SPACING.sm,
  },
  formCancelButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
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
    minHeight: 42,
    borderRadius: 12,
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

