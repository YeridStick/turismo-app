import React, { useState, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

// Recuerda reemplazar esta clave con tu clave de API de Google Maps
const GOOGLE_MAPS_APIKEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

// Datos de ejemplo para lugares turísticos
const places = [
  { id: 1, name: 'Parque Arqueológico de San Agustín', coords: { latitude: 1.879, longitude: -76.289 } },
  { id: 2, name: 'Salto de Bordones', coords: { latitude: 2.046, longitude: -76.015 } },
  { id: 3, name: 'Popayán, la Ciudad Blanca', coords: { latitude: 2.444, longitude: -76.614 } },
];

// Puntos de ejemplo para la ruta
const origin = { latitude: 1.879, longitude: -76.289 }; // San Agustín
const destination = { latitude: 2.444, longitude: -76.614 }; // Popayán

const MapScreen = () => {
    const [mapComponents, setMapComponents] = useState({
        MapView: null,
        Marker: null,
        PROVIDER_GOOGLE: null,
        MapViewDirections: null,
    });

    useEffect(() => {
        if (Platform.OS !== 'web') {
            Promise.all([
                import('react-native-maps'),
                import('react-native-maps-directions')
            ]).then(([mapsModule, directionsModule]) => {
                setMapComponents({
                    MapView: mapsModule.default,
                    Marker: mapsModule.Marker,
                    PROVIDER_GOOGLE: mapsModule.PROVIDER_GOOGLE,
                    MapViewDirections: directionsModule.default,
                });
            }).catch(error => {
                console.error("Error loading map components", error);
            });
        }
    }, []);

    if (Platform.OS === 'web') {
        return (
            <View style={[styles.container, { padding: 24, justifyContent: 'center' }]}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>Mapa no disponible en web.</Text>
                <Text>Usa la app móvil para ver el mapa interactivo.</Text>
            </View>
        );
    }

    const { MapView, Marker, PROVIDER_GOOGLE, MapViewDirections } = mapComponents;

    if (!MapView || !MapViewDirections) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" />
                <Text>Cargando mapa...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
        <MapView
            provider={PROVIDER_GOOGLE} // Usar Google Maps
            style={styles.map}
            initialRegion={{
            latitude: 2.2, // Coordenada inicial centrada en la región
            longitude: -76.3,
            latitudeDelta: 1.5,  // Zoom para ver la región
            longitudeDelta: 1.5, // Zoom para ver la región
            }}
        >
            {places.map(place => (
            <Marker
                key={place.id}
                coordinate={place.coords}
                title={place.name}
            />
            ))}

            {/* Componente para dibujar la ruta */}
            <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor="hotpink"
            />
        </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MapScreen;
