/**
 * Formats distance in meters to a human-readable string
 * @param {number} meters - Distance in meters
 * @returns {string|null} Formatted distance (e.g., "1.2 km" or "350 m")
 */
export const formatDistance = (meters) => {
    if (!meters || meters < 0) return null;

    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }

    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
};
