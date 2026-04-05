import { FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
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
  topPlacesError,
  loadingTopPlaces,
  getCategoryLabel,
  getTopPlaceMeta,
  onSelectNearby,
  onSelectTop,
  getPlaceKey,
  categories = [],
}) => {
  const renderTopPlaceItem = useCallback(
    ({ item }) => {
      const imageUri =
        item?.imageUrls?.[0] || item?.imageUrl || item?.image || null;
      const title = item?.name || item?.title || "Lugar";
      const meta = getTopPlaceMeta(item);
      const address = item?.address || item?.location || "";
      const description = item?.description || "";
      
      const resolvedCatId = item?.categoryId ?? item?.category_id;
      const foundCat = categories?.find((c) => String(c.id) === String(resolvedCatId));
      const categoryLabel = foundCat ? foundCat.name : getCategoryLabel(item);
      
      const categoryText =
        categoryLabel ||
        (item?.categoryId != null ? `Categoria ${item.categoryId}` : "");

      return (
        <TouchableOpacity
          style={styles.sidePanelItemCard}
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
              <FontAwesome name="map-marker" size={16} color="#64748B" />
            )}
          </View>
          <View style={styles.sidePanelItemInfo}>
            <Text style={styles.sidePanelItemTitle} numberOfLines={1}>
              {title}
            </Text>
            {address ? (
              <Text style={styles.sidePanelItemMeta} numberOfLines={1}>
                {address}
              </Text>
            ) : null}
            {description ? (
              <Text style={styles.sidePanelItemMeta} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
            <View style={styles.sidePanelMetaRow}>
              {meta ? (
                <View style={styles.sidePanelMetaPill}>
                  <Text style={styles.sidePanelMetaPillText}>{meta}</Text>
                </View>
              ) : null}
              {categoryText ? (
                <View
                  style={[styles.sidePanelMetaPill, styles.sidePanelMetaPillOutline]}
                >
                  <Text style={styles.sidePanelMetaPillText}>
                    {categoryText}
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
        {nearbyContext ? (
          <View style={styles.sidePanelWelcome}>
            <Text style={styles.sidePanelWelcomeTitle}>Bienvenido</Text>
            <Text style={styles.sidePanelWelcomeSubtitle}>
              Estás cerca de este lugar.
            </Text>
          </View>
        ) : null}

        {loadingNearbyContext ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={styles.sidePanelLoader}
          />
        ) : nearbyDisplayPlace ? (
          <TouchableOpacity
            style={styles.sidePanelNearbyCard}
            onPress={() => {
              closeSidePanel();
              onSelectNearby(nearbyDisplayPlace);
            }}
          >
            <View style={styles.sidePanelBadgeRow}>
              <View style={styles.sidePanelBadge}>
                <Text style={styles.sidePanelBadgeTextLight}>
                  {nearbyContext ? "Cerca de ti" : "Explora"}
                </Text>
              </View>
              {!nearbyContext ? (
                <View style={styles.sidePanelBadgeOutline}>
                  <Text style={styles.sidePanelBadgeText}>
                    Primer resultado
                  </Text>
                </View>
              ) : null}
              {typeof nearbyDisplayPlace.distanceM === "number" ? (
                <View style={styles.sidePanelBadgeOutline}>
                  <Text style={styles.sidePanelBadgeText}>
                    {Math.round(nearbyDisplayPlace.distanceM)} m
                  </Text>
                </View>
              ) : null}
            </View>
            {nearbyDisplayPlace?.imageUrls?.[0] ? (
              <Image
                source={{ uri: nearbyDisplayPlace.imageUrls[0] }}
                style={styles.sidePanelNearbyImage}
              />
            ) : null}
            <Text style={styles.sidePanelNearbyTitle} numberOfLines={2}>
              {nearbyDisplayPlace.name}
            </Text>
            <Text style={styles.sidePanelNearbyMeta} numberOfLines={1}>
              {nearbyDisplayPlace.address ||
                (categories?.find(c => String(c.id) === String(nearbyDisplayPlace.categoryId ?? nearbyDisplayPlace.category_id))?.name) ||
                getCategoryLabel(nearbyDisplayPlace) ||
                "Lugar cercano"}
            </Text>
            {nearbyDisplayPlace.description ? (
              <Text style={styles.sidePanelNearbyDescription} numberOfLines={3}>
                {nearbyDisplayPlace.description}
              </Text>
            ) : null}
            {nearbyDisplayPlace.categoryId != null ? (
              <Text style={styles.sidePanelNearbyMeta}>
                Categoria {nearbyDisplayPlace.categoryId}
              </Text>
            ) : null}
            {nearbyDisplayPlace.lat != null &&
            nearbyDisplayPlace.lng != null ? (
              <Text style={styles.sidePanelNearbyMeta}>
                {Number(nearbyDisplayPlace.lat).toFixed(3)},{" "}
                {Number(nearbyDisplayPlace.lng).toFixed(3)}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <Text style={styles.sidePanelEmpty}>
            Acércate a un sitio para darte la bienvenida.
          </Text>
        )}

        <View style={styles.sidePanelHeader}>
          <View>
            <Text style={styles.sidePanelTitle}>Más visitados</Text>
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
            Sé el primero en visitar un lugar.
          </Text>
        ) : (
          <FlatList
            data={topPlaces}
            keyExtractor={(item, index) => getPlaceKey(item) || `top:${index}`}
            renderItem={renderTopPlaceItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sidePanelList}
          />
        )}
      </Animated.View>
    </View>
  );
};

export default React.memo(SidePanel);
