import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebViewMap from '../components/WebViewMap';
import { ENDPOINTS } from '../config/api.config';
import api from '../services/api';
import { PremiumModal } from '../components/ui/PremiumModal';
import {
    buildRequestKey,
    createInFlightDeduper,
    extractArrayPayload,
} from '../utils/requestHelpers';

const ALL_PLACES_PARAMS = { mode: 'ALL', size: 1000 };

const DEFAULT_MAP_REGION = {
    latitude: 4.5709,
    longitude: -74.2973,
    latitudeDelta: 10,
    longitudeDelta: 10,
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const distanceInMeters = getDistance(
        { latitude: lat1, longitude: lon1 },
        { latitude: lat2, longitude: lon2 }
    );
    return distanceInMeters / 1000;
};

const normalizeMapPlace = (place) => ({
    id: place.id,
    name: place.nombre || place.name || place.title || 'Sin nombre',
    latitude: parseFloat(place.latitud ?? place.latitude ?? place.lat) || 0,
    longitude: parseFloat(place.longitud ?? place.longitude ?? place.lng) || 0,
});

const MapScreen = ({ route }) => {
    const [userLocation, setUserLocation] = useState(null);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [placesLoading, setPlacesLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [placesError, setPlacesError] = useState('');
    const [locationError, setLocationError] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'nearby', 'selected'
    const [locationPermission, setLocationPermission] = useState(false);
    const [modal, setModal] = useState({ visible: false, type: 'info', title: '', message: '' });
    const requestDeduper = useMemo(() => createInFlightDeduper(), []);

    // Parámetro opcional: sitio seleccionado desde otra pantalla
    const selectedPlaceId = route?.params?.placeId;

    const fetchPlaces = useCallback(async ({ initial = false } = {}) => {
        const requestKey = buildRequestKey({
            method: 'GET',
            endpoint: ENDPOINTS.PLACES_SEARCH,
            params: ALL_PLACES_PARAMS,
            scope: 'MapScreen',
        });

        if (initial) {
            setLoading(true);
        } else {
            setPlacesLoading(true);
        }
        setPlacesError('');

        try {
            const response = await requestDeduper.run(requestKey, () =>
                api.get(ENDPOINTS.PLACES_SEARCH, { params: ALL_PLACES_PARAMS }),
            );
            const placesData = extractArrayPayload(response).map(normalizeMapPlace);
            setPlaces(placesData);
        } catch (error) {
            console.error('Error cargando sitios:', error);
            setPlacesError('No pudimos descargar los sitios turísticos en este momento.');
            setModal({
                visible: true,
                type: 'error',
                title: 'Error de Carga',
                message: 'No pudimos descargar los sitios turísticos en este momento.'
            });
        } finally {
            if (initial) {
                setLoading(false);
            } else {
                setPlacesLoading(false);
            }
        }
    }, [requestDeduper]);

    // Solicitar permisos de ubicación y obtener ubicación del usuario
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLocationError('Necesitamos acceso a tu ubicación para mostrarte sitios cercanos.');
                    setModal({
                        visible: true,
                        type: 'warning',
                        title: 'Permisos necesarios',
                        message: 'Necesitamos acceso a tu ubicación para mostrar sitios cercanos y mejorar tu experiencia.'
                    });
                    setLocationPermission(false);
                    setLoading(false);
                    return;
                }

                setLocationPermission(true);
                setLocationError('');

                // Obtener ubicación actual
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                // Cargar sitios turísticos
                await fetchPlaces({ initial: true });
            } catch (error) {
                console.error('Error obteniendo ubicación:', error);
                setLocationError('No logramos obtener tu posición actual. Verifica tu GPS e intenta nuevamente.');
                setModal({
                    visible: true,
                    type: 'error',
                    title: 'Error de Ubicación',
                    message: 'No logramos obtener tu posición actual. Por favor, verifica tu GPS.'
                });
                setLoading(false);
            }
        })();
    }, [fetchPlaces]);

    // Si hay un sitio seleccionado, cambiar modo al abrir
    useEffect(() => {
        if (selectedPlaceId && places.length > 0) {
            setFilterMode('selected');
        }
    }, [selectedPlaceId, places.length]);

    const filteredPlaces = useMemo(() => {
        if (!userLocation) return [];

        switch (filterMode) {
            case 'nearby':
                return places.filter(place => {
                    const distance = calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        place.latitude,
                        place.longitude
                    );
                    return distance <= 50; // 50 km
                });
            case 'selected':
                if (selectedPlaceId) {
                    return places.filter(place => place.id === selectedPlaceId);
                }
                return places;
            case 'all':
            default:
                return places;
        }
    }, [
        filterMode,
        places,
        selectedPlaceId,
        userLocation?.latitude,
        userLocation?.longitude,
    ]);

    const mapRegion = useMemo(() => {
        if (!userLocation) return DEFAULT_MAP_REGION;

        if (filteredPlaces.length === 0) {
            return {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
            };
        }

        // Si solo hay un sitio o modo seleccionado
        if (filterMode === 'selected' && filteredPlaces.length === 1) {
            return {
                latitude: filteredPlaces[0].latitude,
                longitude: filteredPlaces[0].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            };
        }

        // Calcular bounds para múltiples sitios
        let minLat = userLocation.latitude;
        let maxLat = userLocation.latitude;
        let minLon = userLocation.longitude;
        let maxLon = userLocation.longitude;

        filteredPlaces.forEach(place => {
            minLat = Math.min(minLat, place.latitude);
            maxLat = Math.max(maxLat, place.latitude);
            minLon = Math.min(minLon, place.longitude);
            maxLon = Math.max(maxLon, place.longitude);
        });

        const latDelta = (maxLat - minLat) * 1.5 || 0.5;
        const lonDelta = (maxLon - minLon) * 1.5 || 0.5;

        return {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2,
            latitudeDelta: Math.max(latDelta, 0.1),
            longitudeDelta: Math.max(lonDelta, 0.1),
        };
    }, [
        filterMode,
        filteredPlaces,
        userLocation?.latitude,
        userLocation?.longitude,
    ]);

    const markers = useMemo(
        () =>
            filteredPlaces.map(place => {
                const distance = userLocation
                    ? calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        place.latitude,
                        place.longitude
                    )
                    : 0;

                return {
                    id: place.id,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    title: place.name,
                    description: `${distance.toFixed(2)} km de distancia`,
                    pinColor: filterMode === 'selected' && place.id === selectedPlaceId ? 'green' : 'red'
                };
            }),
        [
            filterMode,
            filteredPlaces,
            selectedPlaceId,
            userLocation?.latitude,
            userLocation?.longitude,
        ],
    );

    const handleRetryLocation = useCallback(async () => {
        if (locationLoading || loading) return;

        setLocationLoading(true);
        setLocationError('');

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationPermission(false);
                setLocationError('Necesitamos acceso a tu ubicación para mostrarte sitios cercanos.');
                setLoading(false);
                return;
            }

            setLocationPermission(true);
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
            await fetchPlaces({ initial: places.length === 0 });
        } catch (error) {
            console.error('Error reintentando ubicación:', error);
            setLocationError('No logramos obtener tu posición actual. Verifica tu GPS e intenta nuevamente.');
            setLoading(false);
        } finally {
            setLocationLoading(false);
        }
    }, [fetchPlaces, loading, locationLoading, places.length]);

    const handleRetryPlaces = useCallback(() => {
        if (placesLoading) return;
        fetchPlaces({ initial: places.length === 0 });
    }, [fetchPlaces, places.length, placesLoading]);

    const mapState = useMemo(() => {
        if (placesError && places.length === 0) {
            return {
                title: 'No pudimos cargar sitios',
                message: placesError,
                retry: true,
            };
        }

        if (placesError) {
            return {
                title: 'Mostrando datos previos',
                message: placesError,
                retry: true,
            };
        }

        if (filteredPlaces.length === 0) {
            if (filterMode === 'nearby') {
                return {
                    title: 'Sin sitios cercanos',
                    message: 'No hay lugares dentro del radio cercano actual.',
                    retry: false,
                };
            }

            if (filterMode === 'selected') {
                return {
                    title: 'Sitio no disponible',
                    message: 'No encontramos el sitio seleccionado en los datos cargados.',
                    retry: false,
                };
            }

            return {
                title: 'Sin sitios para mostrar',
                message: 'Cuando haya lugares disponibles, aparecerán en el mapa.',
                retry: true,
            };
        }

        return null;
    }, [filterMode, filteredPlaces.length, places.length, placesError]);

    const showNearbyPlaces = useCallback(() => setFilterMode('nearby'), []);
    const showSelectedPlace = useCallback(() => setFilterMode('selected'), []);
    const showAllPlaces = useCallback(() => setFilterMode('all'), []);
    const closeModal = useCallback(
        () => setModal(prev => ({ ...prev, visible: false })),
        [],
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0E7490" />
                <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
        );
    }

    if (!locationPermission) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>⚠️ Permisos necesarios</Text>
                <Text style={styles.errorText}>
                    {locationError || 'Necesitamos acceso a tu ubicación para mostrarte los sitios cercanos en el mapa.'}
                </Text>
                <TouchableOpacity
                    style={[styles.retryButton, locationLoading && styles.retryButtonDisabled]}
                    onPress={handleRetryLocation}
                    disabled={locationLoading}
                >
                    {locationLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.retryButtonText}>Reintentar</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Botones de filtrado */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filterMode === 'nearby' && styles.filterButtonActive]}
                    onPress={showNearbyPlaces}
                >
                    <Text style={[styles.filterButtonText, filterMode === 'nearby' && styles.filterButtonTextActive]}>
                        📍 Cercanos
                    </Text>
                </TouchableOpacity>

                {selectedPlaceId && (
                    <TouchableOpacity
                        style={[styles.filterButton, filterMode === 'selected' && styles.filterButtonActive]}
                        onPress={showSelectedPlace}
                    >
                        <Text style={[styles.filterButtonText, filterMode === 'selected' && styles.filterButtonTextActive]}>
                            🎯 Seleccionado
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.filterButton, filterMode === 'all' && styles.filterButtonActive]}
                    onPress={showAllPlaces}
                >
                    <Text style={[styles.filterButtonText, filterMode === 'all' && styles.filterButtonTextActive]}>
                        🗺️ Todos
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Mapa nativo con react-native-maps */}
            <WebViewMap
                initialRegion={mapRegion}
                markers={markers}
                userLocation={userLocation}
                showCircle={filterMode === 'nearby'}
                circleRadius={50000}
                showUserLocation={true}
            />

            {placesLoading && places.length > 0 ? (
                <View style={styles.mapStatePanel}>
                    <ActivityIndicator color="#0E7490" />
                    <Text style={styles.mapStateText}>Actualizando sitios...</Text>
                </View>
            ) : null}

            {!placesLoading && mapState ? (
                <View style={styles.mapStatePanel}>
                    <Text style={styles.mapStateTitle}>{mapState.title}</Text>
                    <Text style={styles.mapStateText}>{mapState.message}</Text>
                    {mapState.retry ? (
                        <TouchableOpacity
                            style={[
                                styles.mapStateButton,
                                placesLoading && styles.retryButtonDisabled,
                            ]}
                            onPress={handleRetryPlaces}
                            disabled={placesLoading}
                        >
                            <Text style={styles.mapStateButtonText}>Volver a cargar</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}

            {/* Panel informativo inferior */}
            {userLocation && (
                <View style={styles.infoPanel}>
                    <Text style={styles.infoPanelTitle}>📍 Tu ubicación</Text>
                    <Text style={styles.infoPanelText}>
                        Lat: {userLocation.latitude.toFixed(6)} · Lon: {userLocation.longitude.toFixed(6)}
                    </Text>
                </View>
            )}

            <PremiumModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onClose={closeModal}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    retryButton: {
        backgroundColor: '#0E7490',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 132,
        alignItems: 'center',
    },
    retryButtonDisabled: {
        opacity: 0.68,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        justifyContent: 'space-around',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    filterButtonActive: {
        backgroundColor: '#0E7490',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    map: {
        flex: 1,
    },
    mapStatePanel: {
        position: 'absolute',
        top: 78,
        left: 16,
        right: 16,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(14, 116, 144, 0.18)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 4,
    },
    mapStateTitle: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
    mapStateText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 17,
    },
    mapStateButton: {
        marginTop: 4,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#0E7490',
    },
    mapStateButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    infoPanel: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    infoPanelTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    infoPanelText: {
        fontSize: 14,
        color: '#666',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    infoPanelSubtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
});

export default MapScreen;
