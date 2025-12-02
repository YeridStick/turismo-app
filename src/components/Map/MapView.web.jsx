import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, Circle as LeafletCircle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// MapView component for web
export const MapView = ({
  style,
  initialRegion,
  region,
  children,
  showsUserLocation,
  showsMyLocationButton,
  scrollEnabled = true,
  zoomEnabled = true,
  ...props
}) => {
  const center = region
    ? [region.latitude, region.longitude]
    : initialRegion
    ? [initialRegion.latitude, initialRegion.longitude]
    : [2.9273, -75.2819]; // Default to Neiva, Huila

  const zoom = initialRegion?.latitudeDelta
    ? Math.round(Math.log(360 / initialRegion.latitudeDelta) / Math.LN2)
    : 13;

  return (
    <View style={[styles.container, style]}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={zoomEnabled}
        dragging={scrollEnabled}
        {...props}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </View>
  );
};

// Marker component for web
export const Marker = ({ coordinate, title, description, onCalloutPress, children }) => {
  if (!coordinate) return null;

  const position = [coordinate.latitude, coordinate.longitude];

  return (
    <LeafletMarker position={position} eventHandlers={{
      click: onCalloutPress ? () => onCalloutPress() : undefined
    }}>
      {(title || description) && (
        <Popup>
          {title && <strong>{title}</strong>}
          {description && <div>{description}</div>}
        </Popup>
      )}
      {children}
    </LeafletMarker>
  );
};

// Import Marker from react-leaflet with different name to avoid conflict
const LeafletMarker = require('react-leaflet').Marker;

// Circle component for web
export const Circle = ({ center, radius, fillColor, strokeColor, strokeWidth }) => {
  if (!center) return null;

  const position = [center.latitude, center.longitude];

  // Convert hex colors with alpha to rgba
  const parseColor = (color) => {
    if (!color) return color;
    if (color.startsWith('rgba')) return color;

    // Parse rgba(r,g,b,a) format
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return color;
    }

    return color;
  };

  return (
    <LeafletCircle
      center={position}
      radius={radius}
      pathOptions={{
        fillColor: parseColor(fillColor),
        color: parseColor(strokeColor),
        weight: strokeWidth || 2,
        fillOpacity: 0.1,
        opacity: 0.5,
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default MapView;
