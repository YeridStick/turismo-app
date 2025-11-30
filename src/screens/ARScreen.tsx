import { Ionicons } from '@expo/vector-icons';
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
    const [gestureHintsVisible, setGestureHintsVisible] = useState(true);

    // Referencia para controlar el visor AR
    const viewerRef = useRef<any>(null);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleModelLoad = () => {
        setModelLoaded(true);
        setError(null);
        console.log('Modelo cargado exitosamente');
    };

    const handleModelError = (err: any) => {
        console.error('Error en modelo:', err);
        setError('No se pudo cargar el modelo. Verifica la URL.');
        setModelLoaded(false);
    };

    const handleResetPosition = () => {
        if (viewerRef.current) {
            viewerRef.current.resetPosition();
            console.log('Posición reseteada');
        }
    };

    const toggleGestureHints = () => {
        setGestureHintsVisible(!gestureHintsVisible);
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
                    <Text style={styles.loadingText}>Inicializando AR...</Text>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        onPress={() => setError(null)}
                        style={styles.errorDismissButton}
                    >
                        <Text style={styles.errorDismissText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isLoading && !error && modelLoaded && (
                <>
                    {/* Botón Reset Posición */}
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={handleResetPosition}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="locate" size={24} color="#fff" />
                        <Text style={styles.resetText}>Centrar</Text>
                    </TouchableOpacity>

                    {/* Gestos información */}
                    {gestureHintsVisible && (
                        <View style={styles.controlsContainer}>
                            <View style={styles.gestureHint}>
                                <Text style={styles.gestureIcon}>🤏</Text>
                                <Text style={styles.gestureText}>Pellizcar</Text>
                            </View>
                            <View style={styles.gestureHint}>
                                <Text style={styles.gestureIcon}>🔄</Text>
                                <Text style={styles.gestureText}>Rotar</Text>
                            </View>
                            <View style={styles.gestureHint}>
                                <Text style={styles.gestureIcon}>✋</Text>
                                <Text style={styles.gestureText}>Arrastrar</Text>
                            </View>
                        </View>
                    )}

                    {/* Botón para mostrar/ocultar hints */}
                    <TouchableOpacity
                        style={styles.toggleHintsButton}
                        onPress={toggleGestureHints}
                    >
                        <Ionicons
                            name={gestureHintsVisible ? 'eye' : 'eye-off'}
                            size={20}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </>
            )}

            {/* Botón Cerrar */}
            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation?.goBack?.()}
                activeOpacity={0.8}
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
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 10,
    },
    loadingText: {
        color: '#fff',
        marginTop: 15,
        fontWeight: '600',
        fontSize: 16,
    },
    errorContainer: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: '#FF4444',
        borderRadius: 12,
        padding: 16,
        zIndex: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    errorText: {
        color: '#fff',
        fontWeight: '500',
        flex: 1,
        marginRight: 10,
    },
    errorDismissButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 6,
    },
    errorDismissText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    resetButton: {
        position: 'absolute',
        bottom: 130,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5B3CF0',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 28,
        elevation: 8,
        shadowColor: '#5B3CF0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    resetText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 10,
        fontSize: 14,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderRadius: 24,
        paddingVertical: 14,
        paddingHorizontal: 10,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    gestureHint: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    gestureIcon: {
        fontSize: 22,
        marginBottom: 6,
    },
    gestureText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    toggleHintsButton: {
        position: 'absolute',
        bottom: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(91, 60, 240, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#5B3CF0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    closeText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
});

export default ARScreen;