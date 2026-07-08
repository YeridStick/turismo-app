import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "../styles";
import { COLORS } from "../utils/constants";

const HomeHeader = ({
  user,
  query,
  setQuery,
  onPerformSearch,
  onOpenFilters,
  onOpenProfile,
  onOpenNotifications,
  onLogin,
  unreadNotifications = 0,
  searchSuggestions,
  onSelectSuggestion,
}) => {
  const introAnim = useRef(new Animated.Value(0)).current;
  const chipsFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(chipsFloatAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(chipsFloatAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    floating.start();
    return () => floating.stop();
  }, [chipsFloatAnim, introAnim]);

  const heroInStyle = {
    opacity: introAnim,
    transform: [
      {
        translateY: introAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  const floatingChipStyle = {
    transform: [
      {
        translateY: chipsFloatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        }),
      },
    ],
  };

  const travelHighlights = [
    { id: "nature", icon: "leaf", label: "Naturaleza" },
    { id: "culture", icon: "university", label: "Cultura" },
    { id: "adventure", icon: "compass", label: "Aventura" },
  ];
  const travelMood = [
    { id: "water", icon: "tint", label: "Rutas de agua" },
    { id: "sunset", icon: "sun-o", label: "Atardeceres" },
    { id: "local", icon: "map-signs", label: "Guia local" },
  ];

  return (
    <View>
      <BlurView intensity={54} tint="light" style={styles.heroOverlay}>
        <View style={styles.topBar}>
          <Text style={styles.locationValue}>Cerca de ti</Text>
          {user ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={onOpenNotifications}
                activeOpacity={0.86}
              >
                <FontAwesome name="bell-o" size={15} color={COLORS.primary} />
                {unreadNotifications > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileButton}
                onPress={onOpenProfile}
              >
                <View style={styles.profileAvatarSmall}>
                  {user.urlAvatar || user.avatar ? (
                    <Image
                      source={{ uri: user.urlAvatar || user.avatar }}
                      style={{ width: "100%", height: "100%", borderRadius: 14 }}
                    />
                  ) : (
                    <FontAwesome name="user" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.profileButtonName} numberOfLines={1}>
                  {(user.fullName || user.email || "Usuario").split(" ")[0]}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
              <Text style={styles.loginButtonText}>Iniciar sesion</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View style={[styles.heroBadge, heroInStyle]}>
          <Text style={styles.heroBadgeText}>+10 mil viajeros felices</Text>
        </Animated.View>

        <Animated.Text style={[styles.heroTitle, heroInStyle]}>
          Descubre{"\n"}el Huila
        </Animated.Text>
        <Animated.Text style={[styles.heroSubtitle, heroInStyle]}>
          Naturaleza, pueblos patrimoniales y rutas de aventura.
        </Animated.Text>

        <Animated.View
          style={[styles.heroHighlightsRow, floatingChipStyle, heroInStyle]}
        >
          {travelHighlights.map((highlight) => (
            <View key={highlight.id} style={styles.heroHighlightChip}>
              <FontAwesome
                name={highlight.icon}
                size={12}
                color={COLORS.primary}
              />
              <Text style={styles.heroHighlightText}>{highlight.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          style={[styles.heroMoodRow, floatingChipStyle, heroInStyle]}
        >
          {travelMood.map((item) => (
            <View key={item.id} style={styles.heroMoodChip}>
              <FontAwesome name={item.icon} size={11} color="#FB923C" />
              <Text style={styles.heroMoodText}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View style={[styles.searchCard, heroInStyle]}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <FontAwesome name="search" size={15} color={COLORS.primary} />
              <TextInput
                placeholder="A donde quieres ir?"
                placeholderTextColor="#9CA3AF"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={onPerformSearch}
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>
          </View>
          <View style={styles.searchActions}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={onOpenFilters}
            >
              <FontAwesome name="sliders" size={13} color={COLORS.primary} />
              <Text style={styles.filterButtonText}>Filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={onPerformSearch}
            >
              <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
          </View>
          {searchSuggestions.length ? (
            <View style={styles.searchSuggestions}>
              {searchSuggestions.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.id || item.name || idx}-suggestion`}
                  style={styles.searchSuggestionItem}
                  onPress={() => onSelectSuggestion(item)}
                >
                  <View style={styles.searchSuggestionRow}>
                    <FontAwesome
                      name="map-marker"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.searchSuggestionText} numberOfLines={1}>
                      {item.name || "Lugar sin nombre"}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </Animated.View>
      </BlurView>
    </View>
  );
};

export default React.memo(HomeHeader);
