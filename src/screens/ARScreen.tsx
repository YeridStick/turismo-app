import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const [activeControl, setActiveControl] = useState<'scale' | 'rotate' | null>('scale');
    const [showControls, setShowControls] = useState(true);
    const [showHelpHint, setShowHelpHint] = useState(true);

    // Referencia para controlar el visor AR
    const viewerRef = useRef<any>(null);
    // Referencia para el intervalo de rotación continua
    const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // Animación para el hint de ayuda
    const hintOpacity = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    // Auto-ocultar hint de ayuda después de 5 segundos con fade out
    React.useEffect(() => {
        if (modelLoaded && showHelpHint) {
            const timer = setTimeout(() => {
                Animated.timing(hintOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => setShowHelpHint(false));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [modelLoaded, showHelpHint, hintOpacity]);

    // Limpiar intervalo al desmontar
    React.useEffect(() => {
        return () => {
            if (rotationIntervalRef.current) {
                clearInterval(rotationIntervalRef.current);
            }
        };
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

    // Controles de rotación continua
    const startRotateLeft = () => {
        if (viewerRef.current?.rotateLeft) {
            viewerRef.current.rotateLeft();
        }
        rotationIntervalRef.current = setInterval(() => {
            if (viewerRef.current?.rotateLeft) {
                viewerRef.current.rotateLeft();
            }
        }, 100);
    };

    const startRotateRight = () => {
        if (viewerRef.current?.rotateRight) {
            viewerRef.current.rotateRight();
        }
        rotationIntervalRef.current = setInterval(() => {
            if (viewerRef.current?.rotateRight) {
                viewerRef.current.rotateRight();
            }
        }, 100);
    };

    const stopRotation = () => {
        if (rotationIntervalRef.current) {
            clearInterval(rotationIntervalRef.current);
            rotationIntervalRef.current = null;
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
                    {/* Cabecera mínima: centrar y salir */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleResetPosition}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="locate" size={20} color="#fff" />
                            <Text style={styles.resetText}>Centrar</Text>
                        </TouchableOpacity>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={styles.toggleVisibility}
                                onPress={() => {
                                    setShowControls((prev) => {
                                        const next = !prev;
                                        if (next) {
                                            setActiveControl('scale');
                                        }
                                        return next;
                                    });
                                }}
                                activeOpacity={0.85}
                            >
                                <Ionicons
                                    name={showControls ? "eye-off" : "eye"}
                                    size={16}
                                    color="#0f172a"
                                />
                                <Text style={styles.toggleVisibilityText}>
                                    {showControls ? "Ocultar" : "Mostrar"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.closeChip}
                                onPress={() => navigation?.goBack?.()}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="close" size={16} color="#0f172a" />
                                <Text style={styles.closeChipText}>Salir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Panel compacto con visibilidad controlable */}
                    {showControls && (
                        <View style={styles.miniPanel}>
                            <View style={styles.miniRow}>
                                <TouchableOpacity
                                    style={styles.miniAction}
                                    onPress={handleDecreaseScale}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="remove" size={18} color="#fff" />
                                    <Text style={styles.miniActionText}>Reducir</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.miniAction}
                                    onPress={handleIncreaseScale}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="add" size={18} color="#fff" />
                                    <Text style={styles.miniActionText}>Aumentar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.miniAction}
                                    onPressIn={startRotateLeft}
                                    onPressOut={stopRotation}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="refresh" size={18} color="#fff" />
                                    <Text style={styles.miniActionText}>Rotar izq.</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.miniAction}
                                    onPressIn={startRotateRight}
                                    onPressOut={stopRotation}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="refresh-outline" size={18} color="#fff" />
                                    <Text style={styles.miniActionText}>Rotar der.</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

            {/* Hint de ayuda con auto-hide */}
            {showHelpHint && (
                <Animated.View style={[styles.gestureHint, { opacity: hintOpacity }]}>
                    <Text style={styles.gestureHintText}>
                        ✋ Desliza | 🤏 Pellizca | 🔄 Dos dedos para rotar
                    </Text>
                </Animated.View>
            )}
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5B3CF0',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 18,
        elevation: 4,
        shadowColor: '#5B3CF0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    resetText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 10,
        fontSize: 14,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toggleVisibility: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
        elevation: 3,
    },
    toggleVisibilityText: {
        color: '#0f172a',
        fontWeight: '700',
        fontSize: 12,
    },
    // Cabecera y mini panel
    headerRow: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 12,
    },
    closeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
        elevation: 3,
    },
    closeChipText: {
        color: '#0f172a',
        fontWeight: '700',
        fontSize: 12,
    },
    miniPanel: {
        position: 'absolute',
        bottom: 32,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 16,
        padding: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    miniRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'space-between',
    },
    miniAction: {
        flexBasis: '48%',
        backgroundColor: 'rgba(91, 60, 240, 0.85)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        gap: 6,
        elevation: 3,
    },
    miniActionText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
        textAlign: 'center',
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
