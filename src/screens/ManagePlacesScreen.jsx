import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { COLORS, SPACING } from '../utils/constants';
import { deletePlace, getMyPlaces } from '../services/api';
import { getCachedPlaceImages, invalidatePlaceMediaCache } from '../utils/placeMediaCache';
import { PremiumModal } from '../components/ui/PremiumModal';

const ManagePlacesScreen = ({ navigation }) => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState({ visible: false, type: 'success', title: '', message: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingPlaceId, setDeletingPlaceId] = useState(null);

  const fetchPlaces = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await getMyPlaces();
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      const placesWithMedia = await Promise.all(data.map(async (place) => {
        if (!place?.id) return place;
        try {
          const media = await getCachedPlaceImages(place.id);
          return {
            ...place,
            mediaImages: media,
          };
        } catch (_mediaError) {
          return place;
        }
      }));
      setPlaces(placesWithMedia);
    } catch (error) {
      console.error("Error fetching my places:", error);
      setModal({
        visible: true,
        type: 'error',
        title: 'Error de Carga',
        message: 'No se pudieron recuperar tus sitios turísticos. Por favor, intenta de nuevo.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPlaces();
    });
    return unsubscribe;
  }, [navigation, fetchPlaces]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlaces(false);
  };

  const handleEdit = (place) => {
    navigation.navigate('CreatePlace', { place });
  };

  const confirmDeletePlace = async () => {
    if (!deleteTarget?.id || deletingPlaceId) return;
    const siteId = deleteTarget.id;
    setDeletingPlaceId(siteId);
    try {
      const response = await deletePlace(siteId);
      if (response.status < 200 || response.status >= 300) {
        throw new Error('El backend no confirmó la eliminación del sitio.');
      }
      invalidatePlaceMediaCache(siteId);
      setPlaces((previous) => previous.filter((place) => String(place.id) !== String(siteId)));
      setDeleteTarget(null);
      setModal({ visible: true, type: 'success', title: 'Lugar eliminado', message: 'El sitio y sus referencias multimedia fueron eliminados correctamente.' });
    } catch (error) {
      setDeleteTarget(null);
      setModal({
        visible: true,
        type: 'error',
        title: 'No se pudo eliminar',
        message: error?.response?.data?.message || error?.message || 'Intenta de nuevo más tarde.',
      });
    } finally {
      setDeletingPlaceId(null);
    }
  };

  const renderPlaceItem = ({ item }) => (
    <View style={styles.placeCard}>
      <Image
        source={{ uri: item.mediaImages?.[0]?.url || item.imageUrls?.[0] || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=500' }}
        style={styles.placeImage}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.placeAddress} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} color={COLORS.textLight} /> {item.address || "Sin dirección"}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <MaterialIcons name="edit" size={16} color={COLORS.white} />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigation.navigate('PlaceDetail', { placeId: item.id })}
          >
            <Ionicons name="eye-outline" size={16} color="#156436" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setDeleteTarget(item)}
            disabled={deletingPlaceId === item.id}
            accessibilityLabel={`Eliminar ${item.name}`}
          >
            {deletingPlaceId === item.id ? (
              <ActivityIndicator size="small" color="#B91C1C" />
            ) : (
              <MaterialIcons name="delete-outline" size={18} color="#B91C1C" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Mis Lugares</Text>
          <Text style={styles.headerSubtitle}>{places.length} sitios registrados</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreatePlace')}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#156436" />
          <Text style={styles.loadingText}>Cargando tus sitios...</Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPlaceItem}
          contentContainerStyle={styles.listContainer}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="map-marked-alt" size={60} color="#E2E8F0" />
              <Text style={styles.emptyText}>Aún no tienes sitios registrados</Text>
              <Text style={styles.emptySubtext}>¡Comienza publicando tu primer destino mágico!</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreatePlace')}
              >
                <Text style={styles.emptyButtonText}>Registrar mi primer lugar</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <PremiumModal
        visible={!!deleteTarget}
        type="warning"
        title="Eliminar sitio"
        message={`¿Seguro que deseas eliminar “${deleteTarget?.name || 'este sitio'}”? Esta acción también eliminará sus referencias multimedia.`}
        confirmText="Eliminar"
        onConfirm={confirmDeletePlace}
        onClose={() => !deletingPlaceId && setDeleteTarget(null)}
      />

      <PremiumModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={() => setModal(prev => ({ ...prev, visible: false }))}
        onClose={() => setModal(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#156436',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#156436',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 14,
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  placeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: SPACING.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  placeImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  placeInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  placeAddress: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#156436',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#156436',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 30,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
});

export default ManagePlacesScreen;
