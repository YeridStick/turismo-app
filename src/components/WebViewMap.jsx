import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const noop = () => {};

const DEFAULT_REGION = {
    latitude: 4.5709,
    longitude: -74.2973,
    latitudeDelta: 10,
    longitudeDelta: 10,
};

const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toSignatureNumber = (value, fractionDigits = 6) =>
    toFiniteNumber(value).toFixed(fractionDigits);

// Calculate zoom level from latitudeDelta
const calculateZoomLevel = (latitudeDelta) => {
    if (latitudeDelta >= 10) return 6;
    if (latitudeDelta >= 5) return 7;
    if (latitudeDelta >= 2) return 8;
    if (latitudeDelta >= 1) return 9;
    if (latitudeDelta >= 0.5) return 10;
    if (latitudeDelta >= 0.2) return 11;
    if (latitudeDelta >= 0.1) return 12;
    if (latitudeDelta >= 0.05) return 13;
    return 14;
};

const normalizeRegion = (region) => ({
    latitude: toFiniteNumber(region?.latitude, DEFAULT_REGION.latitude),
    longitude: toFiniteNumber(region?.longitude, DEFAULT_REGION.longitude),
    latitudeDelta: toFiniteNumber(region?.latitudeDelta, DEFAULT_REGION.latitudeDelta),
    longitudeDelta: toFiniteNumber(region?.longitudeDelta, DEFAULT_REGION.longitudeDelta),
});

const getRegionSignature = (region) =>
    [
        toSignatureNumber(region.latitude),
        toSignatureNumber(region.longitude),
        toSignatureNumber(region.latitudeDelta),
        toSignatureNumber(region.longitudeDelta),
    ].join('|');

const getMarkersSignature = (markers = []) =>
    markers
        .map((marker, index) =>
            [
                marker?.id ?? index,
                toSignatureNumber(marker?.latitude),
                toSignatureNumber(marker?.longitude),
                marker?.title || '',
                marker?.description || '',
                marker?.pinColor || '',
            ].join(':'),
        )
        .join('|');

const getUserLocationSignature = (userLocation) =>
    userLocation
        ? [
            toSignatureNumber(userLocation.latitude),
            toSignatureNumber(userLocation.longitude),
        ].join('|')
        : 'none';

const getCircleSignature = ({ showCircle, circleRadius, userLocation }) =>
    [
        showCircle ? 'show' : 'hide',
        toSignatureNumber(circleRadius, 2),
        getUserLocationSignature(userLocation),
    ].join('|');

const WebViewMap = ({
    initialRegion,
    markers = [],
    userLocation = null,
    showCircle = false,
    circleRadius = 50000,
    pauseUpdates = false,
    onMapReady = noop,
    onMapPress = null,
}) => {
    const webViewRef = useRef(null);
    const pauseUpdatesRef = useRef(pauseUpdates);
    const sentSignaturesRef = useRef({});
    const queuedSignaturesRef = useRef({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        pauseUpdatesRef.current = pauseUpdates;
    }, [pauseUpdates]);

    const effectiveInitialRegion = useMemo(
        () => normalizeRegion(initialRegion),
        [
            initialRegion?.latitude,
            initialRegion?.longitude,
            initialRegion?.latitudeDelta,
            initialRegion?.longitudeDelta,
        ],
    );

    const initialRegionSignature = useMemo(
        () => getRegionSignature(effectiveInitialRegion),
        [effectiveInitialRegion],
    );

    const markersSignature = useMemo(
        () => getMarkersSignature(markers),
        [markers],
    );

    const userLocationSignature = useMemo(
        () => getUserLocationSignature(userLocation),
        [userLocation?.latitude, userLocation?.longitude],
    );

    const circleSignature = useMemo(
        () => getCircleSignature({ showCircle, circleRadius, userLocation }),
        [circleRadius, showCircle, userLocation?.latitude, userLocation?.longitude],
    );

    useEffect(() => {
        sentSignaturesRef.current = {};
        queuedSignaturesRef.current = {};
    }, [initialRegionSignature]);

    const postMapMessage = useCallback((signatureKey, signature, payload, delay = 500) => {
        if (!signatureKey || signature == null) return;
        if (
            sentSignaturesRef.current[signatureKey] === signature ||
            queuedSignaturesRef.current[signatureKey] === signature
        ) {
            return;
        }

        queuedSignaturesRef.current[signatureKey] = signature;

        setTimeout(() => {
            if (queuedSignaturesRef.current[signatureKey] !== signature) return;
            queuedSignaturesRef.current[signatureKey] = null;

            if (webViewRef.current && !pauseUpdatesRef.current) {
                webViewRef.current.postMessage(JSON.stringify(payload));
                sentSignaturesRef.current[signatureKey] = signature;
            }
        }, delay);
    }, []);

    // Generate HTML for the map with OpenStreetMap
    const mapHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>OpenStreetMap</title>

        <!-- Leaflet CSS -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
              integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
              crossorigin="anonymous"/>

        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
                overflow: hidden;
            }
            #map {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                height: 100%;
                background-color: #E5E3DF;
            }
            #loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                font-family: Arial, sans-serif;
                z-index: 9999;
            }
            .leaflet-tile {
                image-rendering: -webkit-optimize-contrast;
            }
        </style>
    </head>
    <body>
        <div id="loading">Cargando mapa...</div>
        <div id="map"></div>

        <!-- Leaflet JS -->
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                crossorigin="anonymous"></script>

        <script>
            // Console log wrapper for React Native
            function log(message) {
                console.log('[WebViewMap] ' + message);
                try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'LOG',
                        message: message
                    }));
                } catch(e) {}
            }

            // Error handler
            window.onerror = function(msg, url, line, col, error) {
                const errorMsg = 'Error: ' + msg + ' at ' + url + ':' + line;
                log(errorMsg);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ERROR',
                    message: errorMsg
                }));
                return false;
            };

            log('Iniciando carga del mapa...');

            // Wait for Leaflet to be loaded
            function initMap() {
                try {
                    if (typeof L === 'undefined') {
                        log('Leaflet no está cargado, reintentando...');
                        setTimeout(initMap, 100);
                        return;
                    }

                    log('Leaflet cargado, inicializando mapa...');

                    // Hide loading indicator
                    const loadingDiv = document.getElementById('loading');
                    if (loadingDiv) loadingDiv.style.display = 'none';

                    // Initialize the map
                    const map = L.map('map', {
                        zoomControl: true,
                        attributionControl: true,
                        preferCanvas: true
                    }).setView(
                        [${effectiveInitialRegion.latitude}, ${effectiveInitialRegion.longitude}],
                        ${calculateZoomLevel(effectiveInitialRegion.latitudeDelta)}
                    );

                    log('Mapa inicializado en [${effectiveInitialRegion.latitude}, ${effectiveInitialRegion.longitude}]');

                    // Add map tiles with fallback. WebView can occasionally fail one CDN
                    // and leave only Leaflet's beige base visible.
                    const tileProviders = [
                        {
                            name: 'OpenStreetMap',
                            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        },
                        {
                            name: 'OpenStreetMap DE',
                            url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }
                    ];
                    let activeTileProviderIndex = 0;
                    let tileLayer = null;
                    let tileErrorCount = 0;

                    function addTileLayer(providerIndex) {
                        const provider = tileProviders[providerIndex];
                        if (tileLayer) {
                            map.removeLayer(tileLayer);
                        }
                        tileErrorCount = 0;
                        tileLayer = L.tileLayer(provider.url, {
                            attribution: provider.attribution,
                            maxZoom: 19,
                            minZoom: 3,
                            crossOrigin: true,
                            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                        }).addTo(map);

                        tileLayer.on('tileerror', function(error) {
                            tileErrorCount += 1;
                            log('Error cargando tile ' + provider.name + ': ' + error.tile.src);
                            if (tileErrorCount >= 3 && activeTileProviderIndex < tileProviders.length - 1) {
                                activeTileProviderIndex += 1;
                                log('Cambiando proveedor de mapa a ' + tileProviders[activeTileProviderIndex].name);
                                addTileLayer(activeTileProviderIndex);
                            }
                        });

                        log('Capa de tiles agregada: ' + provider.name);
                    }

                    addTileLayer(activeTileProviderIndex);
                    setTimeout(function() {
                        map.invalidateSize();
                    }, 250);
                    setTimeout(function() {
                        map.invalidateSize();
                    }, 900);

                    // Store markers and circles
                    window.mapInstance = map;
                    window.markersLayer = L.layerGroup().addTo(map);
                    window.circleLayer = null;
                    window.userMarker = null;

                    // Function to update markers
                    window.updateMarkers = function(markersData) {
                        try {
                            log('Actualizando ' + markersData.length + ' marcadores...');
                            window.markersLayer.clearLayers();

                            markersData.forEach((marker, index) => {
                                const m = L.marker([marker.latitude, marker.longitude])
                                    .bindPopup(\`
                                        <div style="font-family: Arial, sans-serif;">
                                            <strong style="color: #333; font-size: 14px;">\${marker.title}</strong><br>
                                            <span style="color: #666; font-size: 12px;">\${marker.description || ''}</span>
                                        </div>
                                    \`);
                                window.markersLayer.addLayer(m);
                            });
                            log('Marcadores actualizados');
                        } catch(e) {
                            log('Error actualizando marcadores: ' + e.message);
                        }
                    };

                    // Function to update user location
                    window.updateUserLocation = function(lat, lng) {
                        try {
                            if (window.userMarker) {
                                window.mapInstance.removeLayer(window.userMarker);
                            }

                            const userIcon = L.divIcon({
                                className: 'user-location-marker',
                                html: '<div style="background: #4285F4; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>',
                                iconSize: [24, 24],
                                iconAnchor: [12, 12]
                            });

                            window.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(window.mapInstance);
                            log('Ubicación del usuario actualizada: [' + lat + ', ' + lng + ']');
                        } catch(e) {
                            log('Error actualizando ubicación: ' + e.message);
                        }
                    };

                    // Function to update circle
                    window.updateCircle = function(lat, lng, radius, show) {
                        try {
                            if (window.circleLayer) {
                                window.mapInstance.removeLayer(window.circleLayer);
                                window.circleLayer = null;
                            }

                            if (show) {
                                window.circleLayer = L.circle([lat, lng], {
                                    radius: radius,
                                    color: '#156436',
                                    fillColor: '#156436',
                                    fillOpacity: 0.1,
                                    weight: 2,
                                    opacity: 0.5
                                }).addTo(window.mapInstance);
                                log('Círculo de ' + (radius/1000) + 'km agregado');
                            }
                        } catch(e) {
                            log('Error actualizando círculo: ' + e.message);
                        }
                    };

                    // Listen for messages from React Native
                    const handleIncomingMessage = function(event) {
                        try {
                            const data = JSON.parse(event.data);
                            log('Mensaje recibido: ' + data.type);

                            if (data.type === 'UPDATE_MARKERS') {
                                log('Recibidos ' + data.markers.length + ' marcadores');
                                window.updateMarkers(data.markers);
                            }

                            if (data.type === 'UPDATE_USER_LOCATION') {
                                log('Recibida ubicación: ' + data.latitude + ', ' + data.longitude);
                                window.updateUserLocation(data.latitude, data.longitude);
                            }

                            if (data.type === 'UPDATE_CIRCLE') {
                                log('Recibido círculo: radio ' + data.radius);
                                window.updateCircle(data.latitude, data.longitude, data.radius, data.show);
                            }

                            if (data.type === 'FIT_BOUNDS') {
                                const bounds = L.latLngBounds(data.bounds);
                                window.mapInstance.fitBounds(bounds, { padding: [50, 50] });
                            }
                        } catch(e) {
                            log('Error procesando mensaje: ' + e.message);
                        }
                    };

                    // Notify React Native when user taps the map
                    map.on('click', function(e) {
                        try {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'MAP_CLICK',
                                latitude: e.latlng.lat,
                                longitude: e.latlng.lng
                            }));
                        } catch (err) {}
                    });

                    // Compatibilidad iOS/Android: ambos eventos pueden dispararse
                    window.addEventListener('message', handleIncomingMessage);
                    document.addEventListener('message', handleIncomingMessage);

                    // Notify React Native that map is ready
                    log('Mapa completamente cargado y listo');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'MAP_READY',
                        provider: 'OpenStreetMap'
                    }));

                } catch(e) {
                    log('Error fatal inicializando mapa: ' + e.message);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'ERROR',
                        message: e.message
                    }));
                }
            }

            // Start initialization when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initMap);
            } else {
                initMap();
            }
        </script>
    </body>
    </html>
    `, [
        effectiveInitialRegion.latitude,
        effectiveInitialRegion.longitude,
        effectiveInitialRegion.latitudeDelta,
        effectiveInitialRegion.longitudeDelta,
    ]);

    const webViewSource = useMemo(() => ({ html: mapHTML }), [mapHTML]);

    // Send updates to WebView when props change
    // Usar setTimeout para asegurar que el WebView está listo en APK
    useEffect(() => {
        if (!isLoading && !pauseUpdates) {
            postMapMessage(
                'markers',
                markersSignature,
                {
                    type: 'UPDATE_MARKERS',
                    markers,
                },
                500,
            );
        }
    }, [isLoading, markers, markersSignature, pauseUpdates, postMapMessage]);

    useEffect(() => {
        if (userLocation && !isLoading && !pauseUpdates) {
            postMapMessage(
                'userLocation',
                userLocationSignature,
                {
                    type: 'UPDATE_USER_LOCATION',
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                },
                500,
            );
        }
    }, [
        isLoading,
        pauseUpdates,
        postMapMessage,
        userLocation,
        userLocationSignature,
    ]);

    useEffect(() => {
        if (userLocation && !isLoading && !pauseUpdates) {
            postMapMessage(
                'circle',
                circleSignature,
                {
                    type: 'UPDATE_CIRCLE',
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    radius: circleRadius,
                    show: showCircle,
                },
                500,
            );
        }
    }, [
        circleRadius,
        circleSignature,
        isLoading,
        pauseUpdates,
        postMapMessage,
        showCircle,
        userLocation,
    ]);

    const handleMessage = useCallback((event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'MAP_READY') {
                console.log('✅ Mapa OpenStreetMap cargado exitosamente');
                console.log('Provider:', data.provider);
                setIsLoading(false);
                setError(null);

                // Enviar datos inmediatamente después de que el mapa esté listo
                postMapMessage(
                    'markers',
                    markersSignature,
                    {
                        type: 'UPDATE_MARKERS',
                        markers,
                    },
                    1000,
                );
                if (userLocation) {
                    postMapMessage(
                        'userLocation',
                        userLocationSignature,
                        {
                            type: 'UPDATE_USER_LOCATION',
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                        },
                        1000,
                    );
                    if (showCircle) {
                        postMapMessage(
                            'circle',
                            circleSignature,
                            {
                                type: 'UPDATE_CIRCLE',
                                latitude: userLocation.latitude,
                                longitude: userLocation.longitude,
                                radius: circleRadius,
                                show: showCircle,
                            },
                            1000,
                        );
                    }
                }
                onMapReady();
            } else if (data.type === 'MAP_CLICK') {
                if (onMapPress) {
                    onMapPress({
                        latitude: data.latitude,
                        longitude: data.longitude,
                    });
                }
            } else if (data.type === 'ERROR') {
                console.error('❌ Error en WebView:', data.message);
                setError(data.message);
                setIsLoading(false);
            } else if (data.type === 'LOG') {
                console.log('📍 [WebView]:', data.message);
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    }, [
        circleRadius,
        circleSignature,
        markers,
        markersSignature,
        onMapPress,
        onMapReady,
        postMapMessage,
        showCircle,
        userLocation,
        userLocationSignature,
    ]);

    const handleError = useCallback((syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error:', nativeEvent);
        setError('Error cargando el mapa');
        setIsLoading(false);
    }, []);

    const handleLoadStart = useCallback(() => {
        console.log('🔄 Iniciando carga del WebView...');
        setIsLoading(true);
    }, []);

    const handleLoadEnd = useCallback(() => {
        console.log('✅ WebView cargado');
    }, []);

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={webViewSource}
                style={styles.webView}
                onMessage={handleMessage}
                onError={handleError}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                cacheEnabled={false}
                cacheMode="LOAD_NO_CACHE"
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#156436" />
                        <Text style={styles.loadingText}>Cargando mapa OpenStreetMap...</Text>
                    </View>
                )}
                scalesPageToFit={false}
                scrollEnabled={true}
                bounces={false}
                overScrollMode="never"
                mixedContentMode="always"
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
            />
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Text style={styles.errorHint}>Verifica tu conexión a Internet</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webView: {
        flex: 1,
        backgroundColor: '#E5E3DF',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
    errorContainer: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 59, 48, 0.95)',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    errorText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    errorHint: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
    },
});

export default WebViewMap;
