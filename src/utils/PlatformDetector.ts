import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Detecta si la aplicación está corriendo en un entorno que soporta módulos nativos de AR
 * 
 * @returns {boolean} true si AR está disponible (development build), false si no (Expo Go, Web)
 */
export const isARSupported = (): boolean => {
    // Web nunca soporta AR nativo
    if (Platform.OS === 'web') {
        return false;
    }

    // Detectar si estamos en Expo Go
    // En Expo Go, executionEnvironment es "storeClient"
    // En development builds, es "standalone"
    const executionEnvironment = Constants.executionEnvironment;

    if (executionEnvironment === 'storeClient') {
        // Estamos en Expo Go
        return false;
    }

    // Si llegamos aquí, estamos en un development build o producción
    return true;
};

/**
 * Obtiene un mensaje descriptivo sobre por qué AR no está disponible
 */
export const getARUnavailableReason = (): string => {
    if (Platform.OS === 'web') {
        return 'La Realidad Aumentada no está disponible en la versión web.';
    }

    const executionEnvironment = Constants.executionEnvironment;

    if (executionEnvironment === 'storeClient') {
        return 'La Realidad Aumentada requiere una compilación nativa de la aplicación.';
    }

    return 'AR no disponible en este dispositivo.';
};

/**
 * Obtiene información sobre cómo habilitar AR
 */
export const getAREnableInstructions = (): string => {
    if (Platform.OS === 'web') {
        return 'Descarga la aplicación móvil para usar funciones de Realidad Aumentada.';
    }

    const executionEnvironment = Constants.executionEnvironment;

    if (executionEnvironment === 'storeClient') {
        return 'Para usar AR, compila la app con:\nnpx expo run:android\no descarga la versión desde la tienda.';
    }

    return 'Contacta al soporte técnico.';
};

/**
 * Información del entorno actual
 */
export const getPlatformInfo = () => {
    return {
        os: Platform.OS,
        executionEnvironment: Constants.executionEnvironment,
        isARSupported: isARSupported(),
    };
};
