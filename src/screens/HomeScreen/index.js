import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    ImageBackground,
    KeyboardAvoidingView,
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
import HeroMediaBackground from "./components/HeroMediaBackground";
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
import { useModalState } from "./hooks/useModalState";
import useNotifications from "./hooks/useNotifications";
import useReservation from "./hooks/useReservation";
import useVerification from "./hooks/useVerification";

// Constants & Helpers
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import AnimatedBackground from "../../components/ui/AnimatedBackground";
import { PremiumModal } from "../../components/ui/PremiumModal";
import styles from "./styles";
import { COLORS, HERO_IMAGE, HERO_VIDEO, screenWidth } from "./utils/constants";
import {
    formatPrice,
    getCategoryLabel,
    getPackageGradient,
    getPackageImage,
    getPlaceImages,
    getPlaceVideo,
} from "./utils/helpers";

const AGENCY_COLUMN_WIDTH = 310;
const AGENCY_COLUMN_GAP = 12;
const PANEL_HANDLE_WIDTH = 25;
const PANEL_WIDTH = screenWidth - PANEL_HANDLE_WIDTH;

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
    onRequireVerification: () => openModal('verification'),
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

  // Modal State Management
  const { modals, modalData, openModal, closeModal, updateModalData } = useModalState();

  // Local UI State
  const [isInteractingWithMap, setIsInteractingWithMap] = useState(false);
  const [mapGestureLocked, setMapGestureLocked] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [panelMotionCount, setPanelMotionCount] = useState(0);
  const [agencyPageIndex, setAgencyPageIndex] = useState(0);
  const visualSeedRef = useRef(Math.floor(Math.random() * 100000));

  const displayPlaces = useMemo(() => {
    return query.trim() || selectedCategory !== "todos"
      ? searchResults
      : places;
  }, [query, selectedCategory, searchResults, places]);

  const visualPlacePool = useMemo(
    () => [
      ...topPlaces,
      ...bestRatedPlaces,
      ...popular,
      ...nearby,
      ...displayPlaces,
      ...places,
    ],
    [bestRatedPlaces, displayPlaces, nearby, places, popular, topPlaces],
  );

  const siteImageUris = useMemo(() => {
    const uniqueUris = new Set();

    visualPlacePool
      .flatMap((item) => getPlaceImages(item))
      .filter(Boolean)
      .forEach((uri) => uniqueUris.add(uri));

    return Array.from(uniqueUris);
  }, [visualPlacePool]);

  const pickSiteImage = useCallback(
    (offset = 0, fallback = HERO_IMAGE) => {
      if (!siteImageUris.length) return fallback;
      const index =
        (visualSeedRef.current + offset) % siteImageUris.length;
      return siteImageUris[index] || fallback;
    },
    [siteImageUris],
  );

  const heroImageUri = useMemo(() => {
    return pickSiteImage(0, HERO_IMAGE);
  }, [pickSiteImage]);

  const heroVideoUri = useMemo(() => {
    const featuredVideoPlace = visualPlacePool.find((item) =>
      getPlaceVideo(item),
    );

    return getPlaceVideo(featuredVideoPlace) || HERO_VIDEO;
  }, [visualPlacePool]);

  const catalogBannerImageUri = useMemo(() => {
    return pickSiteImage(3, heroImageUri);
  }, [heroImageUri, pickSiteImage]);

  const packageBannerImageUri = useMemo(() => {
    return pickSiteImage(8, heroImageUri);
  }, [heroImageUri, pickSiteImage]);

  const footerImageUris = useMemo(
    () => [
      pickSiteImage(11, heroImageUri),
      pickSiteImage(14, heroImageUri),
      pickSiteImage(17, heroImageUri),
    ],
    [heroImageUri, pickSiteImage],
  );

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

  const handlePanelMotionStart = useCallback(() => {
    setPanelMotionCount((count) => count + 1);
  }, []);

  const handlePanelMotionEnd = useCallback(() => {
    setPanelMotionCount((count) => Math.max(0, count - 1));
  }, []);

  const closeSidePanel = useCallback(() => {
    setSidePanelOpen(false);
  }, []);

  const closeNotificationPanel = useCallback(() => {
    setNotificationsVisible(false);
  }, []);

  const openSidePanel = useCallback(() => {
    if (notificationsVisible) {
      closeNotificationPanel();
    }

    setSidePanelOpen(true);
  }, [closeNotificationPanel, notificationsVisible]);

  const openNotificationPanel = useCallback(() => {
    if (sidePanelOpen) {
      closeSidePanel();
    }

    setNotificationsVisible(true);
  }, [closeSidePanel, sidePanelOpen]);

  openNotificationPanelRef.current = openNotificationPanel;

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

  const openAgency = useCallback((agency) => {
    openModal('agency', { selectedAgency: agency });
    setSelectedAgencyFilter(agency);
  }, [openModal, setSelectedAgencyFilter]);

  const selectAgencyFilter = useCallback(
    (agency) => {
      setSelectedAgencyFilter((current) =>
        current?.id === agency?.id ? null : agency,
      );
    },
    [setSelectedAgencyFilter],
  );

  const openPackageDetail = useCallback((pkg) => {
    openModal('packageDetail', { selectedPackage: pkg });
  }, [openModal]);

  const openPackagePayment = useCallback(
    (pkg) => {
      if (!pkg) return;
      closeModal('packageDetail', false);
      openReservation(pkg);
    },
    [closeModal, openReservation],
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
    >
      <AnimatedBackground />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loadingAll} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isInteractingWithMap && !mapGestureLocked}
      >
        <View style={styles.pageHeader}>
          <HeroMediaBackground imageUri={heroImageUri} videoUri={heroVideoUri}>
            <View style={styles.heroPhotoWash} pointerEvents="none" />
            <HomeHeader
              user={user}
              query={query}
              setQuery={setQuery}
              onPerformSearch={performSearch}
              onOpenFilters={() => openModal('filter')}
              onOpenProfile={() => openModal('profile')}
              onOpenNotifications={openNotificationPanel}
              unreadNotifications={unreadCount}
              onLogin={() => navigation.navigate("Auth")}
              searchSuggestions={
                query.trim()
                  ? places
                      .filter((p) =>
                        (p.name || "")
                          .toLowerCase()
                          .includes(query.toLowerCase()),
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
          </HeroMediaBackground>
        </View>

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
            pauseMapUpdates={
              panelMotionCount > 0 || sidePanelOpen || notificationsVisible
            }
          />
        </View>

        {/* Catalog Section */}
        {displayPlaces.length > 0 && (
          <View style={styles.section}>
            <ImageBackground
              source={{ uri: catalogBannerImageUri }}
              style={styles.sectionPhotoBanner}
              imageStyle={styles.sectionPhotoImage}
              resizeMode="cover"
            >
              <View style={styles.sectionPhotoOverlay} />
              <View style={styles.sectionPhotoContent}>
                <Text style={styles.sectionPhotoKicker}>Inspiracion local</Text>
                <Text style={styles.sectionPhotoTitle} numberOfLines={2}>
                  Lugares con historia, paisaje y aventura
                </Text>
              </View>
            </ImageBackground>

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
          <ImageBackground
            source={{ uri: packageBannerImageUri }}
            style={styles.sectionPhotoBanner}
            imageStyle={styles.sectionPhotoImage}
            resizeMode="cover"
          >
            <View style={styles.sectionPhotoOverlay} />
            <View style={styles.sectionPhotoContent}>
              <Text style={styles.sectionPhotoKicker}>Planes y rutas</Text>
              <Text style={styles.sectionPhotoTitle} numberOfLines={2}>
                Experiencias listas para recorrer el Huila
              </Text>
            </View>
          </ImageBackground>

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

        <HomeFooter imageUris={footerImageUris} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Overlays */}
      <SidePanel
        sidePanelOpen={sidePanelOpen}
        enabled={!notificationsVisible && !mapGestureLocked}
        sidePanelWidth={PANEL_WIDTH}
        openSidePanel={openSidePanel}
        closeSidePanel={closeSidePanel}
        onMotionStart={handlePanelMotionStart}
        onMotionEnd={handlePanelMotionEnd}
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
        visible={modals.profile}
        onClose={() => closeModal('profile')}
        user={user}
        logout={logout}
        allowedRoutes={allowedRoutes}
        onRoutePress={(r) => {
          closeModal('profile');
          navigation.navigate(r);
        }}
        onOpenVerification={() => {
          closeModal('profile');
          openModal('verification');
        }}
        onAddAccount={() => navigation.navigate("Auth")}
      />

      <VerificationModal
        visible={modals.verification}
        onClose={() => closeModal('verification')}
        email={user?.email}
        loading={emailVerifyLoading}
        status={emailVerifyStatus}
        token={verifyToken}
        setToken={setVerifyToken}
        onRequestToken={handleRequestVerification}
        onVerifyToken={handleConfirmVerificationToken}
      />

      <AgencyModal
        visible={modals.agency}
        onClose={() => closeModal('agency')}
        agency={modalData.selectedAgency}
      />

      <NotificationPanel
        enabled={Boolean(user) && !sidePanelOpen && !mapGestureLocked}
        visible={notificationsVisible}
        onOpen={openNotificationPanel}
        onClose={closeNotificationPanel}
        onMotionStart={handlePanelMotionStart}
        onMotionEnd={handlePanelMotionEnd}
        roles={roles}
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
        onOpenFavoritePlace={(favoritePlace) => {
          closeNotificationPanel();
          navigation.navigate("PlaceDetail", {
            place: favoritePlace,
            places: [favoritePlace],
            initialIndex: 0,
          });
        }}
        panelWidth={PANEL_WIDTH}
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
        visible={modals.packageDetail}
        pkg={modalData.selectedPackage}
        onClose={() => closeModal('packageDetail')}
        onReserve={() => openPackagePayment(modalData.selectedPackage)}
        getImage={getPackageImage}
        getGradient={getPackageGradient}
        formatPrice={formatPrice}
        places={places}
      />

      <FilterModal
        visible={modals.filter}
        onClose={() => closeModal('filter')}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        distanceKm={distanceKm}
        setDistanceKm={setDistanceKm}
        categories={categories}
        onApply={() => {
          closeModal('filter');
          performSearch();
        }}
      />

      <ArWebViewModal
        visible={modals.ar}
        onClose={() => closeModal('ar')}
        html={generateArHtml()}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
      />

      {/* Other map modals if needed */}
    </KeyboardAvoidingView>
  );
};

export default HomeScreen;
