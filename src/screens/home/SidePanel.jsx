import { FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../../utils/constants";

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
}) => {
  const renderTopPlaceItem = useCallback(
    ({ item }) => {
      const imageUri =
        item?.imageUrls?.[0] || item?.imageUrl || item?.image || null;
      const title = item?.name || item?.title || "Lugar";
      const meta = getTopPlaceMeta(item);
      const address = item?.address || item?.location || "";
      const description = item?.description || "";
      const categoryLabel = getCategoryLabel(item);
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
    [closeSidePanel, getCategoryLabel, getTopPlaceMeta, onSelectTop],
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

const styles = StyleSheet.create({
  sidePanelOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  sidePanelHandlePress: {
    position: "absolute",
    left: 0,
    top: "50%",
    width: 32,
    height: 120,
    marginTop: -60,
    alignItems: "center",
    justifyContent: "center",
  },
  sidePanelHandle: {
    position: "absolute",
    left: 8,
    top: "50%",
    width: 6,
    height: 84,
    marginTop: -42,
    borderRadius: 999,
    backgroundColor: "#5B3CF0",
  },
  sidePanelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0b1120",
  },
  sidePanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#F8FAFF",
    paddingTop: Platform.OS === "ios" ? SPACING.xxl * 1.6 : SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 6, height: 0 },
    elevation: 12,
  },
  sidePanelHeader: {
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  sidePanelTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
    color: "#5B3CF0",
  },
  sidePanelSubtitle: {
    marginTop: 4,
    fontSize: FONT_SIZES.sm,
    color: "#64748B",
  },
  sidePanelLoader: {
    marginTop: SPACING.lg,
  },
  sidePanelEmpty: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    color: "#64748B",
  },
  sidePanelList: {
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  sidePanelItemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: SPACING.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: SPACING.sm,
  },
  sidePanelThumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sidePanelThumbImage: {
    width: "100%",
    height: "100%",
  },
  sidePanelItemInfo: {
    flex: 1,
  },
  sidePanelItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: "#0F172A",
  },
  sidePanelItemMeta: {
    fontSize: FONT_SIZES.sm,
    color: "#64748B",
    marginTop: 2,
  },
  sidePanelMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  sidePanelMetaPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  sidePanelMetaPillOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  sidePanelMetaPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: "#4338CA",
  },
  sidePanelBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  sidePanelBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#5B3CF0",
  },
  sidePanelBadgeOutline: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
  },
  sidePanelBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: "#4338CA",
  },
  sidePanelBadgeTextLight: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.white,
  },
  sidePanelCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
  },
  sidePanelCountText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: "#5B3CF0",
  },
  sidePanelWelcome: {
    padding: SPACING.md,
    backgroundColor: "#EEF2FF",
    borderRadius: 18,
    marginBottom: SPACING.lg,
  },
  sidePanelWelcomeTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
    color: "#0F172A",
  },
  sidePanelWelcomeSubtitle: {
    marginTop: 4,
    fontSize: FONT_SIZES.sm,
    color: "#475569",
  },
  sidePanelNearbyCard: {
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: SPACING.lg,
  },
  sidePanelNearbyImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  sidePanelNearbyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: "#0F172A",
  },
  sidePanelNearbyMeta: {
    marginTop: 4,
    fontSize: FONT_SIZES.sm,
    color: "#64748B",
  },
  sidePanelNearbyDescription: {
    marginTop: 6,
    fontSize: FONT_SIZES.sm,
    color: "#475569",
  },
});

export default SidePanel;
