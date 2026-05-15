import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ARViewer } from '../components/ARViewer';

interface ARScreenProps {
    route?: any;
    navigation?: any;
}

// Badge animado "AR Activo"
const ARActiveBadge: React.FC<{ animate?: boolean }> = ({ animate = true }) => {
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!animate) {
            pulse.setValue(1);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [animate, pulse]);

    return (
        <View style={styles.badge}>
            <Animated.View style={[styles.badgeDot, { opacity: pulse }]} />
            <Text style={styles.badgeText}>AR Activo</Text>
        </View>
    );
};

// Pantalla de carga premium
const LoadingOverlay: React.FC<{ progress: number }> = ({ progress }) => {
    const pulse = useRef(new Animated.Value(1)).current;
    const barWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 0.8, duration: 900, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        Animated.timing(barWidth, {
            toValue: progress,
            duration: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    }, [progress]);

    // ... spinAnim interpolator removed as we use pulse now

    const label =
        progress < 20
            ? 'Activando camara AR...'
            : progress < 50
            ? 'Inicializando escena...'
            : progress < 70
            ? 'Cargando modelo 3D...'
            : progress < 90
            ? 'Procesando geometria...'
            : 'Preparando experiencia...';

    return (
        <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
                <Animated.View style={[styles.loadingIconContainer, { transform: [{ scale: pulse }] }]}>
                    <Ionicons name="globe-outline" size={48} color="#14B8A6" />
                </Animated.View>
                <Text style={styles.loadingTitle}>Realidad Aumentada</Text>
                <Text style={styles.loadingLabel}>{label}</Text>

                {/* Barra de progreso */}
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                width: barWidth.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                </View>
                <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
        </View>
    );
};

// ... actualizando estilos mas abajo ...

const ARScreen: React.FC<ARScreenProps> = ({ route, navigation }) => {
    const modelUrl = route?.params?.modelUrl;
    const placeName: string = route?.params?.placeName || 'Modelo 3D';

    const [loadProgress, setLoadProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showControls, setShowControls] = useState(true);
    const [showHelpHint, setShowHelpHint] = useState(true);
    const [powerSaverMode, setPowerSaverMode] = useState(true);

    const viewerRef = useRef<any>(null);
    const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const hintOpacity = useRef(new Animated.Value(1)).current;
    const controlsAnim = useRef(new Animated.Value(0)).current;

    // Simular progreso inicial con pasos visuales
    useEffect(() => {
        const steps = [
            { value: 15, delay: 300 },
            { value: 40, delay: 900 },
            { value: 60, delay: 1800 },
            { value: 75, delay: 3000 },
        ];
        const timers = steps.map(({ value, delay }) =>
            setTimeout(() => setLoadProgress(p => Math.max(p, value)), delay)
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    // Safety timeout: si en 12s el modelo no carga, ocultar overlay
    // (evita quedarse atascado si AR no esta soportado o el modelo falla)
    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 12000);
        return () => clearTimeout(timeout);
    }, []);

    // Animar entrada de controles
    useEffect(() => {
        if (modelLoaded) {
            Animated.spring(controlsAnim, {
                toValue: 1,
                tension: 60,
                friction: 9,
                useNativeDriver: true,
            }).start();
        }
    }, [modelLoaded]);

    // Auto-ocultar hint
    useEffect(() => {
        if (modelLoaded && showHelpHint) {
            const t = setTimeout(() => {
                Animated.timing(hintOpacity, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }).start(() => setShowHelpHint(false));
            }, 5000);
            return () => clearTimeout(t);
        }
    }, [modelLoaded, showHelpHint]);

    // Limpiar intervalo al desmontar
    useEffect(() => {
        return () => {
            if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current);
        };
    }, []);

    const handleModelLoad = () => {
        setLoadProgress(100);
        setTimeout(() => {
            setIsLoading(false);
            setModelLoaded(true);
            setError(null);
        }, 400);
    };

    const handleModelError = () => {
        setIsLoading(false);
        setError('No se pudo cargar el modelo 3D. Verifica la URL del archivo.');
        setModelLoaded(false);
    };

    const handleLoadProgress = (p: number) => {
        setLoadProgress(prev => Math.max(prev, p));
    };

    // Controles con haptics
    const handleReset = () => {
        if (!powerSaverMode) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        viewerRef.current?.resetPosition();
    };

    const handleIncreaseScale = () => {
        if (!powerSaverMode) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        viewerRef.current?.increaseScale();
    };

    const handleDecreaseScale = () => {
        if (!powerSaverMode) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        viewerRef.current?.decreaseScale();
    };

    const startRotateLeft = () => {
        if (!powerSaverMode) {
            Haptics.selectionAsync();
        }
        viewerRef.current?.rotateLeft();
        rotationIntervalRef.current = setInterval(() => {
            viewerRef.current?.rotateLeft();
        }, powerSaverMode ? 120 : 80);
    };

    const startRotateRight = () => {
        if (!powerSaverMode) {
            Haptics.selectionAsync();
        }
        viewerRef.current?.rotateRight();
        rotationIntervalRef.current = setInterval(() => {
            viewerRef.current?.rotateRight();
        }, powerSaverMode ? 120 : 80);
    };

    const stopRotation = () => {
        if (rotationIntervalRef.current) {
            clearInterval(rotationIntervalRef.current);
            rotationIntervalRef.current = null;
        }
    };

    const togglePowerSaverMode = () => {
        setPowerSaverMode(prev => !prev);
    };

    const controlsTranslateY = controlsAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [120, 0],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ARViewer
                modelUrl={modelUrl}
                powerSaver={powerSaverMode}
                onModelLoad={handleModelLoad}
                onModelError={handleModelError}
                onLoadProgress={handleLoadProgress}
                viewerRef={viewerRef}
            />

            {/* Pantalla de carga premium */}
            {isLoading && <LoadingOverlay progress={loadProgress} />}

            {/* Error */}
            {error && (
                <View style={styles.errorBanner}>
                    <Ionicons name="warning" size={18} color="#fff" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => setError(null)} style={styles.errorClose}>
                        <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Controles (solo cuando esta cargado) */}
            {!isLoading && !error && modelLoaded && (
                <>
                    {/* Header: nombre del lugar + badge + acciones */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <ARActiveBadge animate={!powerSaverMode} />
                            {powerSaverMode && (
                                <View style={styles.powerTag}>
                                    <Text style={styles.powerTagText}>Ahorro termico</Text>
                                </View>
                            )}
                            <Text style={styles.placeName} numberOfLines={1}>
                                {placeName}
                            </Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={[styles.headerBtn, powerSaverMode && styles.headerBtnActive]}
                                onPress={togglePowerSaverMode}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={powerSaverMode ? 'flash-off-outline' : 'flash-outline'}
                                    size={18}
                                    color={powerSaverMode ? '#FBBF24' : '#fff'}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerBtn}
                                onPress={() => setShowControls(p => !p)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={showControls ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color="#fff"
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.headerBtn, styles.closeBtn]}
                                onPress={() => navigation?.goBack?.()}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="close" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Hint de gestos */}
                    {showHelpHint && (
                        <Animated.View style={[styles.gestureHint, { opacity: hintOpacity }]}>
                            <Text style={styles.gestureHintText}>
                                Arrastra - Pellizca - Dos dedos para rotar
                            </Text>
                        </Animated.View>
                    )}

                    {/* Bottom Sheet de controles */}
                    {showControls && (
                        <Animated.View
                            style={[
                                styles.bottomSheet,
                                {
                                    opacity: controlsAnim,
                                    transform: [{ translateY: controlsTranslateY }],
                                },
                            ]}
                        >
                            {/* Handle */}
                            <View style={styles.sheetHandle} />

                            {/* Seccion: Escala */}
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Tamano</Text>
                                <View style={styles.sectionRow}>
                                    <TouchableOpacity
                                        style={styles.controlBtn}
                                        onPress={handleDecreaseScale}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="remove" size={22} color="#fff" />
                                        <Text style={styles.controlBtnText}>Reducir</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.controlBtn, styles.controlBtnPrimary]}
                                        onPress={handleReset}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="locate" size={22} color="#fff" />
                                        <Text style={styles.controlBtnText}>Centrar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.controlBtn}
                                        onPress={handleIncreaseScale}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="add" size={22} color="#fff" />
                                        <Text style={styles.controlBtnText}>Ampliar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Separador */}
                            <View style={styles.separator} />

                            {/* Seccion: Rotacion */}
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Rotacion</Text>
                                <View style={styles.sectionRow}>
                                    <TouchableOpacity
                                        style={[styles.controlBtn, styles.controlBtnWide]}
                                        onPressIn={startRotateLeft}
                                        onPressOut={stopRotation}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="reload" size={22} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
                                        <Text style={styles.controlBtnText}>Izquierda</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.controlBtn, styles.controlBtnWide]}
                                        onPressIn={startRotateRight}
                                        onPressOut={stopRotation}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="reload" size={22} color="#fff" />
                                        <Text style={styles.controlBtnText}>Derecha</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
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
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8, 8, 20, 0.96)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    loadingCard: {
        backgroundColor: 'rgba(20, 184, 166, 0.2)',
        borderRadius: 28,
        padding: 36,
        alignItems: 'center',
        width: '78%',
        borderWidth: 1,
        borderColor: 'rgba(20, 184, 166, 0.35)',
    },
    loadingIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(251, 146, 60, 0.14)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(251, 146, 60, 0.3)',
    },
    loadingIcon: {
        fontSize: 52,
        marginBottom: 18,
    },
    loadingTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    loadingLabel: {
        color: '#A7F3D0',
        fontSize: 14,
        marginBottom: 24,
        textAlign: 'center',
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#FB923C',
        borderRadius: 3,
    },
    progressPercent: {
        color: '#FDBA74',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 10,
    },
    errorBanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 16,
        right: 16,
        backgroundColor: '#c0392b',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 15,
        elevation: 6,
    },
    errorText: {
        color: '#fff',
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    errorClose: {
        padding: 4,
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 36,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 12,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'column',
        gap: 4,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 12,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBtnActive: {
        borderColor: 'rgba(251,191,36,0.55)',
        backgroundColor: 'rgba(251,191,36,0.16)',
    },
    closeBtn: {
        backgroundColor: 'rgba(180,0,0,0.5)',
        borderColor: 'rgba(255,80,80,0.3)',
    },
    powerTag: {
        backgroundColor: 'rgba(251,191,36,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.45)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    powerTagText: {
        color: '#FCD34D',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(0,220,100,0.3)',
    },
    badgeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#00dc64',
    },
    badgeText: {
        color: '#00dc64',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    placeName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        letterSpacing: 0.2,
    },
    gestureHint: {
        position: 'absolute',
        bottom: 185,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 11,
    },
    gestureHintText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontWeight: '500',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        textAlign: 'center',
        letterSpacing: 0.2,
        overflow: 'hidden',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 10, 25, 0.92)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        paddingHorizontal: 20,
        zIndex: 12,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    section: {
        marginBottom: 4,
    },
    sectionLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 2,
    },
    sectionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginVertical: 14,
    },
    controlBtn: {
        flex: 1,
        backgroundColor: 'rgba(20, 184, 166, 0.22)',
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: 'rgba(20, 184, 166, 0.35)',
    },
    controlBtnPrimary: {
        backgroundColor: '#FB923C',
        borderColor: '#FDBA74',
    },
    controlBtnWide: {
        flex: 1,
    },
    controlBtnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});

export default ARScreen;
