const DEFAULT_AR_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const DEFAULT_AR_PAGE = 'https://modelviewer.dev/editor';

export const buildArExperienceUrl = ({ modelUrl, iosModelUrl, title }) => {
  const base = DEFAULT_AR_PAGE;
  const params = new URLSearchParams();
  params.set('model', modelUrl || DEFAULT_AR_MODEL);
  if (iosModelUrl) params.set('ios', iosModelUrl);
  if (title) params.set('title', title);
  params.set('ar', '1');
  return `${base}?${params.toString()}`;
};

export const buildArQrUrl = (url) =>
  `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=320&margin=2`;

export const getPlaceArConfig = (place) => {
  if (!place) return null;
  const modelUrl = place.arModelUrl || place.modelUrl || place.model3dUrl || DEFAULT_AR_MODEL;
  const iosModelUrl = place.arModelIosUrl || place.iosModelUrl || null;
  const title = place.name;
  const arUrl = buildArExperienceUrl({ modelUrl, iosModelUrl, title });
  return {
    arUrl,
    qrUrl: buildArQrUrl(arUrl),
  };
};
