export const MAX_SITE_IMAGE_COUNT = 50;
export const MAX_SITE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_SITE_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_SITE_MODEL_SIZE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_SITE_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const ACCEPTED_SITE_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ACCEPTED_SITE_MODEL_TYPES = ["model/gltf-binary", "application/octet-stream"];

export const SITE_MEDIA_CATEGORIES = {
  images: { label: "Imagen", maxBytes: MAX_SITE_IMAGE_SIZE_BYTES, types: ACCEPTED_SITE_IMAGE_TYPES },
  videos: { label: "Video", maxBytes: MAX_SITE_VIDEO_SIZE_BYTES, types: ACCEPTED_SITE_VIDEO_TYPES },
  "models-3d": { label: "Modelo 3D", maxBytes: MAX_SITE_MODEL_SIZE_BYTES, types: ACCEPTED_SITE_MODEL_TYPES },
};

export const validateSiteMedia = (asset, category) => {
  const config = SITE_MEDIA_CATEGORIES[category];
  if (!config || !asset?.uri) return "missing_file";
  const fallbackMime = category === "images" ? "image/jpeg" : category === "videos" ? "video/mp4" : "application/octet-stream";
  if (!config.types.includes(asset.mimeType || fallbackMime)) return "invalid_type";
  const extension = String(asset.name || asset.fileName || asset.uri).split("?")[0].split(".").pop()?.toLowerCase();
  const acceptedExtensions = {
    images: ["jpg", "jpeg", "png"],
    videos: ["mp4", "webm", "mov"],
    "models-3d": ["glb"],
  }[category];
  if (!acceptedExtensions?.includes(extension)) return "invalid_type";
  if (asset.fileSize && asset.fileSize > config.maxBytes) return "too_large";
  return null;
};

export const validateSiteImage = (asset) => {
  return validateSiteMedia(asset, "images");
};

export const toLocalSiteMedia = (asset, category, index, now = Date.now()) => ({
  id: `${asset.assetId || asset.uri}-${now}-${index}`,
  uri: asset.uri,
  name: asset.fileName || `site-image-${index + 1}.jpg`,
  mimeType: asset.mimeType || (category === "images" ? "image/jpeg" : "application/octet-stream"),
  size: asset.fileSize || 0,
  category,
  status: "local",
});

export const toLocalSiteImage = (asset, index, now = Date.now()) =>
  toLocalSiteMedia(asset, "images", index, now);
