import React from "react";
import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
import { BlurView } from "expo-blur";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS } from "../utils/constants";
import styles from "../styles";

const HomeHeader = ({
  user,
  query,
  setQuery,
  onPerformSearch,
  onOpenFilters,
  onOpenProfile,
  onLogin,
  searchSuggestions,
  onSelectSuggestion,
}) => {
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
    <View style={styles.pageHeader}>
      <BlurView intensity={80} tint="light" style={styles.heroOverlay}>
        <View style={styles.topBar}>
          <Text style={styles.locationValue}>Cerca de ti</Text>
          {user ? (
            <TouchableOpacity style={styles.profileButton} onPress={onOpenProfile}>
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
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
              <Text style={styles.loginButtonText}>Iniciar sesion</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>+10 mil viajeros felices</Text>
        </View>

        <Text style={styles.heroTitle}>Descubre{"\n"}el Huila</Text>
        <Text style={styles.heroSubtitle}>
          Paisajes unicos, cultura ancestral y aventura.
        </Text>

        <View style={styles.heroHighlightsRow}>
          {travelHighlights.map((highlight) => (
            <View key={highlight.id} style={styles.heroHighlightChip}>
              <FontAwesome name={highlight.icon} size={12} color={COLORS.primary} />
              <Text style={styles.heroHighlightText}>{highlight.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.heroMoodRow}>
          {travelMood.map((item) => (
            <View key={item.id} style={styles.heroMoodChip}>
              <FontAwesome name={item.icon} size={11} color="#FB923C" />
              <Text style={styles.heroMoodText}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.searchCard}>
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
            <TouchableOpacity style={styles.filterButton} onPress={onOpenFilters}>
              <FontAwesome name="sliders" size={13} color={COLORS.primary} />
              <Text style={styles.filterButtonText}>Filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchButton} onPress={onPerformSearch}>
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
                    <FontAwesome name="map-marker" size={14} color={COLORS.primary} />
                    <Text style={styles.searchSuggestionText} numberOfLines={1}>
                      {item.name || "Lugar sin nombre"}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </BlurView>
    </View>
  );
};

export default React.memo(HomeHeader);
