import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebViewMap from '../components/WebViewMap';
import { ENDPOINTS } from '../config/api.config';
import api from '../services/api';
import { PremiumModal } from '../components/ui/PremiumModal';

const MapScreen = ({ route }) => {
    const [userLocation, setUserLocation] = useState(null);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'nearby', 'selected'
    const [locationPermission, setLocationPermission] = useState(false);
    const [modal, setModal] = useState({ visible: false, type: 'info', title: '', message: '' });

    // Parámetro opcional: sitio seleccionado desde otra pantalla
    const selectedPlaceId = route?.params?.placeId;

    // Solicitar permisos de ubicación y obtener ubicación del usuario
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
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

                // Obtener ubicación actual
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                // Cargar sitios turísticos
                await fetchPlaces();
            } catch (error) {
                console.error('Error obteniendo ubicación:', error);
                setModal({
                    visible: true,
                    type: 'error',
                    title: 'Error de Ubicación',
                    message: 'No logramos obtener tu posición actual. Por favor, verifica tu GPS.'
                });
                setLoading(false);
            }
        })();
    }, []);

    // Si hay un sitio seleccionado, cambiar modo al abrir
    useEffect(() => {
        if (selectedPlaceId && places.length > 0) {
            setFilterMode('selected');
        }
    }, [selectedPlaceId, places]);

    const fetchPlaces = async () => {
        try {
            const response = await api.get(ENDPOINTS.PLACES_SEARCH, { params: { mode: 'ALL', size: 1000 } });
            if (response.data?.data) {
                const placesData = response.data.data.map(place => ({
                    id: place.id,
                    name: place.nombre || 'Sin nombre',
                    latitude: parseFloat(place.latitud) || 0,
                    longitude: parseFloat(place.longitud) || 0,
                }));
                setPlaces(placesData);
            }
        } catch (error) {
            console.error('Error cargando sitios:', error);
            setModal({
                visible: true,
                type: 'error',
                title: 'Error de Carga',
                message: 'No pudimos descargar los sitios turísticos en este momento.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Calcular distancia entre dos puntos usando geolib
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const distanceInMeters = getDistance(
            { latitude: lat1, longitude: lon1 },
            { latitude: lat2, longitude: lon2 }
        );
        return distanceInMeters / 1000; // Convertir a km
    };

    // Filtrar sitios según el modo seleccionado
    const getFilteredPlaces = () => {
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
    };

    // Calcular región del mapa basada en los sitios filtrados
    const getMapRegion = () => {
        const filteredPlaces = getFilteredPlaces();

        if (!userLocation) {
            return {
                latitude: 4.5709, // Centro de Colombia por defecto
                longitude: -74.2973,
                latitudeDelta: 10,
                longitudeDelta: 10,
            };
        }

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
    };

    const filteredPlaces = getFilteredPlaces();
    const mapRegion = getMapRegion();

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
                    Necesitamos acceso a tu ubicación para mostrarte los sitios cercanos en el mapa.
                </Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        setLoading(true);
                        Location.requestForegroundPermissionsAsync().then(({ status }) => {
                            if (status === 'granted') {
                                setLocationPermission(true);
                                Location.getCurrentPositionAsync().then(location => {
                                    setUserLocation({
                                        latitude: location.coords.latitude,
                                        longitude: location.coords.longitude,
                                    });
                                    fetchPlaces();
                                });
                            } else {
                                setLoading(false);
                            }
                        });
                    }}
                >
                    <Text style={styles.retryButtonText}>Reintentar</Text>
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
                    onPress={() => setFilterMode('nearby')}
                >
                    <Text style={[styles.filterButtonText, filterMode === 'nearby' && styles.filterButtonTextActive]}>
                        📍 Cercanos
                    </Text>
                </TouchableOpacity>

                {selectedPlaceId && (
                    <TouchableOpacity
                        style={[styles.filterButton, filterMode === 'selected' && styles.filterButtonActive]}
                        onPress={() => setFilterMode('selected')}
                    >
                        <Text style={[styles.filterButtonText, filterMode === 'selected' && styles.filterButtonTextActive]}>
                            🎯 Seleccionado
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.filterButton, filterMode === 'all' && styles.filterButtonActive]}
                    onPress={() => setFilterMode('all')}
                >
                    <Text style={[styles.filterButtonText, filterMode === 'all' && styles.filterButtonTextActive]}>
                        🗺️ Todos
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Mapa nativo con react-native-maps */}
            <WebViewMap
                initialRegion={mapRegion}
                markers={filteredPlaces.map(place => {
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
                })}
                userLocation={userLocation}
                showCircle={filterMode === 'nearby'}
                circleRadius={50000}
                showUserLocation={true}
            />

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
                onClose={() => setModal(prev => ({ ...prev, visible: false }))}
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
