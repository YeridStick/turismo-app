import { useState, useCallback } from "react";
import * as Location from "expo-location";
import { FALLBACK_CENTER } from "../utils/constants";
import { isSameCoords } from "../utils/helpers";

const useLocation = () => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState("");

  const ensureLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permiso de ubicación denegado.");
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const newCoords = loc.coords;
      
      setCoords(prev => {
        if (!isSameCoords(prev, newCoords)) return newCoords;
        return prev;
      });
      return newCoords;
    } catch (err) {
      setError("Error al obtener la ubicación.");
      return null;
    }
  }, []);

  const getLocation = useCallback(async () => {
    const loc = await ensureLocation();
    return loc || FALLBACK_CENTER;
  }, [ensureLocation]);

  return {
    coords,
    setCoords,
    error,
    setError,
    ensureLocation,
    getLocation,
  };
};

export default useLocation;
