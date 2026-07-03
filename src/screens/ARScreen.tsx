import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
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

// Badge animado de modo activo
const ARActiveBadge: React.FC<{ label?: string }> = ({ label = "AR Activo" }) => {
    return (
        <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{label}</Text>
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
                    <Ionicons name="globe-outline" size={25} color="#14B8A6" />
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

const getModelExtension = (url?: string) => {
    const cleanUrl = (url || '').split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.gltf')) return 'gltf';
    if (cleanUrl.endsWith('.obj')) return 'obj';
    return 'glb';
};

const getStableHash = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
};

const getCachedModelUri = (url: string) => {
    const cacheRoot = FileSystem.cacheDirectory;
    if (!cacheRoot) return null;
    return `${cacheRoot}ar-models/model-${getStableHash(url)}.${getModelExtension(url)}`;
};

const ARScreen: React.FC<ARScreenProps> = ({ route, navigation }) => {
    const modelUrl = route?.params?.modelUrl;
    const placeName: string = route?.params?.placeName || 'Modelo 3D';

    const [resolvedModelUrl, setResolvedModelUrl] = useState<string | undefined>(undefined);
    const [loadProgress, setLoadProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showControls, setShowControls] = useState(true);
    const [showHelpHint, setShowHelpHint] = useState(true);
    const powerSaverMode = true;

    const viewerRef = useRef<any>(null);
    const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastResetAtRef = useRef(0);
    const hintOpacity = useRef(new Animated.Value(1)).current;
    const controlsAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let cancelled = false;

        const prepareModel = async () => {
            setLoadProgress(4);
            setIsLoading(true);
            setModelLoaded(false);
            setError(null);
            setResolvedModelUrl(undefined);

            if (!modelUrl) {
                setResolvedModelUrl(undefined);
                setLoadProgress(20);
                return;
            }

            if (typeof modelUrl === 'string' && modelUrl.startsWith('file://')) {
                setResolvedModelUrl(modelUrl);
                setLoadProgress(45);
                return;
            }

            const cachedUri = getCachedModelUri(modelUrl);
            if (!cachedUri || !FileSystem.cacheDirectory) {
                setResolvedModelUrl(modelUrl);
                setLoadProgress(35);
                return;
            }

            try {
                const cacheDir = `${FileSystem.cacheDirectory}ar-models/`;
                await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

                const cachedInfo = await FileSystem.getInfoAsync(cachedUri);
                if (cachedInfo.exists && (cachedInfo.size ?? 1) > 0) {
                    if (!cancelled) {
                        setResolvedModelUrl(cachedUri);
                        setLoadProgress(55);
                    }
                    return;
                }

                const download = FileSystem.createDownloadResumable(
                    modelUrl,
                    cachedUri,
                    {},
                    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
                        if (cancelled || !totalBytesExpectedToWrite) return;
                        const ratio = totalBytesWritten / totalBytesExpectedToWrite;
                        setLoadProgress(Math.max(8, Math.min(55, 8 + ratio * 47)));
                    }
                );
                const result = await download.downloadAsync();
                if (!result?.uri || (result.status && result.status >= 400)) {
                    throw new Error(`Descarga invalida (${result?.status || 'sin estado'})`);
                }

                if (!cancelled) {
                    setResolvedModelUrl(result.uri);
                    setLoadProgress(58);
                }
            } catch (downloadError) {
                console.error('Error preparando modelo AR:', downloadError);
                if (!cancelled) {
                    setIsLoading(false);
                    setModelLoaded(false);
                    setError('No se pudo preparar el modelo 3D para realidad aumentada.');
                }
            }
        };

        prepareModel();

        return () => {
            cancelled = true;
        };
    }, [modelUrl]);

    // Simular progreso inicial con pasos visuales
    useEffect(() => {
        if (error || (!resolvedModelUrl && modelUrl)) return undefined;
        const steps = [
            { value: 65, delay: 300 },
            { value: 72, delay: 900 },
            { value: 75, delay: 3000 },
        ];
        const timers = steps.map(({ value, delay }) =>
            setTimeout(() => setLoadProgress(p => Math.max(p, value)), delay)
        );
        return () => timers.forEach(clearTimeout);
    }, [error, modelUrl, resolvedModelUrl]);

    // Safety timeout: si en 12s el modelo no carga, ocultar overlay
    // (evita quedarse atascado si AR no esta soportado o el modelo falla)
    useEffect(() => {
        if (error || (!resolvedModelUrl && modelUrl)) return undefined;
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 12000);
        return () => clearTimeout(timeout);
    }, [error, modelUrl, resolvedModelUrl]);

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
        const now = Date.now();
        if (now - lastResetAtRef.current < 900) return;
        lastResetAtRef.current = now;

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

    const controlsTranslateY = controlsAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [120, 0],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {(resolvedModelUrl || !modelUrl) && !error && (
                <ARViewer
                    modelUrl={resolvedModelUrl}
                    powerSaver={powerSaverMode}
                    onModelLoad={handleModelLoad}
                    onModelError={handleModelError}
                    onLoadProgress={handleLoadProgress}
                    viewerRef={viewerRef}
                />
            )}

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
                            <ARActiveBadge label="AR Activo" />
                            <View style={styles.powerTag}>
                                <Text style={styles.powerTagText}>Camara activa</Text>
                            </View>
                            <Text style={styles.placeName} numberOfLines={1}>
                                {placeName}
                            </Text>
                        </View>
                        <View style={styles.headerRight}>
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
                                styles.controlsDock,
                                {
                                    opacity: controlsAnim,
                                    transform: [{ translateY: controlsTranslateY }],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.dockButton}
                                onPress={handleDecreaseScale}
                                activeOpacity={0.82}
                            >
                                <Ionicons name="remove" size={20} color="#EAFDFB" />
                                <Text style={styles.dockButtonText}>Reducir</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.dockButton}
                                onPressIn={startRotateLeft}
                                onPressOut={stopRotation}
                                activeOpacity={0.82}
                            >
                                <Ionicons name="reload" size={19} color="#EAFDFB" style={{ transform: [{ scaleX: -1 }] }} />
                                <Text style={styles.dockButtonText}>Izq.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dockButton, styles.dockButtonPrimary]}
                                onPress={handleReset}
                                activeOpacity={0.86}
                            >
                                <Ionicons name="locate" size={22} color="#fff" />
                                <Text style={styles.dockButtonPrimaryText}>Centrar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.dockButton}
                                onPressIn={startRotateRight}
                                onPressOut={stopRotation}
                                activeOpacity={0.82}
                            >
                                <Ionicons name="reload" size={19} color="#EAFDFB" />
                                <Text style={styles.dockButtonText}>Der.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.dockButton}
                                onPress={handleIncreaseScale}
                                activeOpacity={0.82}
                            >
                                <Ionicons name="add" size={20} color="#EAFDFB" />
                                <Text style={styles.dockButtonText}>Ampliar</Text>
                            </TouchableOpacity>
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
        backgroundColor: 'rgba(8, 8, 20, 0.72)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingBottom: Platform.OS === 'ios' ? 90 : 72,
        zIndex: 20,
    },
    loadingCard: {
        backgroundColor: 'rgba(8, 23, 31, 0.74)',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(20, 184, 166, 0.24)',
    },
    loadingIconContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(20, 184, 166, 0.14)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(20, 184, 166, 0.28)',
    },
    loadingIcon: {
        fontSize: 52,
        marginBottom: 18,
    },
    loadingTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    loadingLabel: {
        color: '#A7F3D0',
        fontSize: 12,
        marginBottom: 14,
        textAlign: 'center',
    },
    progressTrack: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.12)',
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
        fontSize: 11,
        fontWeight: '700',
        marginTop: 7,
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
        left: 14,
        right: 14,
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
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(0,0,0,0.42)',
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
        backgroundColor: 'rgba(180,0,0,0.38)',
        borderColor: 'rgba(255,80,80,0.3)',
    },
    powerTag: {
        backgroundColor: 'rgba(251,191,36,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.45)',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
    },
    powerTagText: {
        color: '#FCD34D',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 9,
        paddingVertical: 4,
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
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    placeName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        letterSpacing: 0.2,
    },
    gestureHint: {
        position: 'absolute',
        bottom: 104,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 11,
    },
    gestureHintText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
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
    controlsDock: {
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: Platform.OS === 'ios' ? 26 : 42,
        minHeight: 72,
        borderRadius: 26,
        backgroundColor: 'rgba(6, 10, 22, 0.62)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
        paddingHorizontal: 8,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        zIndex: 12,
    },
    dockButton: {
        flex: 1,
        minHeight: 54,
        borderRadius: 18,
        backgroundColor: 'rgba(14, 116, 144, 0.24)',
        borderWidth: 1,
        borderColor: 'rgba(20, 184, 166, 0.20)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    dockButtonPrimary: {
        flex: 1.15,
        backgroundColor: 'rgba(251, 146, 60, 0.92)',
        borderColor: 'rgba(253, 186, 116, 0.76)',
    },
    dockButtonText: {
        color: '#EAFDFB',
        fontSize: 9,
        fontWeight: '700',
    },
    dockButtonPrimaryText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
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
