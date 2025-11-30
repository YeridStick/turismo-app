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
    const [activeControl, setActiveControl] = useState<'scale' | null>(null);

    // Referencia para controlar el visor AR
    const viewerRef = useRef<any>(null);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleModelLoad = () => {
        setModelLoaded(true);
        setError(null);
        console.log('✓ Modelo cargado exitosamente');
    };

    const handleModelError = (err: any) => {
        console.error('✗ Error en modelo:', err);
        setError('No se pudo cargar el modelo. Verifica la URL.');
        setModelLoaded(false);
    };

    const handleResetPosition = () => {
        if (viewerRef.current) {
            viewerRef.current.resetPosition();
            setActiveControl(null);
            console.log('↻ Posición reseteada');
        }
    };

    // Controles de escala
    const handleIncreaseScale = () => {
        if (viewerRef.current?.increaseScale) {
            viewerRef.current.increaseScale();
        }
    };

    const handleDecreaseScale = () => {
        if (viewerRef.current?.decreaseScale) {
            viewerRef.current.decreaseScale();
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

            {/* Loading Overlay */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B3CF0" />
                    <Text style={styles.loadingText}>Inicializando AR...</Text>
                </View>
            )}

            {/* Error Message */}
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

            {/* Controls - Solo mostrar cuando modelo está cargado */}
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

                    {/* Panel de Control - Escala (Opcional, se puede ocultar) */}
                    {activeControl === 'scale' && (
                        <View style={styles.controlPanel}>
                            <Text style={styles.controlTitle}>Ajustar Escala</Text>
                            <View style={styles.controlButtons}>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleDecreaseScale}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="remove-circle" size={28} color="#fff" />
                                    <Text style={styles.controlButtonText}>Reducir</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleIncreaseScale}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add-circle" size={28} color="#fff" />
                                    <Text style={styles.controlButtonText}>Aumentar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Botones de Rotación Manual y Selector */}
                    <View style={styles.controlSelector}>
                        {/* Botón Rotar Izquierda */}
                        <TouchableOpacity
                            style={styles.selectorButton}
                            onPressIn={() => {
                                const interval = setInterval(() => {
                                    viewerRef.current?.rotateLeft();
                                }, 50);
                                (viewerRef.current as any).rotationInterval = interval;
                            }}
                            onPressOut={() => {
                                if ((viewerRef.current as any).rotationInterval) {
                                    clearInterval((viewerRef.current as any).rotationInterval);
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="refresh" size={24} color="#5B3CF0" style={{ transform: [{ scaleX: -1 }] }} />
                            <Text style={styles.selectorButtonText}>Girar Izq</Text>
                        </TouchableOpacity>

                        {/* Botón Toggle Escala */}
                        <TouchableOpacity
                            style={[
                                styles.selectorButton,
                                activeControl === 'scale' && styles.selectorButtonActive,
                            ]}
                            onPress={() => setActiveControl(activeControl === 'scale' ? null : 'scale')}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name="expand"
                                size={24}
                                color={activeControl === 'scale' ? '#fff' : '#5B3CF0'}
                            />
                            <Text style={[
                                styles.selectorButtonText,
                                activeControl === 'scale' && styles.selectorButtonTextActive,
                            ]}>
                                Escalar
                            </Text>
                        </TouchableOpacity>

                        {/* Botón Rotar Derecha */}
                        <TouchableOpacity
                            style={styles.selectorButton}
                            onPressIn={() => {
                                const interval = setInterval(() => {
                                    viewerRef.current?.rotateRight();
                                }, 50);
                                (viewerRef.current as any).rotationInterval = interval;
                            }}
                            onPressOut={() => {
                                if ((viewerRef.current as any).rotationInterval) {
                                    clearInterval((viewerRef.current as any).rotationInterval);
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="refresh" size={24} color="#5B3CF0" />
                            <Text style={styles.selectorButtonText}>Girar Der</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Hint de gestos */}
                    <View style={styles.gestureHint}>
                        <Text style={styles.gestureHintText}>
                            ✋ Desliza para mover | 🤏 Pellizca para escalar
                        </Text>
                    </View>

                    {/* Botón Cerrar */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => navigation?.goBack?.()}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                </>
            )}
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
        top: 80,
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
    // Panel de control
    controlPanel: {
        position: 'absolute',
        top: 140,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderRadius: 16,
        padding: 16,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    controlTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    controlButtons: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-around',
    },
    controlButton: {
        flex: 1,
        backgroundColor: 'rgba(91, 60, 240, 0.8)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 6,
        elevation: 4,
    },
    controlButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    // Selector de controles
    controlSelector: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
    },
    selectorButton: {
        width: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: '#5B3CF0',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        elevation: 4,
    },
    selectorButtonActive: {
        backgroundColor: '#5B3CF0',
        borderColor: '#fff',
    },
    selectorButtonText: {
        color: '#5B3CF0',
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
    selectorButtonTextActive: {
        color: '#fff',
    },
    // Hint de gestos
    gestureHint: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        backgroundColor: 'rgba(91, 60, 240, 0.7)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    gestureHintText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
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