import React from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES } from "../../../utils/constants";
import { IMAGE_PLACEHOLDER } from "../utils/constants";
import { formatPrice } from "../utils/helpers";
import styles from "../styles";

const PackageCard = ({
  pkg,
  width,
  onPress,
  getImage,
  getGradient,
}) => {
  const sanitizedIncludes = Array.isArray(pkg.includes)
    ? pkg.includes.filter((item) => item && String(item).trim())
    : [];
  const includeList = sanitizedIncludes.slice(0, 3);
  const remaining = Math.max(sanitizedIncludes.length - includeList.length, 0);
  const cityTags = pkg.city ? pkg.city.split("/").map((c) => c.trim()) : [];
  const packageImage = getImage(pkg);
  const hasImage = Boolean(packageImage);
  const fallbackGradient = getGradient(pkg);

  return (
    <View style={[styles.packageCard, { width }]}>
      <View style={styles.packageImageWrapper}>
        {hasImage ? (
          <>
            <Image
              source={{ uri: packageImage }}
              style={styles.packageImage}
              contentFit="cover"
              cachePolicy="disk"
              placeholder={IMAGE_PLACEHOLDER}
              transition={200}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.01)", "rgba(0,0,0,0.55)"]}
              style={styles.packageImageOverlay}
            />
          </>
        ) : (
          <LinearGradient
            colors={fallbackGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.packageImage, styles.packageImageFallback]}
          >
            <FontAwesome name="suitcase" size={22} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        )}
        {cityTags.length > 0 && (
          <View style={styles.packageLocationRow}>
            {cityTags.slice(0, 2).map((tag, idx) => (
              <View key={`${pkg.id}-city-${idx}`} style={styles.packageLocationChip}>
                <FontAwesome name="map-marker" size={9} color="#fff" />
                <Text style={styles.packageLocationText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.packageBody}>
        <Text style={styles.packageTitle} numberOfLines={2}>
          {pkg.title}
        </Text>

        <View style={styles.packageRatingRow}>
          <FontAwesome name="star" size={12} color="#F59E0B" />
          <Text style={styles.packageRatingText}>{pkg.rating ?? 4.8}</Text>
          {pkg.agencyName ? (
            <Text style={styles.packageAgency} numberOfLines={1}>
              · {pkg.agencyName}
            </Text>
          ) : null}
        </View>

        <View style={styles.packageMetaCleanRow}>
          <View style={styles.packageMetaCleanItem}>
            <FontAwesome name="clock-o" size={12} color="#94A3B8" />
            <Text style={styles.packageMetaCleanText}>
              {pkg.days}D / {pkg.nights}N
            </Text>
          </View>
          <View style={styles.packageMetaCleanItem}>
            <FontAwesome name="user" size={12} color="#94A3B8" />
            <Text style={styles.packageMetaCleanText}>{pkg.people}</Text>
          </View>
        </View>

        {includeList.length > 0 && (
          <View style={styles.packageIncludesClean}>
            {includeList.map((item, idx) => (
              <View key={`${pkg.id}-inc-${idx}`} style={styles.packageIncludeCleanRow}>
                <View style={styles.packageIncludeBullet} />
                <Text style={styles.packageIncludeCleanText} numberOfLines={1}>
                  {item}
                </Text>
              </View>
            ))}
            {remaining > 0 && (
              <Text style={[styles.packageIncludeCleanText, { color: "#94A3B8" }]}>
                +{remaining} más
              </Text>
            )}
          </View>
        )}

        <View style={styles.packageFooter}>
          <View style={styles.packagePriceCol}>
            <Text style={styles.packagePriceNote}>por persona</Text>
            <Text style={styles.packagePrice}>{formatPrice(pkg.price)}</Text>
          </View>
          <TouchableOpacity style={styles.packageButtonClean} onPress={onPress}>
            <Text style={styles.packageButtonCleanText}>Reservar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default React.memo(PackageCard);
