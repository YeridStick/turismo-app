import { listPlaceMedia } from "../services/api";

// Las URLs duran 30 minutos; renovamos antes para no entregar enlaces vencidos.
export const PLACE_MEDIA_CACHE_TTL_MS = 25 * 60 * 1000;

const cache = new Map();

export const getCachedPlaceMedia = async (siteId, { force = false } = {}) => {
  if (!siteId) return [];
  const key = String(siteId);
  const current = cache.get(key);
  const fresh = current && Date.now() - current.fetchedAt < PLACE_MEDIA_CACHE_TTL_MS;

  if (!force && fresh) return current.data;
  if (!force && current?.promise) return current.promise;

  const promise = listPlaceMedia(siteId)
    .then((response) => {
      const data = response.data?.data;
      const media = Array.isArray(data) ? data : [];
      cache.set(key, { data: media, fetchedAt: Date.now() });
      return media;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, { ...(current || {}), promise });
  return promise;
};

export const getCachedPlaceImages = async (siteId, options) => {
  const media = await getCachedPlaceMedia(siteId, options);
  return media.filter((item) => item?.category === "images" && item?.url);
};

export const invalidatePlaceMediaCache = (siteId) => {
  if (siteId) cache.delete(String(siteId));
};

export const clearPlaceMediaCache = () => cache.clear();
