import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { IMAGE_PLACEHOLDER } from "../../utils/constants";
import styles from "../../styles";

const PackageDetailModal = ({
  visible,
  pkg,
  onClose,
  onReserve,
  getImage,
  getGradient,
  formatPrice,
  places = [],
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isCompact = screenWidth < 400 || screenHeight < 760;
  const detailImageHeight = isCompact ? 200 : 240;
  const bodyMaxHeight = Math.max(
    340,
    Math.floor(screenHeight * (isCompact ? 0.46 : 0.54)),
  );

  if (!pkg) return null;

  const sanitizedIncludes = Array.isArray(pkg.includes)
    ? pkg.includes.filter((item) => item && String(item).trim())
    : [];
  const cityTags = pkg.city ? pkg.city.split("/").map((c) => c.trim()) : [];
  const packageImage = getImage(pkg);
  const hasImage = Boolean(packageImage);
  const fallbackGradient = getGradient(pkg);
  const placeLookup = new Map(
    (places || [])
      .filter((place) => place?.id != null)
      .map((place) => [String(place.id), place]),
  );
  const rawPackagePlaces =
    (Array.isArray(pkg.places) && pkg.places) ||
    (Array.isArray(pkg.sites) && pkg.sites) ||
    (Array.isArray(pkg.destinations) && pkg.destinations) ||
    [];
  const placeIds =
    (Array.isArray(pkg.placeIds) && pkg.placeIds) ||
    (Array.isArray(pkg.place_ids) && pkg.place_ids) ||
    (Array.isArray(pkg.siteIds) && pkg.siteIds) ||
    (Array.isArray(pkg.site_ids) && pkg.site_ids) ||
    [];
  const routePlaces = rawPackagePlaces.length
    ? rawPackagePlaces
        .map((place) => {
          const placeId = place?.place_id ?? place?.placeId ?? place?.id ?? place;
          const found = placeLookup.get(String(placeId));
          return found || place;
        })
        .filter(Boolean)
    : placeIds
        .map((placeId) => placeLookup.get(String(placeId)) || { id: placeId })
        .filter(Boolean);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.packageDetailCard,
            { width: Math.min(screenWidth - 20, 740) },
          ]}
        >
          {hasImage ? (
            <Image
              source={{ uri: packageImage }}
              style={[styles.packageDetailImage, { height: detailImageHeight }]}
              contentFit="cover"
              cachePolicy="disk"
              placeholder={IMAGE_PLACEHOLDER}
              transition={180}
            />
          ) : (
            <LinearGradient
              colors={fallbackGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.packageDetailImage,
                styles.packageImageFallback,
                { height: detailImageHeight },
              ]}
            >
              <FontAwesome name="suitcase" size={28} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          )}

          <ScrollView
            style={{ maxHeight: bodyMaxHeight }}
            contentContainerStyle={styles.packageDetailBody}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.packageDetailTitle}>{pkg.title || "Paquete turístico"}</Text>

            <View style={styles.packageRatingRow}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={styles.packageRatingText}>{pkg.rating ?? 4.8}</Text>
              {pkg.agencyName ? (
                <Text style={styles.packageAgency}>· {pkg.agencyName}</Text>
              ) : null}
            </View>

            <View style={styles.packageMetaCleanRow}>
              <View style={styles.packageMetaCleanItem}>
                <FontAwesome name="clock-o" size={12} color="#94A3B8" />
                <Text style={styles.packageMetaCleanText}>
                  {pkg.days ?? "-"}D / {pkg.nights ?? "-"}N
                </Text>
              </View>
              <View style={styles.packageMetaCleanItem}>
                <FontAwesome name="user" size={12} color="#94A3B8" />
                <Text style={styles.packageMetaCleanText}>{pkg.people || "-"}</Text>
              </View>
            </View>

            {cityTags.length > 0 && (
              <View style={styles.packageVibeRow}>
                {cityTags.map((tag, idx) => (
                  <View key={`${pkg.id || pkg.title}-city-detail-${idx}`} style={styles.packageLocationChip}>
                    <FontAwesome name="map-marker" size={10} color="#fff" />
                    <Text style={styles.packageLocationText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.packageDetailDescription}>
              {pkg.description || "Disfruta una experiencia turística completa con rutas, cultura local y momentos inolvidables."}
            </Text>

            <View style={styles.packageDetailRouteSection}>
              <View style={styles.packageDetailSectionHeader}>
                <View style={styles.packageDetailSectionIcon}>
                  <FontAwesome name="map-signs" size={13} color="#0E7490" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packageDetailSectionTitle}>
                    Ruta y sitios incluidos
                  </Text>
                  <Text style={styles.packageDetailSectionSubtitle}>
                    Destinos vinculados a esta experiencia
                  </Text>
                </View>
              </View>

              {routePlaces.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.packageDetailRouteScroller}
                  nestedScrollEnabled
                  directionalLockEnabled
                  keyboardShouldPersistTaps="handled"
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onTouchStart={(event) => event.stopPropagation?.()}
                  onTouchMove={(event) => event.stopPropagation?.()}
                >
                  {routePlaces.map((place, idx) => {
                    const placeId =
                      place?.place_id ?? place?.placeId ?? place?.id ?? idx;
                    const placeName =
                      place?.name ||
                      place?.placeName ||
                      place?.title ||
                      `Sitio #${placeId}`;
                    const placeMeta =
                      place?.categoryName ||
                      place?.category?.name ||
                      place?.city ||
                      place?.location ||
                      place?.address ||
                      "Destino turistico";
                    const imageUri =
                      place?.imageUrls?.[0] ||
                      place?.imageUrl ||
                      place?.image ||
                      null;

                    return (
                      <View
                        key={`${pkg.id || pkg.title}-detail-route-${placeId}-${idx}`}
                        style={styles.packageDetailRouteCard}
                      >
                        <View style={styles.packageDetailRouteMedia}>
                          {imageUri ? (
                            <Image
                              source={{ uri: imageUri }}
                              style={styles.packageDetailRouteImage}
                              contentFit="cover"
                              cachePolicy="disk"
                              placeholder={IMAGE_PLACEHOLDER}
                              transition={160}
                            />
                          ) : (
                            <LinearGradient
                              colors={["#0E7490", "#14B8A6"]}
                              style={styles.packageDetailRouteImageFallback}
                            >
                              <FontAwesome
                                name="map-marker"
                                size={18}
                                color="rgba(255,255,255,0.82)"
                              />
                            </LinearGradient>
                          )}
                          <View style={styles.packageDetailRouteStep}>
                            <Text style={styles.packageDetailRouteStepText}>
                              {idx + 1}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.packageDetailRouteInfo}>
                          <Text
                            style={styles.packageDetailRouteName}
                            numberOfLines={2}
                          >
                            {placeName}
                          </Text>
                          <View style={styles.packageDetailRouteMetaRow}>
                            <FontAwesome name="map-marker" size={10} color="#64748B" />
                            <Text
                              style={styles.packageDetailRouteMeta}
                              numberOfLines={1}
                            >
                              {placeMeta}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.packageDetailRouteEmpty}>
                  <FontAwesome name="map-marker" size={14} color="#64748B" />
                  <Text style={styles.packageDetailRouteEmptyText}>
                    Los sitios de esta experiencia seran confirmados por la agencia.
                  </Text>
                </View>
              )}
            </View>

            {sanitizedIncludes.length > 0 && (
              <View style={styles.packageIncludesClean}>
                {sanitizedIncludes.map((item, idx) => (
                  <View key={`${pkg.id || pkg.title}-inc-detail-${idx}`} style={styles.packageIncludeCleanRow}>
                    <View style={styles.packageIncludeBullet} />
                    <Text style={styles.packageIncludeCleanText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.packageDetailFooter,
              isCompact && styles.packageDetailFooterStack,
            ]}
          >
            <View style={styles.packagePriceCol}>
              <Text style={styles.packagePriceNote}>por persona</Text>
              <Text
                style={styles.packagePrice}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {formatPrice(pkg.price || 0)}
              </Text>
            </View>

            <View style={styles.packageDetailActionsRow}>
              <TouchableOpacity
                style={[styles.packageDetailCloseButton, styles.packageDetailCloseButtonFlex]}
                onPress={onClose}
              >
                <Text style={styles.packageDetailCloseText}>Cerrar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.packageDetailReserveButton,
                  styles.packageDetailReserveButtonFlex,
                ]}
                onPress={onReserve}
              >
                <LinearGradient
                  colors={["#14B8A6", "#FB923C"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.packageDetailReserveGradient}
                >
                  <Text style={styles.packageDetailReserveText}>Reservar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(PackageDetailModal);
