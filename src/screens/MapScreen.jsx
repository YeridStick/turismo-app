import React, { useState, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';

const MapScreen = ({ route }) => {
    const [mapComponents, setMapComponents] = useState({
        MapView: null,
        Marker: null,
        PROVIDER_GOOGLE: null,
        Circle: null,
    });
    const [userLocation, setUserLocation] = useState(null);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'nearby', 'selected'
    const [locationPermission, setLocationPermission] = useState(false);

    // Parámetro opcional: sitio seleccionado desde otra pantalla
    const selectedPlaceId = route?.params?.placeId;

    // Cargar componentes de mapa
    useEffect(() => {
        if (Platform.OS !== 'web') {
            import('react-native-maps')
                .then((mapsModule) => {
                    setMapComponents({
                        MapView: mapsModule.default,
                        Marker: mapsModule.Marker,
                        PROVIDER_GOOGLE: mapsModule.PROVIDER_GOOGLE,
                        Circle: mapsModule.Circle,
                    });
                })
                .catch(error => {
                    console.error("Error loading map components", error);
                    Alert.alert('Error', 'No se pudo cargar el mapa');
                });
        }
    }, []);

    // Solicitar permisos de ubicación y obtener ubicación del usuario
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para mostrar sitios cercanos');
                    setLocationPermission(false);
                    return;
                }
                setLocationPermission(true);

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
            } catch (error) {
                console.error('Error obteniendo ubicación:', error);
                Alert.alert('Error', 'No se pudo obtener tu ubicación');
            }
        })();
    }, []);

    // Cargar todos los sitios por defecto
    useEffect(() => {
        loadAllPlaces();
    }, []);

    const loadAllPlaces = async () => {
        try {
            setLoading(true);
            const response = await api.get(ENDPOINTS.PLACES_ALL);
            const placesData = response.data || [];
            setPlaces(placesData);
            setFilterMode('all');
        } catch (error) {
            console.error('Error cargando sitios:', error);
            Alert.alert('Error', 'No se pudieron cargar los sitios turísticos');
            setPlaces([]);
        } finally {
            setLoading(false);
        }
    };

    const loadNearbyPlaces = async () => {
        if (!userLocation) {
            Alert.alert('Ubicación no disponible', 'Necesitamos tu ubicación para mostrar sitios cercanos');
            return;
        }

        try {
            setLoading(true);
            const response = await api.get(ENDPOINTS.PLACES_NEARBY, {
                params: {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    radius: 50000, // 50km de radio
                }
            });
            const placesData = response.data || [];
            setPlaces(placesData);
            setFilterMode('nearby');
        } catch (error) {
            console.error('Error cargando sitios cercanos:', error);
            Alert.alert('Error', 'No se pudieron cargar los sitios cercanos');
        } finally {
            setLoading(false);
        }
    };

    const showSelectedPlace = async () => {
        if (!selectedPlaceId) {
            Alert.alert('No hay sitio seleccionado', 'Debes seleccionar un sitio desde la pantalla de inicio');
            return;
        }

        try {
            setLoading(true);
            const response = await api.get(ENDPOINTS.PLACE_DETAIL(selectedPlaceId));
            const placeData = response.data;
            setPlaces([placeData]);
            setFilterMode('selected');
        } catch (error) {
            console.error('Error cargando sitio seleccionado:', error);
            Alert.alert('Error', 'No se pudo cargar el sitio seleccionado');
        } finally {
            setLoading(false);
        }
    };

    // Calcular distancia entre dos coordenadas (fórmula de Haversine)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance.toFixed(1); // Retorna la distancia en km con 1 decimal
    };

    if (Platform.OS === 'web') {
        return (
            <View style={[styles.container, { padding: 24, justifyContent: 'center' }]}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>Mapa no disponible en web.</Text>
                <Text>Usa la app móvil para ver el mapa interactivo.</Text>
            </View>
        );
    }

    const { MapView, Marker, PROVIDER_GOOGLE, Circle } = mapComponents;

    if (!MapView) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#5B3CF0" />
                <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
        );
    }

    // Determinar la región inicial del mapa
    const getInitialRegion = () => {
        if (filterMode === 'selected' && places.length === 1) {
            // Centrar en el sitio seleccionado
            return {
                latitude: places[0].lat || 2.2,
                longitude: places[0].lng || -76.3,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            };
        } else if (userLocation) {
            // Centrar en la ubicación del usuario
            return {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
            };
        } else {
            // Vista general de la región
            return {
                latitude: 2.2,
                longitude: -76.3,
                latitudeDelta: 1.5,
                longitudeDelta: 1.5,
            };
        }
    };

    return (
        <View style={styles.container}>
            {/* Botones de filtrado */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filterMode === 'nearby' && styles.filterButtonActive]}
                    onPress={loadNearbyPlaces}
                    disabled={!locationPermission}
                >
                    <Text style={[styles.filterButtonText, filterMode === 'nearby' && styles.filterButtonTextActive]}>
                        📍 Cercanos
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterButton, filterMode === 'selected' && styles.filterButtonActive]}
                    onPress={showSelectedPlace}
                    disabled={!selectedPlaceId}
                >
                    <Text style={[styles.filterButtonText, filterMode === 'selected' && styles.filterButtonTextActive]}>
                        🎯 Seleccionado
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterButton, filterMode === 'all' && styles.filterButtonActive]}
                    onPress={loadAllPlaces}
                >
                    <Text style={[styles.filterButtonText, filterMode === 'all' && styles.filterButtonTextActive]}>
                        🗺️ Todos
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Mapa */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B3CF0" />
                    <Text style={styles.loadingText}>Cargando sitios...</Text>
                </View>
            ) : (
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={getInitialRegion()}
                    showsUserLocation={locationPermission}
                    showsMyLocationButton={locationPermission}
                >
                    {/* Marcadores de sitios turísticos */}
                    {places.map(place => {
                        if (!place.lat || !place.lng) return null;

                        const distance = userLocation
                            ? calculateDistance(userLocation.latitude, userLocation.longitude, place.lat, place.lng)
                            : null;

                        return (
                            <Marker
                                key={place.id}
                                coordinate={{
                                    latitude: place.lat,
                                    longitude: place.lng,
                                }}
                                title={place.name}
                                description={
                                    distance
                                        ? `📍 ${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}\n📏 ${distance} km de distancia`
                                        : `📍 ${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`
                                }
                                pinColor={filterMode === 'selected' ? 'red' : '#5B3CF0'}
                            />
                        );
                    })}

                    {/* Círculo alrededor de la ubicación del usuario (solo en modo cercanos) */}
                    {userLocation && filterMode === 'nearby' && Circle && (
                        <Circle
                            center={userLocation}
                            radius={50000} // 50km
                            strokeColor="rgba(91, 60, 240, 0.5)"
                            fillColor="rgba(91, 60, 240, 0.1)"
                        />
                    )}
                </MapView>
            )}

            {/* Info de ubicación actual */}
            {userLocation && (
                <View style={styles.infoContainer}>
                    <Text style={styles.infoTitle}>Tu ubicación:</Text>
                    <Text style={styles.infoText}>
                        📍 {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
                    </Text>
                    <Text style={styles.infoSubtext}>
                        {places.length} sitio{places.length !== 1 ? 's' : ''} {filterMode === 'nearby' ? 'cercano' : 'mostrado'}{places.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    filterContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        zIndex: 1,
        backgroundColor: 'transparent',
    },
    filterButton: {
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    filterButtonActive: {
        backgroundColor: '#5B3CF0',
        borderColor: '#5B3CF0',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    filterButtonTextActive: {
        color: 'white',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F5FB',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
    },
    infoContainer: {
        position: 'absolute',
        bottom: 20,
        left: 10,
        right: 10,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    infoSubtext: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
});

export default MapScreen;
