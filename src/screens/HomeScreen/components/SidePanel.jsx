import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../../utils/constants";
import styles from "../styles/SidePanel.styles";

const SidePanel = ({
  sidePanelOpen,
  panelHintDone,
  panelHintHandleAnim,
  openSidePanel,
  closeSidePanel,
  sidePanelTranslateX,
  sidePanelWidth,
  nearbyContext,
  nearbyDisplayPlace,
  loadingNearbyContext,
  topPlaces,
  bestRatedPlaces,
  places = [],
  topPlacesError,
  bestRatedError,
  loadingTopPlaces,
  getCategoryLabel,
  getTopPlaceMeta,
  onSelectNearby,
  onSelectTop,
  getPlaceKey,
  categories = [],
}) => {
  const getRankedPlaceId = useCallback((item) => {
    return (
      item?.placeId ??
      item?.place_id ??
      item?.siteId ??
      item?.site_id ??
      item?.place?.id ??
      item?.site?.id ??
      item?.id
    );
  }, []);

  const displayPlaceSources = useMemo(
    () => [...(topPlaces || []), ...(places || [])],
    [places, topPlaces],
  );

  const resolveDisplayPlace = useCallback(
    (item) => {
      const nestedPlace = item?.place || item?.site || item?.placeInfo || item?.placeData;
      const rankedId = getRankedPlaceId(item);
      const sourcePlace =
        nestedPlace ||
        displayPlaceSources.find((place) => {
          const sourceId = getRankedPlaceId(place);
          return rankedId != null && sourceId != null && String(sourceId) === String(rankedId);
        });

      if (!sourcePlace) return item;

      const merged = {
        ...sourcePlace,
        ...item,
        id: sourcePlace.id ?? rankedId ?? item?.id,
        name: item?.name || item?.placeName || sourcePlace.name || sourcePlace.placeName || sourcePlace.title,
        title:
          item?.title && item.title !== "Lugar"
            ? item.title
            : sourcePlace.title || sourcePlace.name,
        imageUrls:
          Array.isArray(item?.imageUrls) && item.imageUrls.length
            ? item.imageUrls
            : sourcePlace.imageUrls,
        imageUrl: item?.imageUrl || sourcePlace.imageUrl,
        image: item?.image || sourcePlace.image,
        address: item?.address || item?.location || sourcePlace.address || sourcePlace.location,
        location: item?.location || sourcePlace.location || sourcePlace.address,
        categoryId: item?.categoryId ?? item?.category_id ?? sourcePlace.categoryId ?? sourcePlace.category_id,
        category_id: item?.category_id ?? item?.categoryId ?? sourcePlace.category_id ?? sourcePlace.categoryId,
        categoryName: item?.categoryName || sourcePlace.categoryName,
        category: item?.category || sourcePlace.category,
      };

      return merged;
    },
    [displayPlaceSources, getRankedPlaceId],
  );

  const renderTopPlaceItem = useCallback(
    ({ item }) => {
      const nestedPlace = item?.place || item?.site || item?.placeInfo || item?.placeData;
      const imageUri =
        item?.imageUrls?.[0] ||
        item?.imageUrl ||
        item?.image ||
        nestedPlace?.imageUrls?.[0] ||
        nestedPlace?.imageUrl ||
        nestedPlace?.image ||
        null;
      const title =
        item?.name ||
        item?.placeName ||
        nestedPlace?.name ||
        nestedPlace?.placeName ||
        item?.title ||
        nestedPlace?.title ||
        "Lugar";
      const meta = item?._displayMeta || getTopPlaceMeta(item);
      const address = item?.address || item?.location || nestedPlace?.address || nestedPlace?.location || "";
      const isRatingMeta = typeof meta === "string" && meta.includes("\u2605");
      
      const resolvedCatId = item?.categoryId ?? item?.category_id ?? nestedPlace?.categoryId ?? nestedPlace?.category_id;
      const foundCat = categories?.find((c) => String(c.id) === String(resolvedCatId));
      const categoryLabel = foundCat ? foundCat.name : getCategoryLabel(item) || getCategoryLabel(nestedPlace);
      
      const categoryText =
        categoryLabel ||
        (item?.categoryId != null ? `Categoria ${item.categoryId}` : "");
      const mainTag = isRatingMeta ? categoryText : categoryText || meta;

      return (
        <TouchableOpacity
          style={styles.sidePanelItemCard}
          activeOpacity={0.86}
          onPress={() => {
            closeSidePanel();
            if (item) onSelectTop(item);
          }}
        >
          <View style={styles.sidePanelThumb}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.sidePanelThumbImage}
              />
            ) : (
              <Ionicons name="image-outline" size={16} color="#0E7490" />
            )}
          </View>
          <View style={styles.sidePanelItemInfo}>
            <View style={styles.sidePanelItemTitleRow}>
              <Text style={styles.sidePanelItemTitle} numberOfLines={1}>
                {title}
              </Text>
              {isRatingMeta ? (
                <Text style={styles.sidePanelRatingText}>{meta}</Text>
              ) : null}
            </View>
            {address ? (
              <View style={styles.sidePanelInlineMeta}>
                <Ionicons name="location-outline" size={10} color="#64748B" />
                <Text style={styles.sidePanelItemMeta} numberOfLines={1}>
                  {address}
                </Text>
              </View>
            ) : null}
            <View style={styles.sidePanelMetaRow}>
              {mainTag ? (
                <View
                  style={styles.sidePanelMetaPill}
                >
                  <Text style={styles.sidePanelMetaPillText}>
                    {mainTag}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [closeSidePanel, getCategoryLabel, getTopPlaceMeta, onSelectTop, categories],
  );

  return (
    <View style={styles.sidePanelOverlayContainer} pointerEvents="box-none">
      {!sidePanelOpen ? (
        <Pressable style={styles.sidePanelHandlePress} onPress={openSidePanel}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sidePanelHandle,
              panelHintDone
                ? { opacity: 0.18, transform: [{ translateX: 0 }] }
                : {
                    opacity: panelHintHandleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 0.55],
                    }),
                    transform: [
                      {
                        translateX: panelHintHandleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 6],
                        }),
                      },
                    ],
                  },
            ]}
          />
        </Pressable>
      ) : null}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeSidePanel}
        pointerEvents={sidePanelOpen ? "auto" : "none"}
      >
        <Animated.View
          style={[
            styles.sidePanelOverlay,
            {
              opacity: sidePanelTranslateX.interpolate({
                inputRange: [-sidePanelWidth, 0],
                outputRange: [0, 0.35],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      </Pressable>
      <Animated.View
        style={[
          styles.sidePanel,
          {
            width: sidePanelWidth,
            transform: [{ translateX: sidePanelTranslateX }],
          },
        ]}
      >
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sidePanelScrollContent}
        >
        {loadingNearbyContext ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={styles.sidePanelLoader}
          />
        ) : nearbyDisplayPlace ? (
          <View
            style={styles.sidePanelNearbyCard}
          >
            <Text style={styles.sidePanelNearbyKicker} numberOfLines={1}>
              {nearbyContext
                ? `Estas cerca de ${nearbyDisplayPlace.name}`
                : "Te damos la bienvenida"}
            </Text>
            <View style={styles.sidePanelNearbyRow}>
              <View style={styles.sidePanelNearbyThumb}>
                {nearbyDisplayPlace?.imageUrls?.[0] ? (
                <Image
                  source={{ uri: nearbyDisplayPlace.imageUrls[0] }}
                  style={styles.sidePanelNearbyImage}
                />
                ) : (
                  <Ionicons name="image-outline" size={18} color="#0E7490" />
                )}
              </View>
              <View style={styles.sidePanelNearbyInfo}>
                {nearbyContext ? (
                  <View style={styles.sidePanelWelcomePill}>
                    <Text style={styles.sidePanelBadgeText}>Bienvenido</Text>
                  </View>
                ) : null}
                {!nearbyContext ? (
                  <View style={styles.sidePanelCompactBadgeRow}>
                    <View style={styles.sidePanelBadge}>
                      <Text style={styles.sidePanelBadgeTextLight}>Explora</Text>
                    </View>
                    <View style={styles.sidePanelBadgeOutline}>
                      <Text style={styles.sidePanelBadgeText}>Primer resultado</Text>
                    </View>
                  </View>
                ) : null}
                <View style={styles.sidePanelNearbyTitleRow}>
                  <Text style={styles.sidePanelNearbyTitle} numberOfLines={2}>
                    {nearbyDisplayPlace.name}
                  </Text>
                  <Ionicons name="star" size={15} color="#0E7490" />
                </View>
                <View style={styles.sidePanelNearbyMetaRow}>
                  <Ionicons name="location-outline" size={11} color="#64748B" />
                  <Text style={styles.sidePanelNearbyMeta} numberOfLines={1}>
                    {nearbyDisplayPlace.address ||
                      (categories?.find(c => String(c.id) === String(nearbyDisplayPlace.categoryId ?? nearbyDisplayPlace.category_id))?.name) ||
                      getCategoryLabel(nearbyDisplayPlace) ||
                      "Lugar cercano"}
                  </Text>
                </View>
              </View>
            </View>
            {nearbyDisplayPlace.description ? (
              <Text style={styles.sidePanelNearbyDescription} numberOfLines={3}>
                {nearbyDisplayPlace.description}
              </Text>
            ) : null}
            <View style={styles.sidePanelNearbyActions}>
              {typeof nearbyDisplayPlace.distanceM === "number" ? (
                <View style={styles.sidePanelDistancePill}>
                  <Text style={styles.sidePanelBadgeText}>
                    {Math.round(nearbyDisplayPlace.distanceM)} m
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <TouchableOpacity
                style={styles.sidePanelVisitButton}
                activeOpacity={0.86}
                onPress={() => {
                  closeSidePanel();
                  onSelectNearby(nearbyDisplayPlace);
                }}
              >
                <Text style={styles.sidePanelVisitButtonText}>Visitar</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.sidePanelEmpty}>
            Acercate a un sitio para darte la bienvenida.
          </Text>
        )}

        <View style={styles.sidePanelHeader}>
          <View>
            <Text style={styles.sidePanelTitle}>Mas visitados</Text>
            <Text style={styles.sidePanelSubtitle}>
              Sitios favoritos cerca de la comunidad
            </Text>
          </View>
          {topPlaces.length > 0 ? (
            <View style={styles.sidePanelCountBadge}>
              <Text style={styles.sidePanelCountText}>{topPlaces.length}</Text>
            </View>
          ) : null}
        </View>

        {loadingTopPlaces ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={styles.sidePanelLoader}
          />
        ) : topPlacesError ? (
          <Text style={styles.sidePanelEmpty}>{topPlacesError}</Text>
        ) : topPlaces.length === 0 ? (
          <Text style={styles.sidePanelEmpty}>
            Se el primero en visitar un lugar.
          </Text>
        ) : (
          <View style={styles.sidePanelList}>
            {topPlaces.map((item, index) => (
              <View key={getPlaceKey(item) || `top:${index}`}>
                {renderTopPlaceItem({ item })}
              </View>
            ))}
          </View>
        )}

        <View style={styles.sidePanelHeader}>
          <View>
            <Text style={styles.sidePanelTitle}>Mejor valorados</Text>
            <Text style={styles.sidePanelSubtitle}>
              Sitios con mejor promedio de resenas
            </Text>
          </View>
          {bestRatedPlaces?.length > 0 ? (
            <View style={styles.sidePanelCountBadge}>
              <Text style={styles.sidePanelCountText}>{bestRatedPlaces.length}</Text>
            </View>
          ) : null}
        </View>

        {loadingTopPlaces ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={styles.sidePanelLoader}
          />
        ) : bestRatedError ? (
          <Text style={styles.sidePanelEmpty}>{bestRatedError}</Text>
        ) : !bestRatedPlaces || bestRatedPlaces.length === 0 ? (
          <Text style={styles.sidePanelEmpty}>
            Aun no hay valoraciones suficientes.
          </Text>
        ) : (
          <View style={styles.sidePanelList}>
            {bestRatedPlaces
              .map((item) => {
                const displayItem = resolveDisplayPlace(item);
                const rating = Number(item?.rating ?? item?.avgRating ?? item?.avg_rating);
                const reviews = Number(item?.reviews ?? item?.reviewsCount ?? item?.reviews_count);
                const ratingLabel = Number.isFinite(rating) ? `\u2605 ${rating.toFixed(1)}` : "Sin rating";
                const reviewsLabel = Number.isFinite(reviews) && reviews > 0 ? ` (${reviews})` : "";
                return { ...displayItem, _displayMeta: `${ratingLabel}${reviewsLabel}` };
              })
              .map((item, index) => (
                <View key={getPlaceKey(item) || `best:${index}`}>
                  {renderTopPlaceItem({ item })}
                </View>
              ))}
          </View>
        )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default React.memo(SidePanel);
