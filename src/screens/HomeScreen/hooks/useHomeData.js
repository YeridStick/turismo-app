import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENDPOINTS } from "../../../config/api.config";
import api, { getPackageCoverImage } from "../../../services/api";
import {
  buildRequestKey,
  createInFlightDeduper,
  extractArrayPayload,
} from "../../../utils/requestHelpers";
import { recordRequestInstrumentation } from "../../../utils/performanceInstrumentation";
import { getCachedPlaceImages } from "../../../utils/placeMediaCache";
import { distanceBetweenMeters, getCategoryLabel, isSameCoords, normalizePlace, normalizeTopPlace } from "../utils/helpers";
import useLocation from "./useLocation";

const AGENCIES_PAGE_SIZE = 3;
const PACKAGES_PAGE_SIZE = 3;
const AGENCY_SEARCH_DEBOUNCE_MS = 450;
const LOCATION_CACHE_TTL_MS = 15000;

const isValidCoords = (value) =>
  Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);

const roundCoordinate = (value) => Number(Number(value).toFixed(5));

const getTotalPages = (response) => {
  const body = response?.data ?? response;
  if (Array.isArray(body)) return 1;
  const totalPages = body?.totalPages ?? body?.total_pages ?? body?.page?.totalPages;
  const parsed = Number(totalPages);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const resolveCategoryId = (category) =>
  category !== "todos" ? Number(category) : null;

const buildNearbyParams = (coordsData, distanceKmValue, category) => {
  const categoryId = resolveCategoryId(category);

  return {
    mode: "NEARBY",
    lat: coordsData.latitude,
    lng: coordsData.longitude,
    radius: distanceKmValue * 1000,
    size: 50,
    categoryId: categoryId ?? undefined,
  };
};

const buildNearbyKeyParams = (params) => ({
  ...params,
  lat: roundCoordinate(params.lat),
  lng: roundCoordinate(params.lng),
});

const packageHasCoverUrl = (pkg) => {
  const url = pkg?.coverImageUrl || pkg?.cover_image_url || pkg?.coverImage || pkg?.cover_image;
  if (!url) return false;
  const expiresAt = pkg?.coverImageUrlExpiresAt || pkg?.cover_image_url_expires_at;
  if (!expiresAt) return true;
  const expiry = Date.parse(expiresAt);
  return !Number.isFinite(expiry) || expiry > Date.now();
};

const hydratePackageCovers = async (items) => {
  const missing = items.filter((pkg) => pkg?.id != null && !packageHasCoverUrl(pkg));
  if (!missing.length) return items;

  const refreshed = await Promise.all(
    missing.map(async (pkg) => {
      try {
        const cover = await getPackageCoverImage(pkg.id);
        return cover?.url
          ? {
              ...pkg,
              coverImageUrl: cover.url,
              coverImageUrlExpiresAt: cover.urlExpiresAt,
            }
          : pkg;
      } catch (_error) {
        return pkg;
      }
    }),
  );
  const refreshedById = new Map(refreshed.map((pkg) => [String(pkg.id), pkg]));
  return items.map((pkg) => refreshedById.get(String(pkg.id)) || pkg);
};

const useHomeData = (user) => {
  const { coords, setCoords, ensureLocation, error: locationError } = useLocation();
  
  // Data State
  const [places, setPlaces] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [popular, setPopular] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [topPlaces, setTopPlaces] = useState([]);
  const [bestRatedPlaces, setBestRatedPlaces] = useState([]);
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [nearbyContext, setNearbyContext] = useState(null);
  const [categories, setCategories] = useState([]);
  
  // Loading & Error States
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingTopPlaces, setLoadingTopPlaces] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [loadingMorePackages, setLoadingMorePackages] = useState(false);
  const [loadingMoreAgencies, setLoadingMoreAgencies] = useState(false);
  const [loadingNearbyContext, setLoadingNearbyContext] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState("");
  const [nearbyError, setNearbyError] = useState("");
  const [topPlacesError, setTopPlacesError] = useState("");
  const [bestRatedError, setBestRatedError] = useState("");
  const [packagesError, setPackagesError] = useState("");
  const [agenciesError, setAgenciesError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");

  // Pagination & Filters
  const [allPlacesPage, setAllPlacesPage] = useState(0);
  const [hasMorePlaces, setHasMorePlaces] = useState(true);
  const [packagesOffset, setPackagesOffset] = useState(0);
  const [agenciesOffset, setAgenciesOffset] = useState(0);
  const [hasMorePackages, setHasMorePackages] = useState(true);
  const [hasMoreAgencies, setHasMoreAgencies] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [distanceKm, setDistanceKm] = useState(5);
  const [query, setQuery] = useState("");
  const [agencySearchQuery, setAgencySearchQuery] = useState("");
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState(null);

  const getTopPlaceMeta = useCallback((item) => {
    if (item?._metric != null) return `${item._metric} visitas`;
    
    // Dynamic category resolution
    if (item?.categoryName) return item.categoryName;
    if (item?.category?.name) return item.category?.name;
    const catId = item?.categoryId ?? item?.category_id;
    if (catId) {
      const match = categories.find(c => String(c.id) === String(catId));
      if (match?.name) return match.name;
    }
    
    return getCategoryLabel(item) || "Top visitado";
  }, [categories]);
  
  // Cache for nearby search to avoid redundant API calls
  const nearbyCacheRef = useRef({
    radiusKm: 0,
    coords: null,
    data: [],
    categoryId: null,
  });
  const coordsCacheRef = useRef({
    coords: null,
    updatedAt: 0,
  });
  const didMountAgencySearchRef = useRef(false);
  const didMountPackageFilterRef = useRef(false);

  // Hidrata las tarjetas/carruseles con la URL prefirmada una sola vez por sitio.
  // getCachedPlaceImages deduplica solicitudes y renueva el resultado antes de 30 minutos.
  const hydrateMediaCollections = useCallback(async () => {
    const collections = [
      [places, setPlaces],
      [nearby, setNearby],
      [popular, setPopular],
      [recommended, setRecommended],
      [searchResults, setSearchResults],
      [topPlaces, setTopPlaces],
      [bestRatedPlaces, setBestRatedPlaces],
    ];
    const pendingIds = new Set();
    collections.forEach(([items]) => {
      items.forEach((item) => {
        if (item?.id != null && !item.mediaImagesLoaded) pendingIds.add(String(item.id));
      });
    });
    if (pendingIds.size === 0) return;

    const mediaEntries = await Promise.all([...pendingIds].map(async (id) => {
      try {
        return [id, await getCachedPlaceImages(id)];
      } catch (_error) {
        return [id, []];
      }
    }));
    const mediaById = new Map(mediaEntries);

    collections.forEach(([, setter]) => {
      setter((current) => current.map((item) => {
        const id = item?.id != null ? String(item.id) : null;
        if (!id || item.mediaImagesLoaded) return item;
        return {
          ...item,
          mediaImages: mediaById.get(id) || [],
          image: mediaById.get(id)?.[0]?.url || item.image,
          mediaImagesLoaded: true,
        };
      }));
    });
  }, [bestRatedPlaces, nearby, places, popular, recommended, searchResults, topPlaces]);

  useEffect(() => {
    hydrateMediaCollections();
  }, [hydrateMediaCollections]);

  const requestDeduper = useMemo(() => createInFlightDeduper(), []);

  useEffect(() => {
    if (isValidCoords(coords)) {
      coordsCacheRef.current = {
        coords,
        updatedAt: Date.now(),
      };
    }
  }, [coords]);

  const getRecentCoords = useCallback(() => {
    const cached = coordsCacheRef.current;
    if (
      isValidCoords(cached.coords) &&
      Date.now() - cached.updatedAt <= LOCATION_CACHE_TTL_MS
    ) {
      return cached.coords;
    }
    return null;
  }, []);

  const runDedupedGet = useCallback(
    (endpoint, params = {}, meta = {}) => {
      const key = buildRequestKey({
        method: "GET",
        endpoint,
        params: meta.keyParams || params,
        scope: meta.scope,
      });
      const reused = requestDeduper.has(key);
      const promise = requestDeduper.run(key, () => {
        recordRequestInstrumentation(key, {
          flow: meta.flow,
          section: meta.section,
        });
        return api.get(endpoint, { params });
      });

      return { key, reused, promise };
    },
    [requestDeduper],
  );

  const ensureRecentLocation = useCallback(async () => {
    const recentCoords = getRecentCoords();
    if (recentCoords) return recentCoords;

    const key = buildRequestKey({
      method: "GET",
      endpoint: "expo-location/current-position",
      scope: "HomeScreen",
    });

    const coordsData = await requestDeduper.run(key, async () => {
      recordRequestInstrumentation(key, {
        flow: "Home location",
        section: "location",
      });
      return ensureLocation();
    });

    if (isValidCoords(coordsData)) {
      coordsCacheRef.current = {
        coords: coordsData,
        updatedAt: Date.now(),
      };
    }

    return coordsData;
  }, [ensureLocation, getRecentCoords, requestDeduper]);

  const getNearbyRequestKey = useCallback(
    (coordsData, distanceKmValue, category) => {
      const params = buildNearbyParams(coordsData, distanceKmValue, category);
      return buildRequestKey({
        method: "GET",
        endpoint: ENDPOINTS.PLACES_SEARCH,
        params: buildNearbyKeyParams(params),
      });
    },
    [],
  );

  const getReusableNearby = useCallback((coordsData, distanceKmValue, category) => {
    const categoryId = resolveCategoryId(category);
    const targetRadiusMeters = distanceKmValue * 1000;
    const sameCoords =
      nearbyCacheRef.current.coords &&
      isSameCoords(nearbyCacheRef.current.coords, coordsData);
    const canReuseCategory = nearbyCacheRef.current.categoryId === categoryId;

    if (
      sameCoords &&
      canReuseCategory &&
      nearbyCacheRef.current.radiusKm >= distanceKmValue &&
      nearbyCacheRef.current.data.length
    ) {
      const filtered = nearbyCacheRef.current.data.filter((p) => {
        const dist =
          p.distanceMeters ??
          (p.lat && p.lng
            ? distanceBetweenMeters(coordsData, {
                latitude: p.lat,
                longitude: p.lng,
              })
            : Infinity);
        return dist <= targetRadiusMeters;
      });

      return filtered.length > 0 ? filtered : null;
    }

    return null;
  }, []);

  // Derived data: Filtered packages
  const filteredPackages = useMemo(() => {
    return packages;
  }, [packages]);

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
      const params = { mode: "ALL", size: pageSize, page: pageIndex };
      const { reused, promise } = runDedupedGet(ENDPOINTS.PLACES_SEARCH, params, {
        flow: isLoadMore ? "Home load more places" : "Home catalog",
        section: "catalog",
      });
      const response = await promise;
      
      // Manejar estructura de respuesta: { status, message, data: [...] }
      const data = extractArrayPayload(response);
      const totalPages = getTotalPages(response);

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
        if (!reused) {
          setPlaces(prev => [...prev, ...normalized]);
        }
      } else {
        setPlaces(normalized);
        setRecommended(normalized.slice(0, 10));
        if (pageIndex === 0) {
          setPopular(normalized.slice(0, 10));
        }
      }
      return normalized;
    } catch (err) {
      if (!isLoadMore) setError("No se pudo cargar el catálogo.");
      return [];
    } finally {
      if (isLoadMore) setLoadingMorePlaces(false);
      else setLoadingAll(false);
    }
  }, [runDedupedGet]);

  const loadPopular = useCallback(async () => {
    try {
      const { promise } = runDedupedGet(
        ENDPOINTS.PLACES_SEARCH,
        { mode: "ALL", size: 10 },
        {
          flow: "Home popular fallback",
          section: "popular",
        },
      );
      const response = await promise;
      const data = extractArrayPayload(response);
      const normalized = data.map(normalizePlace).slice(0, 10);
      setPopular(normalized);
      return normalized;
    } catch (err) {
      console.warn("Error loadPopular", err);
      return [];
    }
  }, [runDedupedGet]);

  const loadTopPlaces = useCallback(async () => {
    setLoadingTopPlaces(true);
    setTopPlacesError("");
    try {
      const { promise } = runDedupedGet(
        ENDPOINTS.PLACES_TOP,
        { limit: 8 },
        {
          flow: "Home top places",
          section: "topPlaces",
        },
      );
      const response = await promise;
      let data = extractArrayPayload(response);

      if (data.length === 0) {
        const { promise: fallbackPromise } = runDedupedGet(
          ENDPOINTS.PLACES_SEARCH,
          { mode: "ALL", size: 8 },
          {
            flow: "Home top places fallback",
            section: "topPlaces",
          },
        );
        const fallbackRes = await fallbackPromise;
        data = extractArrayPayload(fallbackRes);
      }
      setTopPlaces(data.map(normalizeTopPlace));
    } catch (err) {
      setTopPlacesError("No se pudo cargar el top de sitios.");
    } finally {
      setLoadingTopPlaces(false);
    }
  }, [runDedupedGet]);

  const loadBestRatedPlaces = useCallback(async () => {
    setBestRatedError("");
    try {
      const { promise } = runDedupedGet(
        ENDPOINTS.PLACES_TOP_RATED,
        { limit: 8 },
        {
          flow: "Home best rated places",
          section: "bestRatedPlaces",
        },
      );
      const response = await promise;
      const data = extractArrayPayload(response);
      const normalized = data.map((item) => {
        const nestedPlace = item?.place || item?.site || item?.placeInfo || item?.placeData;
        const place = nestedPlace ? normalizePlace(nestedPlace) : normalizePlace(item);

        return normalizePlace({
          ...place,
          ...item,
          id: place?.id ?? item?.placeId ?? item?.place_id ?? item?.siteId ?? item?.site_id ?? item?.id,
          name: item?.name || item?.placeName || place?.name || place?.placeName || place?.title,
          title: item?.title || place?.title || place?.name,
          imageUrls:
            Array.isArray(item?.imageUrls) && item.imageUrls.length
              ? item.imageUrls
              : place?.imageUrls,
          imageUrl: item?.imageUrl || place?.imageUrl,
          image: item?.image || place?.image,
          address: item?.address || item?.location || place?.address || place?.location,
          location: item?.location || place?.location || place?.address,
          categoryId: item?.categoryId ?? item?.category_id ?? place?.categoryId ?? place?.category_id,
          category_id: item?.category_id ?? item?.categoryId ?? place?.category_id ?? place?.categoryId,
          categoryName: item?.categoryName || place?.categoryName,
          category: item?.category || place?.category,
          rating: item?.rating ?? item?.avgRating ?? item?.avg_rating,
          reviews: item?.reviews ?? item?.reviewsCount ?? item?.reviews_count,
        });
      });
      setBestRatedPlaces(normalized);
    } catch (_err) {
      setBestRatedError("No se pudo cargar los mejor valorados.");
    }
  }, [runDedupedGet]);

  const loadPackages = useCallback(async (offset = 0, append = false, agency = selectedAgencyFilter) => {
    if (append) setLoadingMorePackages(true);
    else setLoadingPackages(true);
    setPackagesError("");
    try {
      const endpoint = agency?.id ? ENDPOINTS.AGENCY_PACKAGES(agency.id) : ENDPOINTS.PACKAGES;
      const params = {
        limit: PACKAGES_PAGE_SIZE,
        offset,
      };
      const { reused, promise } = runDedupedGet(endpoint, params, {
        flow: append ? "Home load more packages" : "Home packages",
        section: "packages",
        scope: agency?.id ? { agencyId: agency.id } : undefined,
      });
      const response = await promise;
      const data = await hydratePackageCovers(extractArrayPayload(response));
      if (!(append && reused)) {
        setPackages((prev) => (append ? [...prev, ...data] : data));
        setPackagesOffset(offset);
        setHasMorePackages(data.length >= PACKAGES_PAGE_SIZE);
      }
    } catch (err) {
      setPackagesError("No se pudo cargar los paquetes.");
    } finally {
      if (append) setLoadingMorePackages(false);
      else setLoadingPackages(false);
    }
  }, [runDedupedGet, selectedAgencyFilter]);

  const loadAgencies = useCallback(async (offset = 0, append = false, searchText = agencySearchQuery) => {
    const q = String(searchText || "").trim();
    if (append) setLoadingMoreAgencies(true);
    else setLoadingAgencies(true);
    setAgenciesError("");
    try {
      const endpoint = q.length >= 2 ? ENDPOINTS.AGENCIES_SEARCH : ENDPOINTS.AGENCIES;
      const params = {
        q: q.length >= 2 ? q : undefined,
        limit: AGENCIES_PAGE_SIZE,
        offset,
      };
      const { reused, promise } = runDedupedGet(endpoint, params, {
        flow: append ? "Home load more agencies" : "Home agencies",
        section: "agencies",
      });
      const response = await promise;
      const data = extractArrayPayload(response);
      if (!(append && reused)) {
        setAgencies((prev) => (append ? [...prev, ...data] : data));
        setAgenciesOffset(offset);
        setHasMoreAgencies(data.length >= AGENCIES_PAGE_SIZE);
      }
    } catch (err) {
      setAgenciesError("No se pudo cargar las agencias.");
    } finally {
      if (append) setLoadingMoreAgencies(false);
      else setLoadingAgencies(false);
    }
  }, [agencySearchQuery, runDedupedGet]);

  const loadMoreAgencies = useCallback(() => {
    if (loadingMoreAgencies || loadingAgencies || !hasMoreAgencies) return;
    loadAgencies(agenciesOffset + AGENCIES_PAGE_SIZE, true);
  }, [agenciesOffset, hasMoreAgencies, loadAgencies, loadingAgencies, loadingMoreAgencies]);

  const loadMorePackages = useCallback(() => {
    if (loadingMorePackages || loadingPackages || !hasMorePackages) return;
    loadPackages(packagesOffset + PACKAGES_PAGE_SIZE, true);
  }, [hasMorePackages, loadPackages, loadingMorePackages, loadingPackages, packagesOffset]);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setCategoriesError("");
    try {
      const { promise } = runDedupedGet(
        ENDPOINTS.CATEGORIES,
        {},
        {
          flow: "Home categories",
          section: "categories",
        },
      );
      const response = await promise;
      const data = extractArrayPayload(response);
      setCategories(data);
    } catch (err) {
      console.warn("loadCategories error", err);
      setCategoriesError("No se pudieron cargar las categorías.");
    } finally {
      setLoadingCategories(false);
    }
  }, [runDedupedGet]);

  const loadNearby = useCallback(async (forcedDistance, forcedCategory, forcedCoords) => {
    const currentDistance = forcedDistance ?? distanceKm;
    const currentCategory = forcedCategory ?? selectedCategory;
    
    setLoadingNearby(true);
    setNearbyError("");
    try {
      const coordsData = forcedCoords || await ensureRecentLocation();
      if (!coordsData) {
        setLoadingNearby(false);
        return;
      }
      
      const categoryId = resolveCategoryId(currentCategory);

      // Cache logic
      const reusableNearby = getReusableNearby(
        coordsData,
        currentDistance,
        currentCategory,
      );
      if (reusableNearby) {
        setNearby(reusableNearby);
        setLoadingNearby(false);
        return reusableNearby;
      }

      const params = buildNearbyParams(coordsData, currentDistance, currentCategory);
      const { promise } = runDedupedGet(
        ENDPOINTS.PLACES_SEARCH,
        params,
        {
          flow: "Home nearby",
          keyParams: buildNearbyKeyParams(params),
          section: "nearby",
        },
      );
      const response = await promise;
      const data = extractArrayPayload(response);
      const normalized = data.map(normalizePlace);
      
      setNearby(normalized);
      nearbyCacheRef.current = {
        radiusKm: currentDistance,
        coords: coordsData,
        data: normalized,
        categoryId,
      };
      return normalized;
    } catch (err) {
      console.warn("loadNearby error", err);
      setNearbyError("No se pudieron cargar los sitios cercanos.");
      return [];
    } finally {
      setLoadingNearby(false);
    }
  }, [
    distanceKm,
    ensureRecentLocation,
    getReusableNearby,
    runDedupedGet,
    selectedCategory,
  ]);

  const loadNearbyContext = useCallback(async () => {
    if (!user) {
      setNearbyContext(null);
      return;
    }
    setLoadingNearbyContext(true);
    try {
      const coordsData = await ensureRecentLocation();
      if (!coordsData) return;
      const params = {
        lat: coordsData.latitude,
        lng: coordsData.longitude,
        radius: 150,
        limit: 5,
      };
      const { promise } = runDedupedGet(
        ENDPOINTS.PLACES_NEARBY_CONTEXT,
        params,
        {
          flow: "Home nearby context",
          keyParams: {
            ...params,
            lat: roundCoordinate(params.lat),
            lng: roundCoordinate(params.lng),
          },
          scope: { userEmail: user?.email },
          section: "nearbyContext",
        },
      );
      const response = await promise;
      const data = extractArrayPayload(response);
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
  }, [ensureRecentLocation, runDedupedGet, user]);

  const performSearch = useCallback(async (searchQuery, overrideDistance, overrideCategory) => {
    const finalQuery = searchQuery ?? query;
    const finalDistance = overrideDistance ?? distanceKm;
    const finalCategory = overrideCategory ?? selectedCategory;
    
    setLoadingAll(true);
    setError("");
    try {
      let coordsData = coords;
      if (!isValidCoords(coordsData) && finalDistance > 0) {
        coordsData = await ensureRecentLocation();
      }

      const params = {
        q: finalQuery.trim() || undefined,
        categoryId: finalCategory !== "todos" ? finalCategory : undefined,
        lat: coordsData?.latitude,
        lng: coordsData?.longitude,
        radiusMeters: coordsData ? finalDistance * 1000 : undefined,
      };
      const { promise } = runDedupedGet(ENDPOINTS.PLACES_SEARCH, params, {
        flow: "Home search",
        keyParams: isValidCoords(coordsData)
          ? {
              ...params,
              lat: roundCoordinate(coordsData.latitude),
              lng: roundCoordinate(coordsData.longitude),
            }
          : params,
        section: "search",
      });
      const response = await promise;
      const data = extractArrayPayload(response);
      setSearchResults(data.map(normalizePlace));

      if (isValidCoords(coordsData)) {
        const reusableNearby = getReusableNearby(
          coordsData,
          finalDistance,
          finalCategory,
        );
        if (reusableNearby) {
          setNearby(reusableNearby);
          return;
        }

        const nearbyKey = getNearbyRequestKey(
          coordsData,
          finalDistance,
          finalCategory,
        );
        if (!requestDeduper.has(nearbyKey)) {
          loadNearby(finalDistance, finalCategory, coordsData);
        }
      }
    } catch (err) {
      setError("No se pudo realizar la búsqueda.");
    } finally {
      setLoadingAll(false);
    }
  }, [
    coords,
    distanceKm,
    ensureRecentLocation,
    getNearbyRequestKey,
    getReusableNearby,
    loadNearby,
    query,
    requestDeduper,
    runDedupedGet,
    selectedCategory,
  ]);

  const handleRefresh = useCallback(async () => {
    const catalogTask = loadAll().then(async (loadedPlaces) => {
      if (loadedPlaces.length > 0) return loadedPlaces;
      return loadPopular();
    });

    await Promise.allSettled([
      catalogTask,
      loadPackages(),
      loadAgencies(),
      loadTopPlaces(),
      loadBestRatedPlaces(),
      loadNearby(),
      loadNearbyContext(),
      loadCategories(),
    ]);
  }, [
    loadAgencies,
    loadAll,
    loadBestRatedPlaces,
    loadCategories,
    loadNearby,
    loadNearbyContext,
    loadPackages,
    loadPopular,
    loadTopPlaces,
  ]);

  useEffect(() => {
    if (!didMountAgencySearchRef.current) {
      didMountAgencySearchRef.current = true;
      return undefined;
    }

    const timer = setTimeout(() => {
      loadAgencies(0, false, agencySearchQuery);
    }, AGENCY_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [agencySearchQuery, loadAgencies]);

  useEffect(() => {
    if (!didMountPackageFilterRef.current) {
      didMountPackageFilterRef.current = true;
      return;
    }

    loadPackages(0, false, selectedAgencyFilter);
  }, [selectedAgencyFilter, loadPackages]);

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
    bestRatedPlaces,
    packages: filteredPackages, // Retornamos la lista ya filtrada dinámicamente
    agencies,
    nearbyContext,
    categories,
    
    // UI State
    loadingAll,
    loadingMorePlaces,
    loadingNearby,
    loadingTopPlaces,
    loadingPackages,
    loadingAgencies,
    loadingMorePackages,
    loadingMoreAgencies,
    loadingNearbyContext,
    loadingCategories,
    error,
    nearbyError,
    topPlacesError,
    bestRatedError,
    packagesError,
    agenciesError,
    categoriesError,
    locationError,
    
    // Pagination & Filters
    allPlacesPage,
    setAllPlacesPage,
    hasMorePlaces,
    hasMorePackages,
    hasMoreAgencies,
    selectedCategory,
    setSelectedCategory,
    distanceKm,
    setDistanceKm,
    query,
    setQuery,
    agencySearchQuery,
    setAgencySearchQuery,
    coords,
    setCoords,
    selectedAgencyFilter,
    setSelectedAgencyFilter,
    
    // Actions
    loadAll,
    loadPackages,
    loadAgencies,
    loadCategories,
    loadNearby,
    loadNearbyContext,
    loadMoreAgencies,
    loadMorePackages,
    performSearch,
    handleRefresh,
    ensureLocation,
    getTopPlaceMeta,
    clearAgencyFilter,
  };
};

export default useHomeData;
