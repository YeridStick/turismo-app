import { CATEGORIES_LIST } from "./constants";

export const getModelType = (url) => {
  if (typeof url !== "string") return null;
  const cleanUrl = url.trim().split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".usdz")) return "usdz";
  if (cleanUrl.endsWith(".glb")) return "glb";
  if (cleanUrl.endsWith(".gltf")) return "gltf";
  return null;
};

export const parseUrlList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getPlaceImage = (place) => {
  if (!place) return null;
  const nestedPlace = place.place || place.site || place.placeInfo || place.placeData;
  const imageUrls = Array.isArray(place.imageUrls)
    ? place.imageUrls
    : parseUrlList(place.imageUrls || place.image_urls);
  const nestedImageUrls = Array.isArray(nestedPlace?.imageUrls)
    ? nestedPlace.imageUrls
    : parseUrlList(nestedPlace?.imageUrls || nestedPlace?.image_urls);

  return (
    imageUrls[0] ||
    place.imageUrl ||
    place.image_url ||
    place.image ||
    nestedImageUrls[0] ||
    nestedPlace?.imageUrl ||
    nestedPlace?.image_url ||
    nestedPlace?.image ||
    null
  );
};

export const fetchModelSize = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url, { method: "HEAD" });
    const length = response.headers.get("content-length");
    const size = length ? Number(length) : null;
    return Number.isFinite(size) ? size : null;
  } catch (err) {
    return null;
  }
};

export const normalizePlace = (place) => {
  if (!place || typeof place !== "object") return place;
  const normalized = { ...place };
  
  if (normalized.model_3d_urls && !normalized.model3dUrls) {
    normalized.model3dUrls = parseUrlList(normalized.model_3d_urls);
  }
  if (normalized.model3dUrls && !Array.isArray(normalized.model3dUrls)) {
    normalized.model3dUrls = parseUrlList(normalized.model3dUrls);
  }
  
  if (normalized.image_urls && !normalized.imageUrls) {
    normalized.imageUrls = parseUrlList(normalized.image_urls);
  }
  if (normalized.imageUrls && !Array.isArray(normalized.imageUrls)) {
    normalized.imageUrls = parseUrlList(normalized.imageUrls);
  }
  
  if (normalized.owner_user_id && !normalized.ownerUserId) {
    normalized.ownerUserId = normalized.owner_user_id;
  }
  if (normalized.category_id && !normalized.categoryId) {
    normalized.categoryId = normalized.category_id;
  }
  if (normalized.is_verified != null && normalized.isVerified == null) {
    normalized.isVerified = normalized.is_verified;
  }
  if (normalized.is_active != null && normalized.isActive == null) {
    normalized.isActive = normalized.is_active;
  }
  if (normalized.created_at && !normalized.createdAt) {
    normalized.createdAt = normalized.created_at;
  }
  
  // Ensure image property for PlaceCard
  if (!normalized.image) {
    normalized.image = getPlaceImage(normalized);
  }

  // Ensure lat/lng for Map pins
  if (normalized.latitude != null && normalized.lat == null) {
    normalized.lat = normalized.latitude;
  }
  if (normalized.longitude != null && normalized.lng == null) {
    normalized.lng = normalized.longitude;
  }

  return normalized;
};

export const isSameCoords = (a, b, tolerance = 0.000001) => {
  if (!a || !b) return false;
  return (
    Math.abs(a.latitude - b.latitude) < tolerance &&
    Math.abs(a.longitude - b.longitude) < tolerance
  );
};

export const distanceBetweenMeters = (from, to) => {
  if (!from || !to) return Infinity;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
};

export const getCategoryLabel = (place) => {
  if (!place) return null;
  if (place.categoryName) return place.categoryName;
  if (place.category?.name) return place.category?.name;
  const categoryId = place.categoryId ?? place.category_id;
  const match = CATEGORIES_LIST.find(
    (item) => String(item.id) === String(categoryId),
  );
  return match?.name || null;
};

export const normalizeTopPlace = (item) => {
  if (!item || typeof item !== "object") return item;
  if (item.place) {
    const place = normalizePlace(item.place);
    return {
      ...place,
      _metric:
        item.visits ??
        item.total ??
        item.count ??
        item.hits ??
        item.totalVisits ??
        null,
    };
  }
  const normalized = normalizePlace(item);
  return {
    ...normalized,
    name: normalized.name || normalized.placeName || normalized.title,
    _metric:
      normalized.visits ??
      normalized.total ??
      normalized.count ??
      normalized.hits ??
      null,
  };
};

export const formatPrice = (value) => {
  if (!value) return "$0";
  try {
    return `$${Number(value).toLocaleString("es-CO")}`;
  } catch {
    return `$${value}`;
  }
};

export const getPackageImage = (pkg) => {
  if (!pkg) return null;
  if (pkg.imageUrl) return pkg.imageUrl;
  if (pkg.image_url) return pkg.image_url;
  if (Array.isArray(pkg.imageUrls) && pkg.imageUrls.length) return pkg.imageUrls[0];
  if (Array.isArray(pkg.image_urls) && pkg.image_urls.length) return pkg.image_urls[0];
  return null;
};

export const getPackageGradient = (pkg) => {
  const gradients = [
    ["#0B1324", "#0EA5A4"],
    ["#0C4A58", "#14B8A6"],
    ["#7C2D12", "#FB923C"],
    ["#0F172A", "#38BDF8"],
  ];
  const idNum = pkg.id ? (typeof pkg.id === 'number' ? pkg.id : String(pkg.id).length) : 0;
  return gradients[idNum % gradients.length];
};

export const formatDistance = (meters) => {
  if (!meters && meters !== 0) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};
