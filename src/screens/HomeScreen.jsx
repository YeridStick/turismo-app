import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ENDPOINTS } from '../config/api.config';
import api from '../services/api';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

const Card = ({ title, subtitle, meta, compact = false }) => {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const [places, setPlaces] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [distanceKm, setDistanceKm] = useState(2);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [coords, setCoords] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const imageListRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoadingAll(true);
    setError('');
    try {
      const response = await api.get(ENDPOINTS.PLACES_ALL);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setPlaces(data);
      setPopular(data.slice(0, 6));
    } catch (err) {
      setError('No se pudo cargar el catálogo.');
    } finally {
      setLoadingAll(false);
    }
  };

  const ensureLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permiso de ubicación denegado.');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({});
    return loc.coords;
  };

  const performSearch = async () => {
    if (!query.trim() && selectedCategory === 'todos') {
      setPopular(places.slice(0, 6));
      return;
    }
    setLoadingAll(true);
    setError('');
    try {
      let coordsData = coords;
      if (!coordsData && distanceKm > 0) {
        coordsData = await ensureLocation();
        if (coordsData) setCoords(coordsData);
      }
      const response = await api.get(ENDPOINTS.PLACES_SEARCH, {
        params: {
          q: query.trim() || undefined,
          categoryId: selectedCategory !== 'todos' ? selectedCategory : undefined,
          lat: coordsData?.latitude,
          lng: coordsData?.longitude,
          radiusMeters: coordsData ? distanceKm * 1000 : undefined,
        },
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setPopular(data.slice(0, 6));
    } catch (err) {
      setError('No se pudo realizar la búsqueda.');
    } finally {
      setLoadingAll(false);
      setFiltersVisible(false);
    }
  };

  const loadNearby = async () => {
    setLoadingNearby(true);
    setError('');
    try {
      const coordsData = await ensureLocation();
      if (!coordsData) {
        setLoadingNearby(false);
        return;
      }
      setCoords(coordsData);
      const params = {
        lat: coordsData.latitude,
        lng: coordsData.longitude,
        radiusMeters: distanceKm * 1000,
        limit: 12,
      };
      const response = await api.get(ENDPOINTS.PLACES_NEARBY, { params });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setNearby(data);
    } catch (err) {
      setError('No se pudo cargar lugares cercanos.');
    } finally {
      setLoadingNearby(false);
    }
  };

  const filteredPopular = useMemo(() => {
    if (selectedCategory === 'todos') return popular;
    return popular.filter((item) => item.categoryId === selectedCategory);
  }, [popular, selectedCategory]);

  const openDetail = async (item) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setImageIndex(0);
    try {
      if (item?.id) {
        const response = await api.get(ENDPOINTS.PLACE_DETAIL(item.id));
        const data = response.data?.data || response.data || item;
        setSelectedPlace(data);
      } else {
        setSelectedPlace(item);
      }
    } catch (err) {
      setSelectedPlace(item);
    } finally {
      setDetailLoading(false);
    }
  };

  const renderPlace = ({ item, compact = false }) => {
    return (
      <Card
        title={item.name || 'Lugar sin nombre'}
        subtitle={item.description || 'Sin descripción'}
        meta={
          item.address ||
          (item.distanceMeters ? `${item.distanceMeters?.toFixed?.(0)} m` : undefined)
        }
        image={image}
        compact={compact}
      />
    );
  };

  const emptyState = useMemo(() => {
    if (loadingAll) return null;
    return <Text style={styles.empty}>No hay lugares aún.</Text>;
  }, [loadingAll]);

  const renderImages = (images) => {
    if (!images?.length) return null;
    return (
      <View style={styles.sliderContainer}>
        <FlatList
          ref={imageListRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={images}
          keyExtractor={(uri, idx) => `${uri}-${idx}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.detailImage} contentFit="cover" />
          )}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setImageIndex(idx);
          }}
        />
        {images.length > 1 ? (
          <View style={styles.sliderDots}>
            {images.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, imageIndex === idx && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}
        {images.length > 1 ? (
          <View style={styles.sliderButtons}>
            <TouchableOpacity
              style={styles.sliderNav}
              onPress={() => {
                const next = Math.max(imageIndex - 1, 0);
                setImageIndex(next);
                imageListRef.current?.scrollToIndex({ index: next, animated: true });
              }}
            >
              <Text style={styles.sliderNavText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sliderNav}
              onPress={() => {
                const next = Math.min(imageIndex + 1, images.length - 1);
                setImageIndex(next);
                imageListRef.current?.scrollToIndex({ index: next, animated: true });
              }}
            >
              <Text style={styles.sliderNavText}>›</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const mapUrl = selectedPlace?.lat && selectedPlace?.lng
    ? `https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`
    : null;
  const arConfig = getPlaceArConfig(selectedPlace);
  const arUrl = arConfig?.arUrl;
  const arQr = arConfig?.qrUrl;

  return (
    <KeyboardAvoidingView style={styles.container} behavior="height">
      <ScrollView
        refreshControl={<RefreshControl refreshing={loadingAll} onRefresh={loadAll} />}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=1400&q=80',
          }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.overlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroBadge}>Más de 10,000 viajeros felices</Text>
            <Text style={styles.heroTitle}>Descubre la magia cerca de ti</Text>
            <Text style={styles.heroSubtitle}>
              Explora paisajes únicos y experiencias inolvidables sin iniciar sesión.
            </Text>
            <View style={styles.searchCard}>
              <TextInput
                placeholder="¿A dónde quieres ir?"
                placeholderTextColor={COLORS.textLight}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={performSearch}
                style={styles.searchInput}
                returnKeyType="search"
              />
              <View style={styles.searchActions}>
                <TouchableOpacity style={styles.filterButton} onPress={() => setFiltersVisible(true)}>
                  <Text style={styles.filterButtonText}>Filtros</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.searchButton} onPress={performSearch}>
                  <Text style={styles.searchButtonText}>Explorar</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>200+</Text>
                <Text style={styles.statLabel}>Destinos</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>500+</Text>
                <Text style={styles.statLabel}>Experiencias</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>50K+</Text>
                <Text style={styles.statLabel}>Visitantes</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.section}>
          <Text style={styles.sectionTag}>Destinos Populares</Text>
          <Text style={styles.sectionTitle}>Explora lugares increíbles</Text>
          <Text style={styles.sectionSubtitle}>
            Ajusta por categoría y ve las imágenes destacadas de cada sitio.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categoriesList.map((chip) => (
              <TouchableOpacity
                key={chip.id}
                style={[styles.chip, selectedCategory === chip.id && styles.chipActive]}
                onPress={() => setSelectedCategory(chip.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCategory === chip.id && styles.chipTextActive,
                  ]}
                >
                  {chip.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingAll ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : (
            <FlatList
              horizontal
              data={filteredPopular}
              keyExtractor={(item, idx) => `${item.id || idx}-popular`}
              renderItem={({ item }) => renderPlace({ item, compact: true })}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTag}>Cerca de ti</Text>
              <Text style={styles.sectionTitle}>Activa ubicación para sugerencias</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={loadNearby}>
              {loadingNearby ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.secondaryButtonText}>Ver cerca</Text>
              )}
            </TouchableOpacity>
          </View>
          {loadingNearby ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : nearby.length ? (
            <FlatList
              horizontal
              data={nearby}
              keyExtractor={(item, idx) => `${item.id || idx}-nearby`}
              renderItem={({ item }) => renderPlace({ item, compact: true })}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <Text style={styles.empty}>Pulsa "Ver cerca" para obtener sugerencias.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTag}>Catálogo</Text>
          <Text style={styles.sectionTitle}>Todos los lugares</Text>
          {loadingAll ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : (
            <>
              {emptyState}
              <FlatList
                data={places}
                keyExtractor={(item, idx) => `${item.id || idx}-all`}
                renderItem={({ item }) => renderPlace({ item })}
                scrollEnabled={false}
                contentContainerStyle={styles.list}
              />
            </>
          )}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Modal filtros */}
      <Modal visible={filtersVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Configura tu búsqueda</Text>
            <Text style={styles.modalSubtitle}>Categoría</Text>
            <View style={[styles.chipRow, { flexWrap: 'wrap' }] }>
              {categoriesList.map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.chip, selectedCategory === chip.id && styles.chipActive]}
                  onPress={() => setSelectedCategory(chip.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCategory === chip.id && styles.chipTextActive,
                    ]}
                  >
                    {chip.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSubtitle, { marginTop: SPACING.md }]}>Distancia</Text>
            <View style={styles.quickRow}>
              {distanceOptions.map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[styles.quickChip, distanceKm === km && styles.quickChipActive]}
                  onPress={() => setDistanceKm(km)}
                >
                  <Text
                    style={[styles.quickChipText, distanceKm === km && styles.quickChipTextActive]}
                  >
                    {km} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={1}
              maximumValue={50}
              step={0.5}
              minimumTrackTintColor="#7B5BFF"
              maximumTrackTintColor={COLORS.border}
              thumbTintColor="#7B5BFF"
              value={distanceKm}
              onValueChange={setDistanceKm}
            />
            <Text style={styles.sliderValue}>Radio personalizado: {distanceKm.toFixed(1)} km</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondary} onPress={() => setFiltersVisible(false)}>
                <Text style={styles.modalSecondaryText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimary} onPress={performSearch}>
                <Text style={styles.modalPrimaryText}>Aplicar filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal detalle */}
      <Modal visible={detailVisible} animationType="slide">
        <ScrollView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTag}>Selección activa</Text>
            {selectedPlace?.categoryId ? (
              <Text style={styles.detailTagSecondary}>Categoría {selectedPlace.categoryId}</Text>
            ) : null}
            <Pressable style={styles.closeButton} onPress={() => setDetailVisible(false)}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          {detailLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.md }} />
          ) : (
            <>
              {renderImages(
                Array.isArray(selectedPlace?.imageUrls) ? selectedPlace.imageUrls : []
              )}
              <Text style={styles.detailTitle}>{selectedPlace?.name || 'Lugar'}</Text>
              <Text style={styles.detailSubtitle}>
                {selectedPlace?.description || 'Descripción no disponible.'}
              </Text>

              <View style={styles.infoRow}>
                <View style={styles.infoPill}>
                  <Text style={styles.infoLabel}>Ubicación</Text>
                  <Text style={styles.infoValue}>{selectedPlace?.address || 'Sin dirección'}</Text>
                </View>
                <View style={styles.infoPill}>
                  <Text style={styles.infoLabel}>Coordenadas</Text>
                  <Text style={styles.infoValue}>
                    {selectedPlace?.lat && selectedPlace?.lng
                      ? `${selectedPlace.lat}, ${selectedPlace.lng}`
                      : 'No disponibles'}
                  </Text>
                </View>
              </View>

              {selectedPlace?.distanceMeters ? (
                <Text style={styles.distanceText}>
                  Distancia aproximada: {selectedPlace.distanceMeters?.toFixed?.(0)} m
                </Text>
              ) : null}

              {mapUrl ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => Linking.openURL(mapUrl)}
                >
                  <Text style={styles.actionButtonText}>Abrir en Google Maps</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.actionButtonAlt} onPress={() => setDetailVisible(false)}>
                <Text style={styles.actionButtonAltText}>Ver mapa interactivo</Text>
              </TouchableOpacity>
              {arUrl ? (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Linking.openURL(arUrl)}
                  >
                    <Text style={styles.actionButtonText}>Ver en AR (web)</Text>
                  </TouchableOpacity>
                  {arQr ? (
                    <View style={styles.qrContainer}>
                      <Text style={styles.qrLabel}>Escanea para abrir en AR</Text>
                      <Image source={{ uri: arQr }} style={styles.qrImage} contentFit="contain" />
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    backgroundColor: '#4E5AE8',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  searchCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 16,
    marginTop: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    gap: SPACING.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  searchActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.sm,
  },
  secondaryButton: {
    borderColor: COLORS.white,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  statNumber: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sectionTag: {
    alignSelf: 'flex-start',
    color: '#7B5BFF',
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionSubtitle: {
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  loader: {
    marginTop: SPACING.md,
  },
  list: {
    gap: SPACING.sm,
  },
  horizontalList: {
    gap: SPACING.sm,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardCompact: {
    width: 200,
    marginBottom: 0,
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.border,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  cardBody: {
    gap: 2,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    flex: 1,
  },
  chipRow: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: '#EAE6FF',
    borderColor: '#7B5BFF',
  },
  chipText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
  },
  chipTextActive: {
    color: '#5B3CF0',
    fontWeight: 'bold',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipActive: {
    backgroundColor: '#EAE6FF',
    borderColor: '#7B5BFF',
  },
  quickChipText: {
    color: COLORS.text,
  },
  quickChipTextActive: {
    color: '#5B3CF0',
    fontWeight: 'bold',
  },
  sliderValue: {
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  empty: {
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  secondaryButton: {
    backgroundColor: '#7B5BFF',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  modalPrimary: {
    flex: 1,
    backgroundColor: '#7B5BFF',
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailTag: {
    backgroundColor: '#EAE6FF',
    color: '#5B3CF0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  detailTagSecondary: {
    backgroundColor: '#E0F7EC',
    color: '#159B62',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  closeButton: {
    marginLeft: 'auto',
    backgroundColor: COLORS.border,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text,
  },
  detailTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  detailSubtitle: {
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoPill: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  infoLabel: {
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    color: COLORS.text,
    fontWeight: '600',
  },
  distanceText: {
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  actionButton: {
    backgroundColor: '#7B5BFF',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  actionButtonAlt: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  actionButtonAltText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  sliderContainer: {
    position: 'relative',
    marginVertical: SPACING.md,
  },
  detailImage: {
    width: screenWidth,
    height: 240,
    borderRadius: 16,
  },
  sliderDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: '#7B5BFF',
  },
  sliderButtons: {
    position: 'absolute',
    top: '45%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  sliderNav: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderNavText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  qrLabel: {
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
});

export default HomeScreen;
