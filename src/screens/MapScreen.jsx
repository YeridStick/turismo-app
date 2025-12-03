import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';

const MapScreen = ({ route }) => {
    const [userLocation, setUserLocation] = useState(null);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'nearby', 'selected'
    const [locationPermission, setLocationPermission] = useState(false);

    // Parámetro opcional: sitio seleccionado desde otra pantalla
    const selectedPlaceId = route?.params?.placeId;

    // Solicitar permisos de ubicación y obtener ubicación del usuario
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para mostrar sitios cercanos');
                    setLocationPermission(false);
                    setLoading(false);
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
        return distance.toFixed(1);
    };

    // Generar HTML para el mapa con OpenStreetMap y Leaflet
    const generateMapHTML = () => {
        const validPlaces = places.filter(p => p.lat && p.lng);

        // Calcular centro del mapa
        let centerLat = 2.2;
        let centerLng = -76.3;
        let zoom = 8;

        if (filterMode === 'selected' && validPlaces.length === 1) {
            centerLat = validPlaces[0].lat;
            centerLng = validPlaces[0].lng;
            zoom = 13;
        } else if (userLocation) {
            centerLat = userLocation.latitude;
            centerLng = userLocation.longitude;
            zoom = 10;
        }

        // Crear marcadores JSON
        const markersData = validPlaces.map(place => {
            const distance = userLocation
                ? calculateDistance(userLocation.latitude, userLocation.longitude, place.lat, place.lng)
                : null;

            return {
                lat: place.lat,
                lng: place.lng,
                name: place.name || 'Sitio turístico',
                distance: distance,
                coords: `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`
            };
        });

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #map {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 100%;
        }
        .info-box {
            position: absolute;
            bottom: 20px;
            left: 10px;
            right: 10px;
            background: white;
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 1000;
            font-size: 13px;
        }
        .info-title {
            font-weight: 700;
            color: #333;
            margin-bottom: 4px;
        }
        .info-text {
            color: #666;
            margin: 2px 0;
        }
        .info-subtext {
            color: #999;
            font-size: 11px;
            font-style: italic;
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    ${userLocation ? `
    <div class="info-box">
        <div class="info-title">Tu ubicación:</div>
        <div class="info-text">📍 ${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}</div>
        <div class="info-subtext">${validPlaces.length} sitio${validPlaces.length !== 1 ? 's' : ''} ${filterMode === 'nearby' ? 'cercano' : 'mostrado'}${validPlaces.length !== 1 ? 's' : ''}</div>
    </div>
    ` : ''}

    <script>
        // Crear mapa
        var map = L.map('map').setView([${centerLat}, ${centerLng}], ${zoom});

        // Agregar tiles de OpenStreetMap (gratuito, sin API key)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Marcador de usuario
        ${userLocation ? `
        var userIcon = L.divIcon({
            className: 'user-marker',
            html: '<div style="background: #5B3CF0; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        L.marker([${userLocation.latitude}, ${userLocation.longitude}], {icon: userIcon})
            .addTo(map)
            .bindPopup('<b>📍 Tu ubicación</b><br>${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}');
        ` : ''}

        // Agregar marcadores de sitios
        var markers = ${JSON.stringify(markersData)};
        markers.forEach(function(marker) {
            var popupContent = '<b>' + marker.name + '</b><br>' +
                               '📍 ' + marker.coords;
            if (marker.distance) {
                popupContent += '<br>📏 ' + marker.distance + ' km de distancia';
            }

            var markerIcon = L.divIcon({
                className: 'place-marker',
                html: '<div style="background: ${filterMode === 'selected' ? 'red' : '#5B3CF0'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            L.marker([marker.lat, marker.lng], {icon: markerIcon})
                .addTo(map)
                .bindPopup(popupContent);
        });

        // Círculo de 50km en modo cercanos
        ${filterMode === 'nearby' && userLocation ? `
        L.circle([${userLocation.latitude}, ${userLocation.longitude}], {
            color: 'rgba(91, 60, 240, 0.5)',
            fillColor: 'rgba(91, 60, 240, 0.1)',
            fillOpacity: 0.3,
            radius: 50000
        }).addTo(map);
        ` : ''}
    </script>
</body>
</html>
        `;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5B3CF0" />
                <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
        );
    }

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

            {/* Mapa usando WebView con OpenStreetMap */}
            <WebView
                style={styles.map}
                originWhitelist={['*']}
                source={{ html: generateMapHTML() }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#5B3CF0" />
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F5FB',
    },
    map: {
        flex: 1,
    },
    filterContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        zIndex: 1000,
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
});

export default MapScreen;
