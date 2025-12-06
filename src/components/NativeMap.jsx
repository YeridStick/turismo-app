import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const NativeMap = ({
    initialRegion,
    markers = [],
    userLocation = null,
    showCircle = false,
    circleRadius = 50000,
    onMapReady = () => { },
    showUserLocation = true,
    onMarkerPress = null,
    style = {}
}) => {
    const mapRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);

    // Región por defecto en caso de que initialRegion sea null/undefined
    const defaultRegion = {
        latitude: 4.5709,
        longitude: -74.2973,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    const [region, setRegion] = useState(initialRegion || defaultRegion);

    // Ajustar la región cuando cambien las props
    useEffect(() => {
        if (mapRef.current && mapReady && initialRegion) {
            try {
                mapRef.current.animateToRegion(initialRegion, 1000);
            } catch (error) {
                console.error('Error animating to region:', error);
            }
        }
    }, [initialRegion, mapReady]);

    // Ajustar vista para mostrar todos los marcadores
    useEffect(() => {
        if (mapRef.current && mapReady && markers.length > 0) {
            try {
                const validMarkers = markers.filter(m =>
                    m &&
                    typeof m.latitude === 'number' &&
                    typeof m.longitude === 'number' &&
                    !isNaN(m.latitude) &&
                    !isNaN(m.longitude)
                );

                if (validMarkers.length > 0) {
                    setTimeout(() => {
                        if (mapRef.current) {
                            mapRef.current.fitToCoordinates(
                                validMarkers.map(m => ({
                                    latitude: m.latitude,
                                    longitude: m.longitude
                                })),
                                {
                                    edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                                    animated: true,
                                }
                            );
                        }
                    }, 500);
                }
            } catch (error) {
                console.error('Error fitting to coordinates:', error);
            }
        }
    }, [markers, mapReady]);

    const handleMapReady = () => {
        console.log('✅ Mapa nativo cargado correctamente');
        setMapReady(true);
        onMapReady();
    };

    const handleMarkerPress = (marker) => {
        try {
            if (onMarkerPress) {
                onMarkerPress(marker);
            }

            // Centrar en el marcador seleccionado
            if (mapRef.current && marker.latitude && marker.longitude) {
                mapRef.current.animateToRegion({
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }, 1000);
            }
        } catch (error) {
            console.error('Error handling marker press:', error);
        }
    };

    // Función para centrar en la ubicación del usuario
    const centerOnUser = () => {
        try {
            if (mapRef.current && userLocation && userLocation.latitude && userLocation.longitude) {
                mapRef.current.animateToRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1000);
            }
        } catch (error) {
            console.error('Error centering on user:', error);
        }
    };

    // Validar que tenemos una región válida
    const validRegion = region || initialRegion || defaultRegion;

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={validRegion}
                provider={PROVIDER_DEFAULT}
                showsUserLocation={showUserLocation}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={false}
                onMapReady={handleMapReady}
                onRegionChangeComplete={setRegion}
                loadingEnabled={true}
                loadingIndicatorColor="#007AFF"
                loadingBackgroundColor="#E5E3DF"
                moveOnMarkerPress={false}
            >
                {/* Marcadores de sitios turísticos */}
                {markers && markers.length > 0 && markers.map((marker, index) => {
                    // Validar que el marcador tiene coordenadas válidas
                    if (!marker || typeof marker.latitude !== 'number' || typeof marker.longitude !== 'number') {
                        return null;
                    }

                    return (
                        <Marker
                            key={marker.id || `marker-${index}`}
                            coordinate={{
                                latitude: marker.latitude,
                                longitude: marker.longitude,
                            }}
                            title={marker.title || 'Marcador'}
                            description={marker.description || ''}
                            pinColor={marker.pinColor || 'red'}
                            onPress={() => handleMarkerPress(marker)}
                        />
                    );
                })}

                {/* Círculo de radio si está habilitado */}
                {showCircle && userLocation && userLocation.latitude && userLocation.longitude && (
                    <Circle
                        center={{
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                        }}
                        radius={circleRadius}
                        strokeColor="rgba(0, 122, 255, 0.5)"
                        fillColor="rgba(0, 122, 255, 0.1)"
                        strokeWidth={2}
                    />
                )}
            </MapView>

            {/* Botón para centrar en ubicación del usuario */}
            {userLocation && (
                <TouchableOpacity
                    style={styles.myLocationButton}
                    onPress={centerOnUser}
                >
                    <Text style={styles.myLocationText}>📍</Text>
                </TouchableOpacity>
            )}

            {/* Indicador de carga */}
            {!mapReady && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Cargando mapa...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E5E3DF',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    myLocationButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    myLocationText: {
        fontSize: 24,
    },
});

export default NativeMap;
