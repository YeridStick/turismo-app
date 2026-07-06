import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import React, { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { COLORS } from "../../../utils/constants";
import styles from "../styles/SidePanel.styles";
import { getPlaceImage } from "../utils/helpers";

const SidePanel = ({
  sidePanelOpen,
  openSidePanel,
  closeSidePanel,
  sidePanelTranslateX,
  sidePanelWidth,
  handlePanHandlers,
  nearbyContext,
  nearbyDisplayPlace,
  loadingNearbyContext,
  topPlaces = [],
  bestRatedPlaces = [],
  places = [],
  topPlacesError,
  bestRatedError,
  loadingTopPlaces,
  onReloadPanelData,
  getCategoryLabel,
  getTopPlaceMeta,
  onSelectNearby,
  onSelectTop,
  getPlaceKey,
  categories = [],
}) => {
  const particleAnim = useRef(new Animated.Value(0)).current;

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
    () => [...topPlaces, ...places],
    [places, topPlaces],
  );

  const resolveDisplayPlace = useCallback(
    (item) => {
      const nestedPlace =
        item?.place ||
        item?.site ||
        item?.placeInfo ||
        item?.placeData;

      const rankedId = getRankedPlaceId(item);

      const sourcePlace =
        nestedPlace ||
        displayPlaceSources.find((place) => {
          const sourceId = getRankedPlaceId(place);

          return (
            rankedId != null &&
            sourceId != null &&
            String(sourceId) === String(rankedId)
          );
        });

      if (!sourcePlace) return item;

      return {
        ...sourcePlace,
        ...item,
        id: sourcePlace.id ?? rankedId ?? item?.id,
        name:
          item?.name ||
          item?.placeName ||
          sourcePlace.name ||
          sourcePlace.placeName ||
          sourcePlace.title,
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
        address:
          item?.address ||
          item?.location ||
          sourcePlace.address ||
          sourcePlace.location,
        location:
          item?.location ||
          sourcePlace.location ||
          sourcePlace.address,
        categoryId:
          item?.categoryId ??
          item?.category_id ??
          sourcePlace.categoryId ??
          sourcePlace.category_id,
        category_id:
          item?.category_id ??
          item?.categoryId ??
          sourcePlace.category_id ??
          sourcePlace.categoryId,
        categoryName:
          item?.categoryName || sourcePlace.categoryName,
        category: item?.category || sourcePlace.category,
      };
    },
    [displayPlaceSources, getRankedPlaceId],
  );

  const renderTopPlaceItem = useCallback(
    ({ item, index = 0 }) => {
      const nestedPlace =
        item?.place ||
        item?.site ||
        item?.placeInfo ||
        item?.placeData;

      const imageUri = getPlaceImage(item);

      const title =
        item?.name ||
        item?.placeName ||
        nestedPlace?.name ||
        nestedPlace?.placeName ||
        item?.title ||
        nestedPlace?.title ||
        "Lugar";

      const meta = item?._displayMeta || getTopPlaceMeta(item);

      const address =
        item?.address ||
        item?.location ||
        nestedPlace?.address ||
        nestedPlace?.location ||
        "";

      const isRatingMeta =
        typeof meta === "string" && meta.includes("\u2605");

      const resolvedCategoryId =
        item?.categoryId ??
        item?.category_id ??
        nestedPlace?.categoryId ??
        nestedPlace?.category_id;

      const foundCategory = categories.find(
        (category) =>
          String(category.id) === String(resolvedCategoryId),
      );

      const categoryLabel = foundCategory
        ? foundCategory.name
        : getCategoryLabel(item) ||
          getCategoryLabel(nestedPlace);

      const categoryText =
        categoryLabel ||
        (item?.categoryId != null
          ? `Categoria ${item.categoryId}`
          : "");

      const mainTag = isRatingMeta
        ? categoryText
        : categoryText || meta;

      return (
        <Animated.View
          style={[
            styles.sidePanelItemAnimatedWrap,
            {
              opacity: sidePanelTranslateX.interpolate({
                inputRange: [
                  -sidePanelWidth,
                  -sidePanelWidth * 0.34,
                  0,
                ],
                outputRange: [0, 0.55, 1],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateX: sidePanelTranslateX.interpolate({
                    inputRange: [-sidePanelWidth, 0],
                    outputRange: [18 + index * 4, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.sidePanelItemCard}
            activeOpacity={0.86}
            onPress={() => {
              closeSidePanel();

              if (item) {
                onSelectTop(item);
              }
            }}
          >
            <View style={styles.sidePanelThumb}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.sidePanelThumbImage}
                  contentFit="cover"
                />
              ) : (
                <Ionicons
                  name="image-outline"
                  size={16}
                  color="#0E7490"
                />
              )}
            </View>

            <View style={styles.sidePanelItemInfo}>
              <View style={styles.sidePanelItemTitleRow}>
                <Text
                  style={styles.sidePanelItemTitle}
                  numberOfLines={1}
                >
                  {title}
                </Text>

                {isRatingMeta ? (
                  <Text style={styles.sidePanelRatingText}>
                    {meta}
                  </Text>
                ) : null}
              </View>

              {address ? (
                <View style={styles.sidePanelInlineMeta}>
                  <Ionicons
                    name="location-outline"
                    size={10}
                    color="#64748B"
                  />

                  <Text
                    style={styles.sidePanelItemMeta}
                    numberOfLines={1}
                  >
                    {address}
                  </Text>
                </View>
              ) : null}

              <View style={styles.sidePanelMetaRow}>
                {mainTag ? (
                  <View style={styles.sidePanelMetaPill}>
                    <Text style={styles.sidePanelMetaPillText}>
                      {mainTag}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [
      categories,
      closeSidePanel,
      getCategoryLabel,
      getTopPlaceMeta,
      onSelectTop,
      sidePanelTranslateX,
      sidePanelWidth,
    ],
  );

  const nearbyImageUri = useMemo(
    () => getPlaceImage(nearbyDisplayPlace),
    [nearbyDisplayPlace],
  );

  /*
   * El indicador solo aparece cuando todavía no existe información.
   * Si ya hay datos cargados, estos permanecen visibles mientras
   * se realiza una actualización.
   */
  const showNearbyLoader =
    loadingNearbyContext && !nearbyDisplayPlace;

  const showTopPlacesLoader =
    loadingTopPlaces && topPlaces.length === 0;

  const showBestRatedLoader =
    loadingTopPlaces && bestRatedPlaces.length === 0;

  const panelOpenOpacity = sidePanelTranslateX.interpolate({
    inputRange: [-sidePanelWidth, 0],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const panelDrift = sidePanelTranslateX.interpolate({
    inputRange: [-sidePanelWidth, 0],
    outputRange: [-18, 0],
    extrapolate: "clamp",
  });

  const routeTrailForward = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-54, sidePanelWidth * 0.72],
  });

  const routeTrailWide = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, sidePanelWidth * 0.86],
  });

  const routeTrailLift = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -28],
  });

  const routeTrailDrop = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 30],
  });

  const routeTrailOpacity = particleAnim.interpolate({
    inputRange: [0, 0.16, 0.78, 1],
    outputRange: [0, 0.44, 0.26, 0],
  });

  const renderPanelState = useCallback(
    ({
      icon,
      title,
      description,
      tone = "info",
    }) => (
      <View style={styles.sidePanelStateCard}>
        <View
          style={[
            styles.sidePanelStateIcon,
            tone === "error" &&
              styles.sidePanelStateIconError,
          ]}
        >
          <Ionicons
            name={icon}
            size={22}
            color={
              tone === "error"
                ? "#F97316"
                : "#0E7490"
            }
          />
        </View>

        <Text style={styles.sidePanelStateTitle}>
          {title}
        </Text>

        <Text style={styles.sidePanelStateDescription}>
          {description}
        </Text>

        {onReloadPanelData ? (
          <TouchableOpacity
            style={styles.sidePanelReloadButton}
            activeOpacity={0.86}
            onPress={onReloadPanelData}
          >
            <Ionicons
              name="reload"
              size={14}
              color="#0E7490"
            />

            <Text style={styles.sidePanelReloadButtonText}>
              Volver a cargar
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [onReloadPanelData],
  );

  return (
    <View
      style={styles.sidePanelOverlayContainer}
      pointerEvents="box-none"
    >
      <Animated.View
        {...(handlePanHandlers || {})}
        style={[
          styles.sidePanelHandlePress,
          {
            transform: [
              {
                translateX:
                  sidePanelTranslateX.interpolate({
                    inputRange: [-sidePanelWidth, 0],
                    outputRange: [
                      0,
                      sidePanelWidth - 13,
                    ],
                    extrapolate: "clamp",
                  }),
              },
            ],
          },
        ]}
      >
        <Pressable
          style={styles.sidePanelHandleTouch}
          onPress={
            sidePanelOpen
              ? closeSidePanel
              : openSidePanel
          }
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sidePanelHandle,
              {
                backgroundColor: sidePanelOpen
                  ? "rgba(251, 146, 60, 0.68)"
                  : "rgba(14, 116, 144, 0.46)",
              },
            ]}
          />
        </Pressable>
      </Animated.View>

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeSidePanel}
        pointerEvents={
          sidePanelOpen ? "auto" : "none"
        }
      >
        <Animated.View
          style={[
            styles.sidePanelOverlay,
            {
              opacity:
                sidePanelTranslateX.interpolate({
                  inputRange: [
                    -sidePanelWidth,
                    0,
                  ],
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
            transform: [
              {
                translateX: sidePanelTranslateX,
              },
            ],
          },
        ]}
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
      >
        <View style={styles.sidePanelSurface}>
          {Platform.OS === "ios" ? (
            <BlurView
              pointerEvents="none"
              intensity={46}
              tint="light"
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor:
                    "rgba(255,255,255,0.97)",
                },
              ]}
            />
          )}

          <Animated.View
            pointerEvents="none"
            style={[
              styles.sidePanelBackdropArt,
              {
                opacity: panelOpenOpacity,
                transform: [
                  {
                    translateX: panelDrift,
                  },
                ],
              },
            ]}
          >
            <View style={styles.sidePanelWashTop} />
            <View style={styles.sidePanelWashBottom} />

          <Animated.View
            style={[
              styles.sidePanelParticle,
              styles.sidePanelParticleOne,
              {
                opacity: routeTrailOpacity,
                transform: [
                  {
                    translateX: routeTrailForward,
                  },
                  {
                    translateY: routeTrailLift,
                  },
                  {
                    rotate: "-14deg",
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.sidePanelParticle,
              styles.sidePanelParticleTwo,
              {
                opacity: routeTrailOpacity,
                transform: [
                  {
                    translateX: routeTrailWide,
                  },
                  {
                    translateY: routeTrailDrop,
                  },
                  {
                    rotate: "10deg",
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.sidePanelParticle,
              styles.sidePanelParticleThree,
              {
                opacity: routeTrailOpacity,
                transform: [
                  {
                    translateX: routeTrailWide,
                  },
                  {
                    translateY: routeTrailLift,
                  },
                  {
                    rotate: "-12deg",
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.sidePanelParticle,
              styles.sidePanelParticleFour,
              {
                opacity: routeTrailOpacity,
                transform: [
                  {
                    translateX: routeTrailForward,
                  },
                  {
                    translateY: routeTrailDrop,
                  },
                  {
                    rotate: "12deg",
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.sidePanelParticle,
              styles.sidePanelParticleFive,
              {
                opacity: routeTrailOpacity,
                transform: [
                  {
                    translateX: routeTrailWide,
                  },
                  {
                    translateY: routeTrailLift,
                  },
                  {
                    rotate: "-16deg",
                  },
                ],
              },
            ]}
          />
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.sidePanelScrollContent
          }
        >
          <Animated.View
            style={[
              styles.sidePanelHero,
              {
                opacity: panelOpenOpacity,
                transform: [
                  {
                    translateX: panelDrift,
                  },
                ],
              },
            ]}
          >
            <View style={styles.sidePanelHeroIcon}>
              <Ionicons
                name="compass-outline"
                size={18}
                color="#0E7490"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={styles.sidePanelHeroKicker}
              >
                Explora Huila
              </Text>

              <Text
                style={styles.sidePanelHeroTitle}
              >
                Rutas vivas cerca de ti
              </Text>
            </View>
          </Animated.View>

          {showNearbyLoader ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={styles.sidePanelLoader}
            />
          ) : nearbyDisplayPlace ? (
            <Animated.View
              style={[
                {
                  opacity: panelOpenOpacity,
                  transform: [
                    {
                      translateY:
                        sidePanelTranslateX.interpolate(
                          {
                            inputRange: [
                              -sidePanelWidth,
                              0,
                            ],
                            outputRange: [14, 0],
                            extrapolate: "clamp",
                          },
                        ),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.sidePanelNearbyCard}
                activeOpacity={0.86}
                onPress={() => {
                  closeSidePanel();
                  onSelectNearby(
                    nearbyDisplayPlace,
                  );
                }}
              >
                <View
                  style={
                    styles.sidePanelNearbyTopRow
                  }
                >
                  <View
                    style={
                      styles.sidePanelNearbyLabelRow
                    }
                  >
                    <Ionicons
                      name={
                        nearbyContext
                          ? "navigate-outline"
                          : "sparkles-outline"
                      }
                      size={14}
                      color="#0E7490"
                    />

                    <Text
                      style={
                        styles.sidePanelNearbyKicker
                      }
                      numberOfLines={1}
                    >
                      {nearbyContext
                        ? "Estás cerca"
                        : "Recomendado para ti"}
                    </Text>
                  </View>

                  {typeof nearbyDisplayPlace.distanceM ===
                  "number" ? (
                    <View
                      style={
                        styles.sidePanelDistancePill
                      }
                    >
                      <Text
                        style={
                          styles.sidePanelDistanceText
                        }
                      >
                        {Math.round(
                          nearbyDisplayPlace.distanceM,
                        )}{" "}
                        m
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={
                    styles.sidePanelNearbyMainRow
                  }
                >
                  <View
                    style={
                      styles.sidePanelNearbyThumb
                    }
                  >
                    {nearbyImageUri ? (
                      <Image
                        source={{
                          uri: nearbyImageUri,
                        }}
                        style={
                          styles.sidePanelNearbyImage
                        }
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons
                        name="image-outline"
                        size={18}
                        color="#0E7490"
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.sidePanelNearbyInfo
                    }
                  >
                    <Text
                      style={
                        styles.sidePanelNearbyTitle
                      }
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {nearbyDisplayPlace.name}
                    </Text>

                    <View
                      style={
                        styles.sidePanelNearbyMetaRow
                      }
                    >
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#64748B"
                      />

                      <Text
                        style={
                          styles.sidePanelNearbyMeta
                        }
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {nearbyDisplayPlace.address ||
                          categories.find(
                            (category) =>
                              String(
                                category.id,
                              ) ===
                              String(
                                nearbyDisplayPlace.categoryId ??
                                  nearbyDisplayPlace.category_id,
                              ),
                          )?.name ||
                          getCategoryLabel(
                            nearbyDisplayPlace,
                          ) ||
                          "Lugar cercano"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.sidePanelNearbyChevron
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color="#0E7490"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            renderPanelState({
              icon: "location-outline",
              title: "Sin sitio cercano",
              description:
                "Acercate a un destino turistico para mostrarte una bienvenida, detalles rapidos y la accion de visita.",
            })
          )}

          <View style={styles.sidePanelHeader}>
            <View>
              <Text style={styles.sidePanelTitle}>
                Mas visitados
              </Text>

              <Text
                style={styles.sidePanelSubtitle}
              >
                Sitios favoritos cerca de la
                comunidad
              </Text>
            </View>

            {topPlaces.length > 0 ? (
              <View
                style={
                  styles.sidePanelCountBadge
                }
              >
                <Text
                  style={
                    styles.sidePanelCountText
                  }
                >
                  {topPlaces.length}
                </Text>
              </View>
            ) : null}
          </View>

          {showTopPlacesLoader ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={styles.sidePanelLoader}
            />
          ) : topPlacesError ? (
            renderPanelState({
              icon: "alert-circle-outline",
              title: "No se pudo cargar",
              description:
                "El backend no respondio al consultar los sitios mas visitados. Intenta cargar el panel nuevamente.",
              tone: "error",
            })
          ) : topPlaces.length === 0 ? (
            renderPanelState({
              icon: "trending-up-outline",
              title: "Aun no hay visitas",
              description:
                "Cuando la comunidad visite sitios, aqui apareceran los destinos mas populares para descubrir primero.",
            })
          ) : (
            <View style={styles.sidePanelList}>
              {topPlaces.map((item, index) => (
                <View
                  key={
                    getPlaceKey(item) ||
                    `top:${index}`
                  }
                >
                  {renderTopPlaceItem({
                    item,
                    index,
                  })}
                </View>
              ))}
            </View>
          )}

          <View style={styles.sidePanelHeader}>
            <View>
              <Text style={styles.sidePanelTitle}>
                Mejor valorados
              </Text>

              <Text
                style={styles.sidePanelSubtitle}
              >
                Sitios con mejor promedio de
                resenas
              </Text>
            </View>

            {bestRatedPlaces.length > 0 ? (
              <View
                style={
                  styles.sidePanelCountBadge
                }
              >
                <Text
                  style={
                    styles.sidePanelCountText
                  }
                >
                  {bestRatedPlaces.length}
                </Text>
              </View>
            ) : null}
          </View>

          {showBestRatedLoader ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={styles.sidePanelLoader}
            />
          ) : bestRatedError ? (
            renderPanelState({
              icon: "alert-circle-outline",
              title: "No se pudo cargar",
              description:
                "No pudimos consultar los mejor valorados en este momento. Vuelve a intentar mas tarde o recarga.",
              tone: "error",
            })
          ) : bestRatedPlaces.length === 0 ? (
            renderPanelState({
              icon: "star-outline",
              title:
                "Sin valoraciones todavia",
              description:
                "Cuando los visitantes califiquen lugares, aqui veras los sitios con mejor promedio de resenas.",
            })
          ) : (
            <View style={styles.sidePanelList}>
              {bestRatedPlaces
                .map((item) => {
                  const displayItem =
                    resolveDisplayPlace(item);

                  const rating = Number(
                    item?.rating ??
                      item?.avgRating ??
                      item?.avg_rating,
                  );

                  const reviews = Number(
                    item?.reviews ??
                      item?.reviewsCount ??
                      item?.reviews_count,
                  );

                  const ratingLabel =
                    Number.isFinite(rating)
                      ? `\u2605 ${rating.toFixed(1)}`
                      : "Sin rating";

                  const reviewsLabel =
                    Number.isFinite(reviews) &&
                    reviews > 0
                      ? ` (${reviews})`
                      : "";

                  return {
                    ...displayItem,
                    _displayMeta:
                      `${ratingLabel}${reviewsLabel}`,
                  };
                })
                .map((item, index) => (
                  <View
                    key={
                      getPlaceKey(item) ||
                      `best:${index}`
                    }
                  >
                    {renderTopPlaceItem({
                      item,
                      index: index + 3,
                    })}
                  </View>
                ))}
            </View>
          )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
};

export default React.memo(SidePanel);
