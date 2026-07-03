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
import PackageCard from "./components/PackageCard";
import PlaceCard from "./components/PlaceCard";
import SidePanel from "./components/SidePanel";

// Modals
import AgencyModal from "./components/modals/AgencyModal";
import ArWebViewModal from "./components/modals/ArWebViewModal";
import FilterModal from "./components/modals/FilterModal";
import PackageDetailModal from "./components/modals/PackageDetailModal";
import PaymentModal from "./components/modals/PaymentModal";
import ProfileModal from "./components/modals/ProfileModal";
import VerificationModal from "./components/modals/VerificationModal";

// Hooks
import useAR from "./hooks/useAR";
import useHomeData from "./hooks/useHomeData";
import usePayment from "./hooks/usePayment";
import useVerification from "./hooks/useVerification";

// Constants & Helpers
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import AnimatedBackground from "../../components/ui/AnimatedBackground";
import styles from "./styles";
import { COLORS, screenWidth } from "./utils/constants";
import {
  formatPrice,
  getCategoryLabel,
  getPackageGradient,
  getPackageImage,
} from "./utils/helpers";

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

  // Payment Logic Hook
  const {
    paymentVisible,
    setPaymentVisible,
    selectedPackage,
    setSelectedPackage,
    paymentForm,
    handlePaymentChange,
    closePayment,
  } = usePayment();

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

  // SidePanel Animation
  const sidePanelWidth = 360;
  const sidePanelTranslateX = useRef(
    new Animated.Value(-sidePanelWidth),
  ).current;
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [panelHintDone, setPanelHintDone] = useState(false);
  const panelHintHandleAnim = useRef(new Animated.Value(0)).current;

  // Open SidePanel
  const openSidePanel = useCallback(() => {
    Animated.timing(sidePanelTranslateX, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSidePanelOpen(true));
  }, [sidePanelTranslateX]);

  // Close SidePanel
  const closeSidePanel = useCallback(() => {
    Animated.timing(sidePanelTranslateX, {
      toValue: -sidePanelWidth,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSidePanelOpen(false));
  }, [sidePanelTranslateX, sidePanelWidth]);

  // Pan Responder Logic
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (mapGestureLocked) return false;
          const { dx, dy, x0 } = gesture;
          if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy)) return false;
          if (!sidePanelOpen && x0 > 40) return false;
          return true;
        },
        onPanResponderMove: (_, gesture) => {
          if (mapGestureLocked) return;
          const startX = sidePanelOpen ? 0 : -sidePanelWidth;
          const nextX = Math.min(
            0,
            Math.max(-sidePanelWidth, startX + gesture.dx),
          );
          sidePanelTranslateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
          if (mapGestureLocked) return;
          const startX = sidePanelOpen ? 0 : -sidePanelWidth;
          const nextX = startX + gesture.dx;
          const shouldOpen = nextX > -sidePanelWidth / 2 || gesture.vx > 0.5;

          Animated.timing(sidePanelTranslateX, {
            toValue: shouldOpen ? 0 : -sidePanelWidth,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => setSidePanelOpen(shouldOpen));
        },
      }),
    [mapGestureLocked, sidePanelOpen, sidePanelWidth, sidePanelTranslateX],
  );

  // Roles-based routes
  // Roles-based routes with enhanced metadata
  const allowedRoutes = useMemo(() => {
    const norm = (roles || []).map((r) => r.toLowerCase());
    const isAdmin = norm.includes("admin");
    const has = (n) => isAdmin || n.some((r) => norm.includes(r));

    const routes = [
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
      const canAccess = has(r.roles);
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
      setSelectedPackage(pkg);
      setPaymentVisible(true);
    },
    [setSelectedPackage, setPaymentVisible],
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
              <FontAwesome
                name={agencies.length > 0 ? "building-o" : "suitcase"}
                size={11}
                color="#0E7490"
              />
            </View>
            <Text style={styles.sectionHeroTitle}>
              {agencies.length > 0 ? "Agencias locales" : "Paquetes turísticos"}
            </Text>
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
            <View style={styles.agencyFilterList}>
              {agencies.map((item, idx) => {
                const isActive = selectedAgencyFilter?.id === item?.id;
                return (
                <TouchableOpacity
                  key={`${item.id || idx}-age`}
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
              {hasMoreAgencies ? (
                <TouchableOpacity
                  style={styles.agencyMoreButton}
                  onPress={loadMoreAgencies}
                  disabled={loadingMoreAgencies}
                  activeOpacity={0.86}
                >
                  {loadingMoreAgencies ? (
                    <ActivityIndicator size="small" color="#0E7490" />
                  ) : (
                    <>
                      <Text style={styles.agencyMoreText}>Ver más agencias</Text>
                      <Ionicons name="chevron-down" size={15} color="#0E7490" />
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
              )}
            </View>
          )}

          <View
            style={[
              styles.sectionIntro,
              { paddingTop: agencies.length > 0 ? 14 : 0, paddingBottom: 12 },
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
          ) : selectedAgencyFilter ? (
            <View style={styles.emptyAgencyState}>
              <View style={styles.emptyAgencyIcon}>
                <Ionicons
                  name="briefcase-outline"
                  size={32}
                  color={COLORS.textLight}
                />
              </View>
              <Text style={styles.emptyAgencyTitle}>
                Sin paquetes disponibles
              </Text>
              <Text style={styles.emptyAgencySub}>
                Esta agencia aún no ha publicado ofertas. Cambia de agencia o
                regresa al catálogo completo.
              </Text>
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={clearAgencyFilter}
              >
                <Text style={styles.restoreButtonText}>
                  Regresar a ver todos
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <HomeFooter />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Overlays */}
      <SidePanel
        sidePanelOpen={sidePanelOpen}
        sidePanelTranslateX={sidePanelTranslateX}
        sidePanelWidth={sidePanelWidth}
        panelHintDone={panelHintDone}
        panelHintHandleAnim={panelHintHandleAnim}
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

      <PaymentModal
        visible={paymentVisible}
        onClose={closePayment}
        selectedPackage={selectedPackage}
        paymentForm={paymentForm}
        onPaymentChange={handlePaymentChange}
        formatPrice={formatPrice}
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
