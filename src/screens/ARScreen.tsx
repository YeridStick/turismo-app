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

    // Simular carga del modelo (en producción, esto vendría del componente AR)
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* Componente AR usando ViroReact (funciona en iOS y Android) */}
            <ARViewer
                modelUrl={modelUrl}
                onModelPlaced={() => {
                    console.log('Modelo 3D colocado en la escena AR');
                }}
            />

            {/* Indicador de carga */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B3CF0" />
                    <Text style={styles.loadingText}>Inicializando AR...</Text>
                    <Text style={styles.instructionText}>
                        Apunta la cámara a una superficie plana
                    </Text>
                </View>
            )}

            {/* Instrucciones */}
            {!isLoading && (
                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionText}>
                        📱 Mueve el dispositivo lentamente
                    </Text>
                    <Text style={styles.instructionText}>
                        👆 Toca un plano para colocar el modelo
                    </Text>
                </View>
            )}

            {/* Botón de cerrar */}
            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation?.goBack?.()}
            >
                <Text style={styles.closeText}>✕ Cerrar</Text>
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1,
    },
    loadingText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    instructionsContainer: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        padding: 16,
        zIndex: 1,
    },
    instructionText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
        marginVertical: 4,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 20,
        zIndex: 2,
    },
    closeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default ARScreen;
