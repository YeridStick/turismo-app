import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
// Modular Components
import HomeFooter from "./components/HomeFooter";
import HomeHeader from "./components/HomeHeader";
import NearbyMapBlock from "./components/NearbyMapBlock";
import NotificationPanel from "./components/NotificationPanel";
import PackageCard from "./components/PackageCard";
import PlaceCard from "./components/PlaceCard";
import SidePanel from "./components/SidePanel";

// Modals
import AgencyModal from "./components/modals/AgencyModal";
import ArWebViewModal from "./components/modals/ArWebViewModal";
import FilterModal from "./components/modals/FilterModal";
import PackageDetailModal from "./components/modals/PackageDetailModal";
import ProfileModal from "./components/modals/ProfileModal";
import ReservationModal from "./components/modals/ReservationModal";
import VerificationModal from "./components/modals/VerificationModal";

// Hooks
import useAR from "./hooks/useAR";
import useHomeData from "./hooks/useHomeData";
import useNotifications from "./hooks/useNotifications";
import useReservation from "./hooks/useReservation";
import useVerification from "./hooks/useVerification";

// Constants & Helpers
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import AnimatedBackground from "../../components/ui/AnimatedBackground";
import { PremiumModal } from "../../components/ui/PremiumModal";
import styles from "./styles";
import { COLORS, screenWidth } from "./utils/constants";
import {
  formatPrice,
  getCategoryLabel,
  getPackageGradient,
  getPackageImage,
} from "./utils/helpers";

const AGENCY_COLUMN_WIDTH = 310;
const AGENCY_COLUMN_GAP = 12;

const HomeScreen = ({ navigation }) => {
  const { user, roles, logout } = useAuth();

  // Data Logic Hook
  const {
    places,
    nearby,
    popular,
    topPlaces,
    bestRatedPlaces,
    packages,
    agencies,
    nearbyContext,
    searchResults,
    loadingAll,
    loadingMorePlaces,
    loadingNearby,
    loadingTopPlaces,
    loadingPackages,
    loadingAgencies,
    loadingMorePackages,
    loadingMoreAgencies,
    loadingNearbyContext,
    error,
    topPlacesError,
    bestRatedError,
    packagesError,
    agenciesError,
    allPlacesPage,
    setAllPlacesPage,
    hasMorePlaces,
    hasMorePackages,
    hasMoreAgencies,
    selectedCategory,
    setSelectedCategory,
    distanceKm,
    setDistanceKm,
    query,
    setQuery,
    agencySearchQuery,
    setAgencySearchQuery,
    coords,
    loadAll,
    loadPackages,
    loadAgencies,
    loadNearby,
    performSearch,
    loadMoreAgencies,
    loadMorePackages,
    handleRefresh,
    getTopPlaceMeta,
    selectedAgencyFilter,
    setSelectedAgencyFilter,
    clearAgencyFilter,
    categories,
  } = useHomeData(user);

  // Verification Logic Hook
  const {
    emailVerifyVisible,
    setEmailVerifyVisible,
    emailVerifyLoading,
    emailVerifyStatus,
    verifyToken,
    setVerifyToken,
    handleRequestVerification,
    handleConfirmVerificationToken,
  } = useVerification();

  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const openNotificationPanelRef = useRef(null);
  const requestOpenNotificationPanel = useCallback(() => {
    openNotificationPanelRef.current?.();
  }, []);

  const {
    notifications,
    unreadCount,
    loadingNotifications,
    notificationError,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    enabled: Boolean(user?.email),
    accountKey: user?.email || "",
  });

  // Reservation Logic Hook
  const {
    reservationVisible,
    selectedPackage,
    reservationForm,
    reservationLoading,
    reservationStatusModal,
    handleReservationChange,
    openReservation,
    closeReservation,
    closeReservationStatusModal,
    submitReservation,
  } = useReservation({
    user,
    onRequireAuth: () => navigation.navigate("Auth"),
    onRequireVerification: () => setEmailVerifyVisible(true),
    onReservationCreated: requestOpenNotificationPanel,
    onOpenReservations: () => {
      setNotificationsVisible(false);
      navigation.navigate("MyReservations");
    },
  });

  // AR Logic Hook
  const {
    arVisible,
    setArVisible,
    openAR,
    handleShouldStartLoad,
    generateArHtml,
  } = useAR();

  // Local UI State
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [agencyVisible, setAgencyVisible] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [packageDetailVisible, setPackageDetailVisible] = useState(false);
  const [detailPackage, setDetailPackage] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [isInteractingWithMap, setIsInteractingWithMap] = useState(false);
  const [mapGestureLocked, setMapGestureLocked] = useState(false);
  const [agencyPageIndex, setAgencyPageIndex] = useState(0);

  const displayPlaces = useMemo(() => {
    return query.trim() || selectedCategory !== "todos"
      ? searchResults
      : places;
  }, [query, selectedCategory, searchResults, places]);

  const handleIncreaseRadius = useCallback(() => {
    let nextDist = 15;
    if (distanceKm >= 50) nextDist = 100;
    else if (distanceKm >= 15) nextDist = 50;
    else if (distanceKm >= 5) nextDist = 15;

    setDistanceKm(nextDist);
    loadNearby(nextDist);
  }, [distanceKm, setDistanceKm, loadNearby]);

  const handleLoadMore = useCallback(() => {
    const nextPage = allPlacesPage + 1;
    loadAll(nextPage, true);
    setAllPlacesPage(nextPage);
  }, [allPlacesPage, loadAll, setAllPlacesPage]);

  const reloadPackagesSection = useCallback(() => {
    loadPackages(0, false, selectedAgencyFilter);
    loadAgencies(0, false, agencySearchQuery);
  }, [agencySearchQuery, loadAgencies, loadPackages, selectedAgencyFilter]);

  const shouldShowAgencyState =
    !loadingAgencies && agencies.length === 0 && !agencySearchQuery;

  const agencyColumns = useMemo(() => {
    const columns = [];
    for (let i = 0; i < agencies.length; i += 2) {
      columns.push({
        agencies: agencies.slice(i, i + 2),
        showLoadMore: false,
      });
    }

    if (hasMoreAgencies) {
      const lastColumn = columns[columns.length - 1];
      if (lastColumn && lastColumn.agencies.length === 1) {
        lastColumn.showLoadMore = true;
      } else {
        columns.push({ agencies: [], showLoadMore: true });
      }
    }

    return columns;
  }, [agencies, hasMoreAgencies]);

  const handleAgencyScrollEnd = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageWidth = AGENCY_COLUMN_WIDTH + AGENCY_COLUMN_GAP;
    setAgencyPageIndex(Math.max(0, Math.round(offsetX / pageWidth)));
  }, []);

  // SidePanel Animation
  const sidePanelWidth = 360;
  const notificationPanelWidth = Math.min(screenWidth * 0.9, 410);
  const sidePanelTranslateX = useRef(
    new Animated.Value(-sidePanelWidth),
  ).current;
  const notificationPanelTranslateX = useRef(
    new Animated.Value(notificationPanelWidth),
  ).current;
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const edgeGestureRef = useRef(null);

  // Close SidePanel
  const closeSidePanel = useCallback(() => {
    edgeGestureRef.current = null;
    sidePanelTranslateX.stopAnimation();
    Animated.timing(sidePanelTranslateX, {
      toValue: -sidePanelWidth,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSidePanelOpen(false));
  }, [sidePanelTranslateX, sidePanelWidth]);

  const closeNotificationPanel = useCallback(() => {
    edgeGestureRef.current = null;
    notificationPanelTranslateX.stopAnimation();
    Animated.timing(notificationPanelTranslateX, {
      toValue: notificationPanelWidth,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setNotificationsVisible(false));
  }, [notificationPanelTranslateX, notificationPanelWidth]);

  const openSidePanel = useCallback(() => {
    edgeGestureRef.current = null;
    if (notificationsVisible) {
      closeNotificationPanel();
    }

    setSidePanelOpen(true);
    Animated.timing(sidePanelTranslateX, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [
    closeNotificationPanel,
    notificationsVisible,
    sidePanelTranslateX,
  ]);

  const openNotificationPanel = useCallback(() => {
    edgeGestureRef.current = null;
    if (sidePanelOpen) {
      closeSidePanel();
    }

    notificationPanelTranslateX.stopAnimation();
    setNotificationsVisible(true);
    Animated.timing(notificationPanelTranslateX, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [
    closeSidePanel,
    notificationPanelTranslateX,
    sidePanelOpen,
  ]);

  openNotificationPanelRef.current = openNotificationPanel;

  const leftHandlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !mapGestureLocked && !sidePanelOpen,
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (mapGestureLocked || sidePanelOpen) return false;
          const { dx, dy } = gesture;
          return dx > 4 && Math.abs(dx) > Math.abs(dy);
        },
        onPanResponderGrant: () => {
          edgeGestureRef.current = "left";
          if (notificationsVisible) {
            closeNotificationPanel();
            edgeGestureRef.current = "left";
          }
          sidePanelTranslateX.stopAnimation();
          sidePanelTranslateX.setValue(-sidePanelWidth);
        },
        onPanResponderMove: (_, gesture) => {
          const nextX = Math.min(
            0,
            Math.max(-sidePanelWidth, -sidePanelWidth + gesture.dx),
          );
          sidePanelTranslateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
          const nextX = Math.min(
            0,
            Math.max(-sidePanelWidth, -sidePanelWidth + gesture.dx),
          );
          const isTap =
            Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8;
          const shouldOpen =
            isTap || nextX > -sidePanelWidth / 2 || gesture.vx > 0.45;

          if (shouldOpen) setSidePanelOpen(true);
          Animated.timing(sidePanelTranslateX, {
            toValue: shouldOpen ? 0 : -sidePanelWidth,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => setSidePanelOpen(shouldOpen));
          edgeGestureRef.current = null;
        },
        onPanResponderTerminate: () => {
          Animated.timing(sidePanelTranslateX, {
            toValue: -sidePanelWidth,
            duration: 190,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => setSidePanelOpen(false));
          edgeGestureRef.current = null;
        },
      }),
    [
      closeNotificationPanel,
      mapGestureLocked,
      notificationsVisible,
      sidePanelOpen,
      sidePanelTranslateX,
      sidePanelWidth,
    ],
  );

  const rightHandlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !mapGestureLocked && Boolean(user) && !notificationsVisible,
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (mapGestureLocked || notificationsVisible || !user) return false;
          const { dx, dy } = gesture;
          return dx < -4 && Math.abs(dx) > Math.abs(dy);
        },
        onPanResponderGrant: () => {
          edgeGestureRef.current = "right";
          if (sidePanelOpen) {
            closeSidePanel();
            edgeGestureRef.current = "right";
          }
          notificationPanelTranslateX.stopAnimation();
          notificationPanelTranslateX.setValue(notificationPanelWidth);
        },
        onPanResponderMove: (_, gesture) => {
          const nextX = Math.min(
            notificationPanelWidth,
            Math.max(0, notificationPanelWidth + gesture.dx),
          );
          notificationPanelTranslateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
          const nextX = Math.min(
            notificationPanelWidth,
            Math.max(0, notificationPanelWidth + gesture.dx),
          );
          const isTap =
            Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8;
          const shouldOpen =
            isTap || nextX < notificationPanelWidth / 2 || gesture.vx < -0.45;

          Animated.timing(notificationPanelTranslateX, {
            toValue: shouldOpen ? 0 : notificationPanelWidth,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => setNotificationsVisible(shouldOpen));
          edgeGestureRef.current = null;
        },
        onPanResponderTerminate: () => {
          Animated.timing(notificationPanelTranslateX, {
            toValue: notificationPanelWidth,
            duration: 190,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => setNotificationsVisible(false));
          edgeGestureRef.current = null;
        },
      }),
    [
      closeSidePanel,
      mapGestureLocked,
      notificationPanelTranslateX,
      notificationPanelWidth,
      notificationsVisible,
      sidePanelOpen,
      user,
    ],
  );

  // Pan Responder Logic
  const panResponder = useMemo(
    () => {
      const shouldStartPanelGesture = (gesture) => {
        if (mapGestureLocked) return false;
        const { dx, dy, x0 } = gesture;
        const canUseNotifications = Boolean(user);
        if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy) * 1.35) {
          return false;
        }

        if (notificationsVisible && canUseNotifications) {
          edgeGestureRef.current = "right";
          return true;
        }

        if (sidePanelOpen) {
          edgeGestureRef.current = "left";
          return true;
        }

        if (x0 <= 42 && dx > 0) {
          edgeGestureRef.current = "left";
          return true;
        }

        if (canUseNotifications && x0 >= screenWidth - 42 && dx < 0) {
          edgeGestureRef.current = "right";
          return true;
        }

        return false;
      };

      return PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          shouldStartPanelGesture(gesture),
        onMoveShouldSetPanResponder: (_, gesture) =>
          shouldStartPanelGesture(gesture),
        onPanResponderGrant: () => {
          if (edgeGestureRef.current === "left" && !sidePanelOpen) {
            if (notificationsVisible) {
              closeNotificationPanel();
              edgeGestureRef.current = "left";
            }
            sidePanelTranslateX.stopAnimation();
            sidePanelTranslateX.setValue(-sidePanelWidth);
          }

          if (edgeGestureRef.current === "right" && !notificationsVisible) {
            if (sidePanelOpen) {
              closeSidePanel();
              edgeGestureRef.current = "right";
            }
            notificationPanelTranslateX.stopAnimation();
            notificationPanelTranslateX.setValue(notificationPanelWidth);
          }
        },
        onPanResponderMove: (_, gesture) => {
          if (mapGestureLocked) return;

          if (edgeGestureRef.current === "right") {
            const startX = notificationsVisible ? 0 : notificationPanelWidth;
            const nextX = Math.min(
              notificationPanelWidth,
              Math.max(0, startX + gesture.dx),
            );
            notificationPanelTranslateX.setValue(nextX);
            return;
          }

          if (edgeGestureRef.current !== "left") return;

          const startX = sidePanelOpen ? 0 : -sidePanelWidth;
          const nextX = Math.min(
            0,
            Math.max(-sidePanelWidth, startX + gesture.dx),
          );
          sidePanelTranslateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
          if (mapGestureLocked) return;

          if (edgeGestureRef.current === "right") {
            const startX = notificationsVisible ? 0 : notificationPanelWidth;
            const nextX = Math.min(
              notificationPanelWidth,
              Math.max(0, startX + gesture.dx),
            );
            const isTap =
              Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8;
            const shouldOpen =
              (!notificationsVisible && isTap) ||
              nextX < notificationPanelWidth / 2 || gesture.vx < -0.45;

            Animated.timing(notificationPanelTranslateX, {
              toValue: shouldOpen ? 0 : notificationPanelWidth,
              duration: 240,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start(() => setNotificationsVisible(shouldOpen));

            edgeGestureRef.current = null;
            return;
          }

          if (edgeGestureRef.current !== "left") {
            edgeGestureRef.current = null;
            return;
          }

          const startX = sidePanelOpen ? 0 : -sidePanelWidth;
          const nextX = startX + gesture.dx;
          const isTap =
            Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8;
          const shouldOpen =
            (!sidePanelOpen && isTap) ||
            nextX > -sidePanelWidth / 2 ||
            gesture.vx > 0.5;
          if (shouldOpen) setSidePanelOpen(true);

          Animated.timing(sidePanelTranslateX, {
            toValue: shouldOpen ? 0 : -sidePanelWidth,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => setSidePanelOpen(shouldOpen));
          edgeGestureRef.current = null;
        },
      });
    },
    [
      mapGestureLocked,
      closeSidePanel,
      closeNotificationPanel,
      notificationPanelTranslateX,
      notificationPanelWidth,
      notificationsVisible,
      sidePanelOpen,
      sidePanelWidth,
      sidePanelTranslateX,
      user,
    ],
  );

  // Roles-based routes
  // Roles-based routes with enhanced metadata
  const allowedRoutes = useMemo(() => {
    const norm = (roles || []).map((r) => r.toLowerCase());
    const isAdmin = norm.includes("admin");
    const has = (n) => isAdmin || n.some((r) => norm.includes(r));

    const routes = [
      {
        id: "my-reservations",
        label: "Mis reservas",
        route: "MyReservations",
        roles: ["user", "customer", "traveler", "tourist"],
        always: true,
        icon: "calendar-check-o",
        description: "Consulta tus solicitudes y su estado con la agencia.",
      },
      {
        id: "agency-reservations",
        label: "Solicitudes de reserva",
        route: isAdmin ? "AgencyDashboard" : "AgencyReservations",
        roles: ["agency"],
        icon: "calendar",
        description: isAdmin
          ? "Elige una agencia y revisa sus solicitudes."
          : "Revisa y actualiza solicitudes recibidas.",
      },
      {
        id: "manage-places",
        label: "Mis Lugares",
        route: "ManagePlaces",
        roles: ["owner"],
        icon: "map-marker",
        description: "Gestiona, edita y publica tus sitios turísticos.",
      },
      {
        id: "agency-dashboard",
        label: "Dashboard",
        route: "AgencyDashboard",
        roles: ["agency"],
        icon: "dashboard",
        description: "Gestiona tus paquetes y servicios turísticos.",
      },
      {
        id: "admin-tools",
        label: "Panel de Administración",
        route: "AdminPanel",
        roles: ["admin"],
        icon: "shield",
        description: "Herramientas globales de gestión y control.",
      },
    ];

    // Unique routes (in case multiple roles share the same route)
    const seen = new Set();
    return routes.filter((r) => {
      if (seen.has(r.id)) return false;
      const canAccess = r.always || has(r.roles);
      if (canAccess) seen.add(r.id);
      return canAccess;
    });
  }, [roles]);

  const openAgency = (agency) => {
    setSelectedAgency(agency);
    setAgencyVisible(true);
    setSelectedAgencyFilter(agency);
  };

  const selectAgencyFilter = useCallback(
    (agency) => {
      setSelectedAgencyFilter((current) =>
        current?.id === agency?.id ? null : agency,
      );
    },
    [setSelectedAgencyFilter],
  );

  const openPackageDetail = useCallback((pkg) => {
    setDetailPackage(pkg);
    setPackageDetailVisible(true);
  }, []);

  const openPackagePayment = useCallback(
    (pkg) => {
      if (!pkg) return;
      setPackageDetailVisible(false);
      setDetailPackage(null);
      openReservation(pkg);
    },
    [openReservation],
  );

  const toggleMapGestureLock = useCallback(() => {
    setMapGestureLocked((prev) => {
      const next = !prev;
      if (next) {
        closeSidePanel();
        setIsInteractingWithMap(true);
      } else {
        setIsInteractingWithMap(false);
      }
      return next;
    });
  }, [closeSidePanel]);

  const unlockMapGesture = useCallback(() => {
    setMapGestureLocked(false);
    setIsInteractingWithMap(false);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      {...panResponder.panHandlers}
    >
      <AnimatedBackground />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loadingAll} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isInteractingWithMap && !mapGestureLocked}
      >
        <HomeHeader
          user={user}
          query={query}
          setQuery={setQuery}
          onPerformSearch={performSearch}
          onOpenFilters={() => setFiltersVisible(true)}
          onOpenProfile={() => setProfileVisible(true)}
          onOpenNotifications={openNotificationPanel}
          unreadNotifications={unreadCount}
          onLogin={() => navigation.navigate("Auth")}
          searchSuggestions={
            query.trim()
              ? places
                  .filter((p) =>
                    (p.name || "").toLowerCase().includes(query.toLowerCase()),
                  )
                  .slice(0, 5)
              : []
          }
          onSelectSuggestion={(item) =>
            navigation.navigate("PlaceDetail", {
              places: [item],
              initialIndex: 0,
            })
          }
        />

        {/* Nearby Section - Always Visible */}
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <View style={styles.sectionTitleAccent} />
            <View style={styles.sectionIconBubble}>
              <FontAwesome name="location-arrow" size={11} color="#0E7490" />
            </View>
            <Text style={styles.sectionHeroTitle}>Cerca de ti</Text>
          </View>

          <NearbyMapBlock
            coords={coords}
            filteredNearby={nearby}
            distanceKm={distanceKm}
            mapGestureLocked={mapGestureLocked}
            isInteractingWithMap={isInteractingWithMap}
            onMapTouchStart={() => setIsInteractingWithMap(true)}
            onMapTouchEnd={() => setIsInteractingWithMap(false)}
            onToggleMapGestureLock={toggleMapGestureLock}
            onUnlockMapGesture={unlockMapGesture}
            onPlacePress={(item, index) =>
              {
                unlockMapGesture();
              navigation.navigate("PlaceDetail", {
                places: nearby,
                initialIndex: index,
              });
              }
            }
            onArPress={(item) => {
              unlockMapGesture();
              openAR(item);
            }}
            onIncreaseRadius={handleIncreaseRadius}
            onReloadNearby={() => loadNearby(distanceKm)}
            getTopPlaceMeta={getTopPlaceMeta}
            loadingNearby={loadingNearby}
          />
        </View>

        {/* Catalog Section */}
        {displayPlaces.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionIntro}>
              <View style={styles.sectionTitleAccent} />
              <View style={styles.sectionIconBubble}>
                <FontAwesome
                  name={
                    query.trim() || selectedCategory !== "todos"
                      ? "search"
                      : "compass"
                  }
                  size={11}
                  color="#0E7490"
                />
              </View>
              <Text style={styles.sectionHeroTitle}>
                {query.trim() || selectedCategory !== "todos"
                  ? "Resultados de búsqueda"
                  : "Tu próxima aventura"}
              </Text>
            </View>

            <FlatList
              horizontal
              data={displayPlaces}
              keyExtractor={(item, idx) => `${item.id || idx}-cat`}
              renderItem={({ item, index }) => (
                <PlaceCard
                  title={item.name}
                  subtitle={item.description}
                  meta={getTopPlaceMeta(item)}
                  image={item.image}
                  rating={item.rating}
                  distance={item.distance}
                  variant="compact"
                  onPress={() =>
                    navigation.navigate("PlaceDetail", {
                      places: displayPlaces,
                      initialIndex: index,
                    })
                  }
                  onArPress={() => openAR(item)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              ListFooterComponent={() =>
                hasMorePlaces &&
                !(query.trim() || selectedCategory !== "todos") ? (
                  <TouchableOpacity
                    style={styles.loadMoreCard}
                    onPress={handleLoadMore}
                    disabled={loadingMorePlaces}
                  >
                    {loadingMorePlaces ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : (
                      <>
                        <View style={styles.loadMoreIcon}>
                          <Text style={{ fontSize: 24, color: COLORS.primary }}>
                            +
                          </Text>
                        </View>
                        <Text style={styles.loadMoreText}>Cargar más</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
        )}

        {/* Agencies + Packages (Unified Section) */}
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <View style={styles.sectionTitleAccent} />
            <View style={styles.sectionIconBubble}>
              <FontAwesome name="building-o" size={11} color="#0E7490" />
            </View>
            <Text style={styles.sectionHeroTitle}>Agencias locales</Text>
          </View>

          {(agencies.length > 0 || agencySearchQuery || loadingAgencies) && (
            <View style={styles.agencyFilterWrap}>
              <View style={styles.agencySearchBox}>
                <Ionicons name="search-outline" size={17} color="#0E7490" />
                <TextInput
                  value={agencySearchQuery}
                  onChangeText={setAgencySearchQuery}
                  placeholder="Buscar agencia local"
                  placeholderTextColor="#94A3B8"
                  style={styles.agencySearchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {agencySearchQuery ? (
                  <TouchableOpacity
                    onPress={() => setAgencySearchQuery("")}
                    style={styles.agencySearchClear}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={14} color="#64748B" />
                  </TouchableOpacity>
                ) : null}
              </View>
              {loadingAgencies ? (
                <ActivityIndicator color="#0E7490" style={{ marginVertical: 14 }} />
              ) : agencies.length === 0 ? (
                <Text style={styles.agencyEmptyText}>
                  No encontramos agencias con ese nombre.
                </Text>
              ) : (
                <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.agencyFilterScroller}
              onMomentumScrollEnd={handleAgencyScrollEnd}
              snapToInterval={AGENCY_COLUMN_WIDTH + AGENCY_COLUMN_GAP}
              decelerationRate="fast"
              scrollEventThrottle={16}
            >
              {agencyColumns.map((column, columnIndex) => (
                <View
                  key={`agency-column-${columnIndex}`}
                  style={styles.agencyFilterColumn}
                >
                  {column.agencies.map((item, idx) => {
                    const itemIndex = columnIndex * 2 + idx;
                    const isActive = selectedAgencyFilter?.id === item?.id;
                    return (
                    <TouchableOpacity
                      key={`${item.id || itemIndex}-age`}
                      style={[
                        styles.agencyFilterCard,
                        isActive && styles.agencyFilterCardActive,
                      ]}
                      activeOpacity={0.88}
                      onPress={() => selectAgencyFilter(item)}
                    >
                      <View
                        style={[
                          styles.agencyFilterIcon,
                          isActive && styles.agencyFilterIconActive,
                        ]}
                      >
                        <Ionicons
                          name="business-outline"
                          size={17}
                          color={isActive ? "#FFFFFF" : "#0E7490"}
                        />
                      </View>
                      <View style={styles.agencyFilterInfo}>
                        <Text style={styles.agencyFilterName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.agencyFilterMeta} numberOfLines={1}>
                          {isActive ? "Filtro activo" : "Toca para filtrar paquetes"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.agencyFilterInfoButton}
                        onPress={(event) => {
                          event?.stopPropagation?.();
                          openAgency(item);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="information" size={14} color="#0E7490" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                    );
                  })}
                  {column.showLoadMore ? (
                    <TouchableOpacity
                      style={[
                        styles.agencyMoreButton,
                        column.agencies.length === 0 && styles.agencyMoreButtonFull,
                      ]}
                      onPress={loadMoreAgencies}
                      disabled={loadingMoreAgencies}
                      activeOpacity={0.86}
                    >
                      {loadingMoreAgencies ? (
                        <ActivityIndicator size="small" color="#0E7490" />
                      ) : (
                        <>
                          <Text style={styles.agencyMoreText}>Ver más agencias</Text>
                          <Ionicons name="chevron-forward" size={15} color="#0E7490" />
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </ScrollView>
            {agencyColumns.length > 1 ? (
              <View style={styles.agencyPageDots}>
                {agencyColumns.map((_, index) => (
                  <View
                    key={`agency-dot-${index}`}
                    style={[
                      styles.agencyPageDot,
                      index === Math.min(agencyPageIndex, agencyColumns.length - 1) &&
                        styles.agencyPageDotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
                </>
              )}
            </View>
          )}

          {shouldShowAgencyState ? (
            <View style={[styles.emptyAgencyState, styles.emptyAgencyStateCompact]}>
              <View style={styles.emptyAgencyIcon}>
                <Ionicons
                  name={agenciesError ? "alert-circle-outline" : "business-outline"}
                  size={30}
                  color={agenciesError ? "#F97316" : COLORS.textLight}
                />
              </View>
              <Text style={styles.emptyAgencyTitle}>
                {agenciesError
                  ? "Ups, no se pudieron cargar"
                  : "Pronto habra agencias locales"}
              </Text>
              <Text style={styles.emptyAgencySub}>
                {agenciesError
                  ? "El backend no respondio al consultar las agencias. Puedes intentar cargar esta seccion nuevamente."
                  : "Aqui apareceran operadores y aliados turisticos para filtrar paquetes y conocer sus servicios."}
              </Text>
              <View style={styles.emptyAgencyActions}>
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={reloadPackagesSection}
                  disabled={loadingPackages || loadingAgencies}
                  activeOpacity={0.86}
                >
                  {loadingPackages || loadingAgencies ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="reload" size={16} color="#FFFFFF" />
                      <Text style={styles.restoreButtonText}>
                        Volver a cargar
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View
            style={[
              styles.sectionIntro,
              {
                paddingTop:
                  agencies.length > 0 || shouldShowAgencyState ? 14 : 0,
                paddingBottom: 12,
              },
            ]}
          >
            <View style={styles.sectionTitleAccent} />
            <View style={styles.sectionIconBubble}>
              <FontAwesome name="suitcase" size={11} color="#0E7490" />
            </View>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={[styles.sectionHeroTitle, { marginRight: 10 }]}>
                {selectedAgencyFilter
                  ? `${selectedAgencyFilter.name}`
                  : "Paquetes turísticos"}
              </Text>
              {selectedAgencyFilter && (
                <TouchableOpacity
                  onPress={clearAgencyFilter}
                  style={styles.clearFilterBtn}
                >
                  <Text style={styles.clearFilterText}>Ver todos</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loadingPackages ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={{ marginVertical: 40 }}
            />
          ) : packages.length > 0 ? (
            <View style={styles.packageColumnList}>
              {packages.map((item, idx) => (
                <PackageCard
                  key={`${item.id || idx}-pkg`}
                  pkg={item}
                  width={screenWidth - 36}
                  onOpenDetails={() => openPackageDetail(item)}
                  onReservePress={() => openPackagePayment(item)}
                  getImage={getPackageImage}
                  getGradient={getPackageGradient}
                  places={places}
                />
              ))}
              {hasMorePackages ? (
                <TouchableOpacity
                  style={styles.packageMoreButton}
                  onPress={loadMorePackages}
                  disabled={loadingMorePackages}
                  activeOpacity={0.86}
                >
                  {loadingMorePackages ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.packageMoreText}>Cargar más paquetes</Text>
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyAgencyState}>
              <View style={styles.emptyAgencyIcon}>
                <Ionicons
                  name={packagesError ? "alert-circle-outline" : "briefcase-outline"}
                  size={32}
                  color={packagesError ? "#F97316" : COLORS.textLight}
                />
              </View>
              <Text style={styles.emptyAgencyTitle}>
                {packagesError
                  ? "Ups, no se pudo cargar"
                  : selectedAgencyFilter
                    ? "Pronto habra informacion"
                    : "Pronto habra informacion"}
              </Text>
              <Text style={styles.emptyAgencySub}>
                {packagesError
                  ? "Algo no salio bien al consultar los paquetes turisticos. Vuelve a intentarlo mas tarde o recarga la seccion."
                  : selectedAgencyFilter
                    ? "Esta agencia aun no ha publicado ofertas. Aqui veras planes, precios, fechas y servicios incluidos cuando esten disponibles."
                    : "Aqui apareceran experiencias, recorridos, agencias, precios y servicios para planear tu proxima visita por el Huila."}
              </Text>
              <View style={styles.emptyAgencyActions}>
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={reloadPackagesSection}
                  disabled={loadingPackages || loadingAgencies}
                  activeOpacity={0.86}
                >
                  {loadingPackages || loadingAgencies ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="reload" size={16} color="#FFFFFF" />
                      <Text style={styles.restoreButtonText}>
                        Volver a cargar
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {selectedAgencyFilter ? (
                  <TouchableOpacity
                    style={styles.restoreButtonSecondary}
                    onPress={clearAgencyFilter}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.restoreButtonSecondaryText}>
                      Ver todos
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}
        </View>

        <HomeFooter />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Overlays */}
      <SidePanel
        sidePanelOpen={sidePanelOpen}
        sidePanelTranslateX={sidePanelTranslateX}
        sidePanelWidth={sidePanelWidth}
        handlePanHandlers={leftHandlePanResponder.panHandlers}
        openSidePanel={openSidePanel}
        closeSidePanel={closeSidePanel}
        nearbyContext={nearbyContext}
        loadingNearbyContext={loadingNearbyContext}
        nearbyDisplayPlace={nearbyContext || (nearby.length ? nearby[0] : null)}
        topPlaces={topPlaces}
        bestRatedPlaces={bestRatedPlaces}
        places={places}
        loadingTopPlaces={loadingTopPlaces}
        bestRatedError={bestRatedError}
        onReloadPanelData={handleRefresh}
        getCategoryLabel={getCategoryLabel}
        getTopPlaceMeta={getTopPlaceMeta}
        onSelectTop={(item) =>
          navigation.navigate("PlaceDetail", {
            places: [item],
            initialIndex: 0,
          })
        }
        onSelectNearby={(item, index) =>
          navigation.navigate("PlaceDetail", {
            places: [item],
            initialIndex: 0,
          })
        }
        getPlaceKey={(p) => p?.id || p?.name}
        categories={categories}
      />

      {/* Modals */}
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        user={user}
        logout={logout}
        allowedRoutes={allowedRoutes}
        onRoutePress={(r) => {
          setProfileVisible(false);
          navigation.navigate(r);
        }}
        onOpenVerification={() => {
          setProfileVisible(false);
          setEmailVerifyVisible(true);
        }}
        onAddAccount={() => navigation.navigate("Auth")}
      />

      <VerificationModal
        visible={emailVerifyVisible}
        onClose={() => setEmailVerifyVisible(false)}
        email={user?.email}
        loading={emailVerifyLoading}
        status={emailVerifyStatus}
        token={verifyToken}
        setToken={setVerifyToken}
        onRequestToken={handleRequestVerification}
        onVerifyToken={handleConfirmVerificationToken}
      />

      <AgencyModal
        visible={agencyVisible}
        onClose={() => setAgencyVisible(false)}
        agency={selectedAgency}
      />

      <NotificationPanel
        enabled={Boolean(user) && !sidePanelOpen}
        visible={notificationsVisible}
        onOpen={openNotificationPanel}
        onClose={closeNotificationPanel}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loadingNotifications}
        error={notificationError}
        onRefresh={loadNotifications}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
        onOpenReservations={() => {
          closeNotificationPanel();
          navigation.navigate("MyReservations");
        }}
        panelTranslateX={notificationPanelTranslateX}
        panelWidth={notificationPanelWidth}
        handlePanHandlers={rightHandlePanResponder.panHandlers}
      />

      <ReservationModal
        visible={reservationVisible}
        onClose={closeReservation}
        selectedPackage={selectedPackage}
        reservationForm={reservationForm}
        onReservationChange={handleReservationChange}
        onSubmit={submitReservation}
        loading={reservationLoading}
        formatPrice={formatPrice}
      />

      <PremiumModal
        visible={reservationStatusModal.visible}
        type={reservationStatusModal.type}
        title={reservationStatusModal.title}
        message={reservationStatusModal.message}
        confirmText={reservationStatusModal.confirmText}
        onConfirm={reservationStatusModal.onConfirm}
        onClose={closeReservationStatusModal}
      />

      <PackageDetailModal
        visible={packageDetailVisible}
        pkg={detailPackage}
        onClose={() => {
          setPackageDetailVisible(false);
          setDetailPackage(null);
        }}
        onReserve={() => openPackagePayment(detailPackage)}
        getImage={getPackageImage}
        getGradient={getPackageGradient}
        formatPrice={formatPrice}
        places={places}
      />

      <FilterModal
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        distanceKm={distanceKm}
        setDistanceKm={setDistanceKm}
        categories={categories}
        onApply={() => {
          setFiltersVisible(false);
          performSearch();
        }}
      />

      <ArWebViewModal
        visible={arVisible}
        onClose={() => setArVisible(false)}
        html={generateArHtml()}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
      />

      {/* Other map modals if needed */}
    </KeyboardAvoidingView>
  );
};

export default HomeScreen;
