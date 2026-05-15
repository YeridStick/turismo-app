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
import { COLORS } from "./utils/constants";
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
    loadingNearbyContext,
    error,
    topPlacesError,
    packagesError,
    agenciesError,
    allPlacesPage,
    setAllPlacesPage,
    hasMorePlaces,
    selectedCategory,
    setSelectedCategory,
    distanceKm,
    setDistanceKm,
    query,
    setQuery,
    coords,
    loadAll,
    loadNearby,
    performSearch,
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
  const sidePanelWidth = 320;
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
          const { dx, dy, x0 } = gesture;
          if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy)) return false;
          if (!sidePanelOpen && x0 > 40) return false;
          return true;
        },
        onPanResponderMove: (_, gesture) => {
          const startX = sidePanelOpen ? 0 : -sidePanelWidth;
          const nextX = Math.min(
            0,
            Math.max(-sidePanelWidth, startX + gesture.dx),
          );
          sidePanelTranslateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
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
    [sidePanelOpen, sidePanelWidth, sidePanelTranslateX],
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
        scrollEnabled={!isInteractingWithMap}
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
              <FontAwesome name="location-arrow" size={11} color="#FB923C" />
            </View>
            <Text style={styles.sectionHeroTitle}>Cerca de ti</Text>
          </View>

          <NearbyMapBlock
            coords={coords}
            filteredNearby={nearby}
            distanceKm={distanceKm}
            isInteractingWithMap={isInteractingWithMap}
            onMapTouchStart={() => setIsInteractingWithMap(true)}
            onMapTouchEnd={() => setIsInteractingWithMap(false)}
            onPlacePress={(item, index) =>
              navigation.navigate("PlaceDetail", {
                places: nearby,
                initialIndex: index,
              })
            }
            onArPress={openAR}
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
                  color="#FB923C"
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

        {/* Agencies Section */}
        {agencies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionIntro}>
              <View style={styles.sectionTitleAccent} />
              <View style={styles.sectionIconBubble}>
                <FontAwesome name="building-o" size={11} color="#FB923C" />
              </View>
              <Text style={styles.sectionHeroTitle}>Agencias locales</Text>
            </View>

            <FlatList
              horizontal
              data={agencies}
              keyExtractor={(item, idx) => `${item.id || idx}-age`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.agencyChip}
                  onPress={() => openAgency(item)}
                >
                  <Text style={styles.agencyChipText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Packages Section */}
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <View style={styles.sectionTitleAccent} />
            <View style={styles.sectionIconBubble}>
              <FontAwesome name="suitcase" size={11} color="#FB923C" />
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
            <FlatList
              horizontal
              data={packages}
              keyExtractor={(item, idx) => `${item.id || idx}-pkg`}
              renderItem={({ item }) => (
                <PackageCard
                  pkg={item}
                  width={300}
                  onOpenDetails={() => openPackageDetail(item)}
                  onReservePress={() => openPackagePayment(item)}
                  getImage={getPackageImage}
                  getGradient={getPackageGradient}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
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
        loadingTopPlaces={loadingTopPlaces}
        getCategoryLabel={getCategoryLabel}
        getTopPlaceMeta={getTopPlaceMeta}
        onSelectTop={(item, index) =>
          navigation.navigate("PlaceDetail", {
            places: topPlaces,
            initialIndex: index,
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
