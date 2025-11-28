import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';
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

const HomeScreen = () => {
  const [places, setPlaces] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err) {
      setError('No se pudo cargar el catálogo.');
    } finally {
      setLoadingAll(false);
    }
  };

  const loadNearby = async () => {
    setLoadingNearby(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado.');
        setLoadingNearby(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const params = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        radiusMeters: 1200,
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

  const renderPlace = ({ item, compact = false }) => {
    return (
      <Card
        title={item.name || 'Lugar sin nombre'}
        subtitle={item.description || 'Sin descripción'}
        meta={
          item.address ||
          (item.distanceMeters ? `${item.distanceMeters?.toFixed?.(0)} m` : undefined)
        }
        compact={compact}
      />
    );
  };

  const emptyState = useMemo(() => {
    if (loadingAll) return null;
    return <Text style={styles.empty}>No hay lugares aún.</Text>;
  }, [loadingAll]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loadingAll} onRefresh={loadAll} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroBadge}>Explora</Text>
        <Text style={styles.heroTitle}>Descubre lugares sin iniciar sesión</Text>
        <Text style={styles.heroSubtitle}>
          Consulta el catálogo y usa tu ubicación para ver opciones cercanas.
        </Text>
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.primaryButton} onPress={loadNearby}>
            {loadingNearby ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Ver cerca</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={loadAll}>
            <Text style={styles.secondaryButtonText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cerca de ti</Text>
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
    </ScrollView>
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  heroTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
  },
  heroActions: {
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
    fontSize: FONT_SIZES.md,
  },
  secondaryButton: {
    borderColor: COLORS.white,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
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
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardCompact: {
    width: 240,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  cardMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  empty: {
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
});

export default HomeScreen;
