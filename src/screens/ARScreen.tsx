import React, { useState } from 'react';
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

    // Simular carga inicial de AR
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleModelLoad = () => {
        setModelLoaded(true);
        setError(null);
    };

    const handleModelError = (err: any) => {
        const errorMsg = 'No se pudo cargar el modelo 3D.';
        setError(errorMsg);
    };

    return (
        <View style={styles.container}>
            <ARViewer
                modelUrl={modelUrl}
                onModelLoad={handleModelLoad}
                onModelError={handleModelError}
            />

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B3CF0" />
                    <Text style={styles.loadingText}>Cargando experiencia AR...</Text>
                </View>
            )}

            {!isLoading && !error && (
                <View style={styles.controlsContainer}>
                    <View style={styles.gestureHint}>
                        <Text style={styles.gestureIcon}>👆</Text>
                        <Text style={styles.gestureText}>Arrastra</Text>
                    </View>
                    <View style={styles.gestureHint}>
                        <Text style={styles.gestureIcon}>🤏</Text>
                        <Text style={styles.gestureText}>Escala</Text>
                    </View>
                    <View style={styles.gestureHint}>
                        <Text style={styles.gestureIcon}>🔄</Text>
                        <Text style={styles.gestureText}>Rota</Text>
                    </View>
                </View>
            )}

            {/* Mensaje de éxito discreto */}
            {modelLoaded && (
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>✅ Modelo activo</Text>
                </View>
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
    controlsContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(30,30,30,0.8)',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 10,
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
    statusBadge: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
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
