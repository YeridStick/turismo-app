import React from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING } from '../utils/constants';

interface PlaceMapProps {
    visible: boolean;
    onClose: () => void;
    place: {
        id?: number;
        name?: string;
        lat?: number;
        lng?: number;
        address?: string;
    } | null;
}

const PlaceMap: React.FC<PlaceMapProps> = ({ visible, onClose, place }) => {
    const navigation = useNavigation();

    if (!place?.lat || !place?.lng) {
        return (
            <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
                <View style={styles.backdrop}>
                    <View style={styles.card}>
                        <Text style={styles.title}>Mapa no disponible</Text>
                        <Text style={styles.text}>Este lugar no tiene coordenadas registradas.</Text>
                        <TouchableOpacity style={styles.button} onPress={onClose}>
                            <Text style={styles.buttonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    // URL de Google Maps
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

    const handleOpenFullMap = () => {
        onClose();
        // @ts-ignore - navegación de react-navigation
        navigation.navigate('Map', { placeId: place.id });
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>📍</Text>
                    </View>

                    <Text style={styles.title}>{place.name || 'Lugar seleccionado'}</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Dirección:</Text>
                        <Text style={styles.value}>
                            {place.address || 'No disponible'}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Coordenadas:</Text>
                        <Text style={styles.value}>
                            {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.infoText}>
                        Usa el mapa interactivo para ver tu ubicación y explorar sitios cercanos.
                    </Text>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleOpenFullMap}
                    >
                        <Text style={styles.buttonText}>🗺️ Ver en Mapa Interactivo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.buttonSecondary}
                        onPress={() => {
                            Linking.openURL(googleMapsUrl);
                        }}
                    >
                        <Text style={styles.buttonSecondaryText}>📍 Abrir en Google Maps</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.buttonTertiary} onPress={onClose}>
                        <Text style={styles.buttonTertiaryText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: SPACING.xl,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    icon: {
        fontSize: 48,
    },
    title: {
        fontWeight: '700',
        fontSize: 20,
        color: COLORS.text,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    infoRow: {
        marginBottom: SPACING.sm,
    },
    label: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 2,
        fontWeight: '600',
    },
    value: {
        fontSize: 14,
        color: COLORS.text,
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: SPACING.md,
    },
    text: {
        color: COLORS.textLight,
        fontSize: 14,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    infoText: {
        color: COLORS.textLight,
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: SPACING.md,
        textAlign: 'center',
        lineHeight: 18,
    },
    button: {
        marginTop: SPACING.sm,
        backgroundColor: '#156436',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#156436',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    buttonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    buttonSecondary: {
        marginTop: SPACING.sm,
        backgroundColor: 'transparent',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#156436',
    },
    buttonSecondaryText: {
        color: '#156436',
        fontWeight: '600',
        fontSize: 15,
    },
    buttonTertiary: {
        marginTop: SPACING.sm,
        backgroundColor: 'transparent',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    buttonTertiaryText: {
        color: COLORS.text,
        fontWeight: '600',
        fontSize: 15,
    },
});

export default PlaceMap;
