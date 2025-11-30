import { ENDPOINTS } from '../config/api.config';
import api from './api';

// Variable local al módulo para mantener el caché en memoria
// Se limpiará automáticamente cuando la app se cierre completamente (kill)
let memoryCache = {
    places: null,
    lastFetch: 0
};

const DataCacheService = {
    /**
     * Obtiene los lugares, usando caché si está disponible
     * @param {boolean} forceRefresh - Si es true, ignora el caché y busca del servidor
     * @returns {Promise<Array>} - Lista de lugares
     */
    getPlaces: async (forceRefresh = false) => {
        // Si tenemos datos en caché y no se fuerza la recarga, retornamos caché
        if (!forceRefresh && memoryCache.places) {
            console.log('📦 Usando datos de caché en memoria');
            return memoryCache.places;
        }

        console.log('🌐 Descargando datos del backend...');
        try {
            const response = await api.get(ENDPOINTS.PLACES_ALL);
            const data = Array.isArray(response.data) ? response.data : response.data?.data || [];

            // Guardamos en caché
            memoryCache.places = data;
            memoryCache.lastFetch = Date.now();

            return data;
        } catch (error) {
            console.error('Error fetching places:', error);
            throw error;
        }
    },

    /**
     * Limpia el caché manualmente si es necesario
     */
    clearCache: () => {
        memoryCache = {
            places: null,
            lastFetch: 0
        };
    }
};

export default DataCacheService;
