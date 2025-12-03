import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const WebViewMap = ({
    initialRegion,
    markers = [],
    userLocation = null,
    showCircle = false,
    circleRadius = 50000,
    onMapReady = () => { }
}) => {
    const webViewRef = useRef(null);

    // Generate HTML for the map
    const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
            }
            #map {
                height: 100%;
                width: 100%;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            // Initialize the map
            const map = L.map('map', {
                zoomControl: true,
                attributionControl: true
            }).setView(
                [${initialRegion.latitude}, ${initialRegion.longitude}], 
                ${calculateZoomLevel(initialRegion.latitudeDelta)}
            );

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            // Store markers and circles
            let markersLayer = L.layerGroup().addTo(map);
            let circleLayer = null;
            let userMarker = null;

            // Function to update markers
            function updateMarkers(markersData) {
                markersLayer.clearLayers();
                
                markersData.forEach(marker => {
                    const m = L.marker([marker.latitude, marker.longitude])
                        .bindPopup(\`
                            <strong>\${marker.title}</strong><br>
                            \${marker.description || ''}
                        \`);
                    markersLayer.addLayer(m);
                });
            }

            // Function to update user location
            function updateUserLocation(lat, lng) {
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                
                const userIcon = L.divIcon({
                    className: 'user-location-marker',
                    html: '<div style="background: #4285F4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });
                
                userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
            }

            // Function to update circle
            function updateCircle(lat, lng, radius, show) {
                if (circleLayer) {
                    map.removeLayer(circleLayer);
                    circleLayer = null;
                }
                
                if (show) {
                    circleLayer = L.circle([lat, lng], {
                        radius: radius,
                        color: 'rgba(0, 122, 255, 0.5)',
                        fillColor: 'rgba(0, 122, 255, 0.1)',
                        fillOpacity: 0.2,
                        weight: 2
                    }).addTo(map);
                }
            }

            // Listen for messages from React Native
            window.addEventListener('message', function(event) {
                const data = JSON.parse(event.data);
                
                if (data.type === 'UPDATE_MARKERS') {
                    updateMarkers(data.markers);
                }
                
                if (data.type === 'UPDATE_USER_LOCATION') {
                    updateUserLocation(data.latitude, data.longitude);
                }
                
                if (data.type === 'UPDATE_CIRCLE') {
                    updateCircle(data.latitude, data.longitude, data.radius, data.show);
                }
                
                if (data.type === 'FIT_BOUNDS') {
                    const bounds = L.latLngBounds(data.bounds);
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            });

            // Notify React Native that map is ready
            setTimeout(() => {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
            }, 500);
        </script>
    </body>
    </html>
    `;

    // Calculate zoom level from latitudeDelta
    function calculateZoomLevel(latitudeDelta) {
        if (latitudeDelta >= 10) return 6;
        if (latitudeDelta >= 5) return 7;
        if (latitudeDelta >= 2) return 8;
        if (latitudeDelta >= 1) return 9;
        if (latitudeDelta >= 0.5) return 10;
        if (latitudeDelta >= 0.2) return 11;
        if (latitudeDelta >= 0.1) return 12;
        if (latitudeDelta >= 0.05) return 13;
        return 14;
    }

    // Send updates to WebView when props change
    useEffect(() => {
        if (webViewRef.current && markers.length > 0) {
            const message = JSON.stringify({
                type: 'UPDATE_MARKERS',
                markers: markers
            });
            webViewRef.current.postMessage(message);
        }
    }, [markers]);

    useEffect(() => {
        if (webViewRef.current && userLocation) {
            const message = JSON.stringify({
                type: 'UPDATE_USER_LOCATION',
                latitude: userLocation.latitude,
                longitude: userLocation.longitude
            });
            webViewRef.current.postMessage(message);
        }
    }, [userLocation]);

    useEffect(() => {
        if (webViewRef.current && userLocation) {
            const message = JSON.stringify({
                type: 'UPDATE_CIRCLE',
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                radius: circleRadius,
                show: showCircle
            });
            webViewRef.current.postMessage(message);
        }
    }, [showCircle, circleRadius, userLocation]);

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'MAP_READY') {
                onMapReady();
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ html: mapHTML }}
                style={styles.webView}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={false}
                scalesPageToFit={false}
                scrollEnabled={true}
                bounces={false}
                overScrollMode="never"
            />
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
});

export default WebViewMap;
