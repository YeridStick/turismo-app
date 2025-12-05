import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

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
    const [region, setRegion] = useState(initialRegion);

    // Ajustar la región cuando cambien las props
    useEffect(() => {
        if (mapRef.current && mapReady && initialRegion) {
            mapRef.current.animateToRegion(initialRegion, 1000);
        }
    }, [initialRegion, mapReady]);

    // Ajustar vista para mostrar todos los marcadores
    useEffect(() => {
        if (mapRef.current && mapReady && markers.length > 0) {
            setTimeout(() => {
                mapRef.current.fitToCoordinates(
                    markers.map(m => ({ latitude: m.latitude, longitude: m.longitude })),
                    {
                        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                        animated: true,
                    }
                );
            }, 500);
        }
    }, [markers, mapReady]);

    const handleMapReady = () => {
        console.log('✅ Mapa nativo cargado correctamente');
        setMapReady(true);
        onMapReady();
    };

    const handleMarkerPress = (marker) => {
        if (onMarkerPress) {
            onMarkerPress(marker);
        }

        // Centrar en el marcador seleccionado
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: marker.latitude,
                longitude: marker.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        }
    };

    // Función para centrar en la ubicación del usuario
    const centerOnUser = () => {
        if (mapRef.current && userLocation) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={region || initialRegion}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                showsUserLocation={showUserLocation}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
                onMapReady={handleMapReady}
                onRegionChangeComplete={setRegion}
                loadingEnabled={true}
                loadingIndicatorColor="#007AFF"
                loadingBackgroundColor="#E5E3DF"
                moveOnMarkerPress={false}
            >
                {/* Marcadores de sitios turísticos */}
                {markers.map((marker, index) => (
                    <Marker
                        key={marker.id || `marker-${index}`}
                        coordinate={{
                            latitude: marker.latitude,
                            longitude: marker.longitude,
                        }}
                        title={marker.title}
                        description={marker.description}
                        pinColor={marker.pinColor || 'red'}
                        onPress={() => handleMarkerPress(marker)}
                    />
                ))}

                {/* Círculo de radio si está habilitado */}
                {showCircle && userLocation && (
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
