import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useLocation, setUseLocation] = useState(false);

  const performSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      let coords = null;
      if (useLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      }
      const params = {
        q: query.trim(),
        ...coords,
        radiusMeters: coords ? 1200 : undefined,
      };
      const response = await api.get(ENDPOINTS.PLACES_SEARCH, { params });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setResults(data);
    } catch (err) {
      setError('No se pudo realizar la búsqueda.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.name || 'Lugar'}</Text>
      <Text style={styles.cardSubtitle}>{item.description || 'Sin descripción'}</Text>
      {item.address ? <Text style={styles.cardMeta}>{item.address}</Text> : null}
    </View>
  );

  const emptyState = useMemo(() => {
    if (loading || !query.trim()) return null;
    return results.length ? null : <Text style={styles.empty}>Sin resultados</Text>;
  }, [loading, query, results]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Buscar lugares</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: café, museo, parque..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={performSearch}
          returnKeyType="search"
        />
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.toggle, useLocation && styles.toggleActive]}
            onPress={() => setUseLocation((prev) => !prev)}
          >
            <Text style={styles.toggleText}>
              {useLocation ? 'Usando ubicación' : 'Usar mi ubicación'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={performSearch} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Buscar</Text>
            )}
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, idx) => `${item.id || idx}-search`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={emptyState}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  form: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    backgroundColor: '#FAFAFA',
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  toggle: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#F5F5F5',
  },
  toggleActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFE7E7',
  },
  toggleText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.md,
  },
  list: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  error: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
});

export default SearchScreen;
