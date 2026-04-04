import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import api from "../../../services/api";
import { ENDPOINTS } from "../../../config/api.config";
import { normalizePlace, normalizeTopPlace, isSameCoords, distanceBetweenMeters, getCategoryLabel } from "../utils/helpers";
import { MAX_DISTANCE_KM } from "../utils/constants";
import useLocation from "./useLocation";

const useHomeData = (user) => {
  const { coords, setCoords, ensureLocation, error: locationError } = useLocation();
  
  // Data State
  const [places, setPlaces] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [popular, setPopular] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [topPlaces, setTopPlaces] = useState([]);
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [nearbyContext, setNearbyContext] = useState(null);
  
  // Loading & Error States
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingTopPlaces, setLoadingTopPlaces] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [loadingNearbyContext, setLoadingNearbyContext] = useState(false);
  const [error, setError] = useState("");
  const [topPlacesError, setTopPlacesError] = useState("");
  const [packagesError, setPackagesError] = useState("");
  const [agenciesError, setAgenciesError] = useState("");

  // Pagination & Filters
  const [allPlacesPage, setAllPlacesPage] = useState(0);
  const [hasMorePlaces, setHasMorePlaces] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [distanceKm, setDistanceKm] = useState(5);
  const [query, setQuery] = useState("");
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState(null);

  const getTopPlaceMeta = useCallback((item) => {
    if (item?._metric != null) return `${item._metric} visitas`;
    return getCategoryLabel(item) || "Top visitado";
  }, []);
  
  // Cache for nearby search to avoid redundant API calls
  const nearbyCacheRef = useRef({
    radiusKm: 0,
    coords: null,
    data: [],
    categoryId: null,
  });

  // Derived data: Filtered packages
  const filteredPackages = useMemo(() => {
    if (!selectedAgencyFilter) return packages;
    return packages.filter(pkg => 
      pkg.agencyId === selectedAgencyFilter.id || 
      String(pkg.agencyName).toLowerCase() === String(selectedAgencyFilter.name).toLowerCase()
    );
  }, [packages, selectedAgencyFilter]);

  const clearAgencyFilter = useCallback(() => setSelectedAgencyFilter(null), []);

  const loadAll = useCallback(async (pageIndex = 0, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMorePlaces(true);
    } else {
      setLoadingAll(true);
      setAllPlacesPage(0);
    }
    setError("");
    try {
      const pageSize = 10;
      const response = await api.get(ENDPOINTS.PLACES_SEARCH, { 
        params: { mode: 'ALL', size: pageSize, page: pageIndex } 
      });
      
      // Manejar estructura de respuesta: { status, message, data: [...] }
      const body = response.data;
      let data = [];
      let totalPages = 0;

      if (body?.data && Array.isArray(body.data)) {
        data = body.data;
        totalPages = body.totalPages || body.total_pages || 0;
      } else if (body?.content && Array.isArray(body.content)) {
        data = body.content;
        totalPages = body.totalPages || 0;
      } else if (Array.isArray(body)) {
        data = body;
        totalPages = 1;
      } else {
        data = []; // Fallback total para evitar crashes
      }

      const normalized = data.map(normalizePlace);

      // Lógica de paginación:
      // 1. Si el backend nos dice explícitamente cuántas páginas hay
      if (totalPages > 0) {
        setHasMorePlaces(pageIndex < totalPages - 1);
      } 
      // 2. Si no hay metadatos pero es la pág 0 y trajo algo, permitimos intentar pág 1 para "descubrir"
      else if (pageIndex === 0 && data.length > 0) {
        setHasMorePlaces(true); 
      }
      // 3. Fallback estándar: si trajo la página completa, asumimos que hay más
      else {
        setHasMorePlaces(data.length >= pageSize);
      }

      if (isLoadMore) {
        setPlaces(prev => [...prev, ...normalized]);
      } else {
        setPlaces(normalized);
        setRecommended(normalized.slice(0, 10));
      }
      return normalized;
    } catch (err) {
      if (!isLoadMore) setError("No se pudo cargar el catálogo.");
      return [];
    } finally {
      if (isLoadMore) setLoadingMorePlaces(false);
      else setLoadingAll(false);
    }
  }, []);

  const loadPopular = useCallback(async () => {
    try {
      const response = await api.get(ENDPOINTS.PLACES_SEARCH, { params: { mode: 'ALL', size: 10 } });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setPopular(data.map(normalizePlace).slice(0, 10));
    } catch (err) {
      console.warn("Error loadPopular", err);
    }
  }, []);

  const loadTopPlaces = useCallback(async () => {
    setLoadingTopPlaces(true);
    setTopPlacesError("");
    try {
      const response = await api.get(ENDPOINTS.PLACES_TOP, { params: { limit: 8 } });
      let data = Array.isArray(response.data) ? response.data : response.data?.data || [];

      if (data.length === 0) {
        const fallbackRes = await api.get(ENDPOINTS.PLACES_SEARCH, { params: { mode: 'ALL', size: 8 } });
        data = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data?.data || [];
      }
      setTopPlaces(data.map(normalizeTopPlace));
    } catch (err) {
      setTopPlacesError("No se pudo cargar el top de sitios.");
    } finally {
      setLoadingTopPlaces(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    setLoadingPackages(true);
    setPackagesError("");
    try {
      const response = await api.get(ENDPOINTS.PACKAGES);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setPackages(data);
    } catch (err) {
      setPackagesError("No se pudo cargar los paquetes.");
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  const loadAgencies = useCallback(async () => {
    setLoadingAgencies(true);
    setAgenciesError("");
    try {
      const response = await api.get(ENDPOINTS.AGENCIES);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAgencies(data);
    } catch (err) {
      setAgenciesError("No se pudo cargar las agencias.");
    } finally {
      setLoadingAgencies(false);
    }
  }, []);

  const loadNearby = useCallback(async (forcedDistance, forcedCategory) => {
    const currentDistance = forcedDistance ?? distanceKm;
    const currentCategory = forcedCategory ?? selectedCategory;
    
    setLoadingNearby(true);
    try {
      const coordsData = await ensureLocation();
      if (!coordsData) {
        setLoadingNearby(false);
        return;
      }
      
      const categoryId = currentCategory !== "todos" ? Number(currentCategory) : null;
      const targetRadiusMeters = currentDistance * 1000;

      // Cache logic
      const sameCoords = nearbyCacheRef.current.coords && isSameCoords(nearbyCacheRef.current.coords, coordsData);
      const canReuseCategory = nearbyCacheRef.current.categoryId === categoryId;

      if (sameCoords && canReuseCategory && nearbyCacheRef.current.radiusKm >= currentDistance && nearbyCacheRef.current.data.length) {
        const filtered = nearbyCacheRef.current.data.filter((p) => {
          const dist = p.distanceMeters ?? (p.lat && p.lng ? distanceBetweenMeters(coordsData, { latitude: p.lat, longitude: p.lng }) : Infinity);
          return dist <= targetRadiusMeters;
        });

        if (filtered.length > 0) {
          setNearby(filtered);
          setLoadingNearby(false);
          return;
        }
      }

      const params = {
        mode: 'NEARBY',
        lat: coordsData.latitude,
        lng: coordsData.longitude,
        radius: targetRadiusMeters,
        size: 50,
        categoryId: categoryId ?? undefined,
      };
      const response = await api.get(ENDPOINTS.PLACES_SEARCH, { params });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      const normalized = data.map(normalizePlace);
      
      setNearby(normalized);
      nearbyCacheRef.current = {
        radiusKm: currentDistance,
        coords: coordsData,
        data: normalized,
        categoryId,
      };
    } catch (err) {
      console.warn("loadNearby error", err);
    } finally {
      setLoadingNearby(false);
    }
  }, [distanceKm, selectedCategory, ensureLocation]);

  const loadNearbyContext = useCallback(async () => {
    if (!user) {
      setNearbyContext(null);
      return;
    }
    setLoadingNearbyContext(true);
    try {
      const coordsData = await ensureLocation();
      if (!coordsData) return;
      
      const response = await api.get(ENDPOINTS.PLACES_NEARBY_CONTEXT, {
        params: {
          lat: coordsData.latitude,
          lng: coordsData.longitude,
          radius: 150,
          limit: 5,
        },
      });
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      const first = data[0] || null;
      if (first?.place) {
        setNearbyContext({
          ...normalizePlace(first.place),
          distanceM: first.distanceM,
        });
      } else {
        setNearbyContext(null);
      }
    } catch (err) {
      console.warn("loadNearbyContext error", err);
    } finally {
      setLoadingNearbyContext(false);
    }
  }, [user, ensureLocation]);

  const performSearch = useCallback(async (searchQuery, overrideDistance, overrideCategory) => {
    const finalQuery = searchQuery ?? query;
    const finalDistance = overrideDistance ?? distanceKm;
    const finalCategory = overrideCategory ?? selectedCategory;
    
    setLoadingAll(true);
    setError("");
    try {
      let coordsData = coords;
      if (!coordsData && finalDistance > 0) {
        coordsData = await ensureLocation();
      }
      
      const response = await api.get(ENDPOINTS.PLACES_SEARCH, {
        params: {
          q: finalQuery.trim() || undefined,
          categoryId: finalCategory !== "todos" ? finalCategory : undefined,
          lat: coordsData?.latitude,
          lng: coordsData?.longitude,
          radiusMeters: coordsData ? finalDistance * 1000 : undefined,
        },
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setSearchResults(data.map(normalizePlace));
      
      if (coordsData) {
        loadNearby(finalDistance, finalCategory);
      }
    } catch (err) {
      setError("No se pudo realizar la búsqueda.");
    } finally {
      setLoadingAll(false);
    }
  }, [query, distanceKm, selectedCategory, coords, ensureLocation, loadNearby]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadAll(),
      loadPopular(),
      loadPackages(),
      loadAgencies(),
      loadTopPlaces(),
      loadNearby(),
      loadNearbyContext(),
    ]);
  }, [loadAll, loadPopular, loadPackages, loadAgencies, loadTopPlaces, loadNearby, loadNearbyContext]);

  // Initial load
  useEffect(() => {
    handleRefresh();
  }, [user]); // Re-load when user changes

  return {
    // Data
    places,
    nearby,
    popular,
    recommended,
    searchResults,
    topPlaces,
    packages: filteredPackages, // Retornamos la lista ya filtrada dinámicamente
    agencies,
    nearbyContext,
    
    // UI State
    loadingAll,
    loadingMorePlaces,
    loadingNearby,
    loadingTopPlaces,
    loadingPackages,
    loadingAgencies,
    loadingNearbyContext,
    error,
    topPlacesError,
    packagesError,
    agenciesError,
    locationError,
    
    // Pagination & Filters
    allPlacesPage,
    setAllPlacesPage,
    hasMorePlaces,
    selectedCategory,
    setSelectedCategory,
    distanceKm,
    setDistanceKm,
    query,
    setQuery,
    coords,
    setCoords,
    selectedAgencyFilter,
    setSelectedAgencyFilter,
    
    // Actions
    loadAll,
    loadNearby,
    loadNearbyContext,
    performSearch,
    handleRefresh,
    ensureLocation,
    getTopPlaceMeta,
    clearAgencyFilter,
  };
};

export default useHomeData;
