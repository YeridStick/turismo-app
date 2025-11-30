import { Ionicons } from '@expo/vector-icons'; // Asumiendo que usas Expo
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ARViewer } from '../components/ARViewer';

interface ARScreenProps {
    route?: any;
    navigation?: any;
}

const ARScreen: React.FC<ARScreenProps> = ({ route, navigation }) => {
    const modelUrl = route?.params?.modelUrl;
    const [isLoading, setIsLoading] = useState(true);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Referencia para controlar el visor AR
    const viewerRef = useRef<any>(null);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleModelLoad = () => {
        setModelLoaded(true);
        setError(null);
    };

    const handleModelError = (err: any) => {
        setError('No se pudo cargar el modelo.');
    };

    const handleResetPosition = () => {
        if (viewerRef.current) {
            viewerRef.current.resetPosition();
        }
    };

    return (
        <View style={styles.container}>
            <ARViewer
                modelUrl={modelUrl}
                onModelLoad={handleModelLoad}
                onModelError={handleModelError}
                viewerRef={viewerRef}
            />

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B3CF0" />
                    <Text style={styles.loadingText}>Cargando...</Text>
                </View>
            )}

            {!isLoading && !error && (
                <>
                    {/* Botón Reset Posición */}
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={handleResetPosition}
                    >
                        <Ionicons name="locate" size={24} color="#fff" />
                        <Text style={styles.resetText}>Centrar Modelo</Text>
                    </TouchableOpacity>

                    <View style={styles.controlsContainer}>
                        <View style={styles.gestureHint}>
                            <Text style={styles.gestureIcon}>🤏</Text>
                            <Text style={styles.gestureText}>Escalar</Text>
                        </View>
                        <View style={styles.gestureHint}>
                            <Text style={styles.gestureIcon}>🔄</Text>
                            <Text style={styles.gestureText}>Rotar</Text>
                        </View>
                    </View>
                </>
            )}

            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation?.goBack?.()}
            >
                <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 10,
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontWeight: '600',
    },
    resetButton: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5B3CF0',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    resetText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(30,30,30,0.8)',
        borderRadius: 20,
        paddingVertical: 12,
    },
    gestureHint: {
        alignItems: 'center',
    },
    gestureIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    gestureText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    closeText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
});

export default ARScreen;
