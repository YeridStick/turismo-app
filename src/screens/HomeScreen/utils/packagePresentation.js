import { getPackageGradient, getPackageImage } from "./helpers";

const EMPTY_ARRAY = [];

const getPackageId = (pkg) => pkg?.id ?? pkg?.title ?? "package";

const getPlaceId = (place) =>
  place?.place_id ?? place?.placeId ?? place?.id ?? place;

const findPlaceById = (placesById, placeId) => {
  if (!placesById || placeId == null) return null;
  if (typeof placesById.get === "function") {
    return placesById.get(String(placeId)) || placesById.get(placeId) || null;
  }
  return placesById[String(placeId)] || placesById[placeId] || null;
};

export const buildPlacesById = (places = EMPTY_ARRAY) => {
  const placesById = new Map();

  (places || []).forEach((place) => {
    if (place?.id == null) return;
    placesById.set(String(place.id), place);
  });

  return placesById;
};

export const getPackageRoutePlaces = (
  pkg,
  { places = EMPTY_ARRAY, placesById } = {},
) => {
  if (!pkg) return EMPTY_ARRAY;

  const lookup = placesById || buildPlacesById(places);
  const rawPackagePlaces =
    (Array.isArray(pkg.places) && pkg.places) ||
    (Array.isArray(pkg.sites) && pkg.sites) ||
    (Array.isArray(pkg.destinations) && pkg.destinations) ||
    EMPTY_ARRAY;
  const placeIds =
    (Array.isArray(pkg.placeIds) && pkg.placeIds) ||
    (Array.isArray(pkg.place_ids) && pkg.place_ids) ||
    (Array.isArray(pkg.siteIds) && pkg.siteIds) ||
    (Array.isArray(pkg.site_ids) && pkg.site_ids) ||
    EMPTY_ARRAY;

  const routePlaces = rawPackagePlaces.length
    ? rawPackagePlaces.map((place) => findPlaceById(lookup, getPlaceId(place)) || place)
    : placeIds.map((placeId) => findPlaceById(lookup, placeId) || { id: placeId });

  return routePlaces.filter(Boolean);
};

export const getRoutePlacePresentation = (place, index, packageKey = "package") => {
  const placeId = getPlaceId(place) ?? index;
  const name =
    place?.name ||
    place?.placeName ||
    place?.title ||
    `Sitio #${placeId}`;
  const resolvedMeta =
    place?.categoryName ||
    place?.category?.name ||
    place?.city ||
    place?.location ||
    place?.address;
  const imageUri =
    place?.mediaImages?.[0]?.url ||
    place?.imageUrls?.[0] ||
    place?.imageUrl ||
    place?.image ||
    null;

  return {
    id: placeId,
    key: `${packageKey}-route-${placeId}-${index}`,
    name,
    meta: resolvedMeta || "Destino",
    detailMeta: resolvedMeta || "Destino turistico",
    imageUri,
    source: place,
  };
};

export const getPackagePresentation = (
  pkg,
  {
    places = EMPTY_ARRAY,
    placesById,
    getImage = getPackageImage,
    getGradient = getPackageGradient,
  } = {},
) => {
  if (!pkg) {
    return {
      sanitizedIncludes: EMPTY_ARRAY,
      includeList: EMPTY_ARRAY,
      remainingIncludes: 0,
      cityTags: EMPTY_ARRAY,
      visibleCityTags: EMPTY_ARRAY,
      packageImage: null,
      hasImage: false,
      fallbackGradient: getGradient({}),
      routePlaces: EMPTY_ARRAY,
      visibleRoutePlaces: EMPTY_ARRAY,
      description: "",
      detailDescription:
        "Disfruta una experiencia turística completa con rutas, cultura local y momentos inolvidables.",
      vibeTags: ["Escapada", "Experiencia local"],
    };
  }

  const packageKey = getPackageId(pkg);
  const sanitizedIncludes = Array.isArray(pkg.includes)
    ? pkg.includes.filter((item) => item && String(item).trim())
    : EMPTY_ARRAY;
  const includeList = sanitizedIncludes.slice(0, 2);
  const cityTags = pkg.city
    ? String(pkg.city)
        .split("/")
        .map((city) => city.trim())
        .filter(Boolean)
    : EMPTY_ARRAY;
  const packageImage = getImage(pkg);
  const routePlaces = getPackageRoutePlaces(pkg, { places, placesById }).map(
    (place, index) => getRoutePlacePresentation(place, index, packageKey),
  );
  const description =
    pkg.description ||
    pkg.summary ||
    pkg.shortDescription ||
    pkg.subtitle ||
    "";

  return {
    sanitizedIncludes,
    includeList,
    remainingIncludes: Math.max(sanitizedIncludes.length - includeList.length, 0),
    cityTags,
    visibleCityTags: cityTags.slice(0, 2),
    packageImage,
    hasImage: Boolean(packageImage),
    fallbackGradient: getGradient(pkg),
    routePlaces,
    visibleRoutePlaces: routePlaces.slice(0, 6),
    description,
    detailDescription:
      description ||
      "Disfruta una experiencia turística completa con rutas, cultura local y momentos inolvidables.",
    vibeTags: [
      pkg.days >= 3 ? "Ruta extendida" : "Escapada",
      "Experiencia local",
    ],
  };
};
