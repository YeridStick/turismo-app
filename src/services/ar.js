const DEFAULT_AR_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const DEFAULT_AR_MODEL_IOS = 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz';
const DEFAULT_AR_PAGE = 'https://modelviewer.dev/editor';

const buildSceneViewerUrl = ({ modelUrl, title }) => {
  if (!modelUrl) return null;
  const params = new URLSearchParams();
  params.set('file', modelUrl);
  params.set('mode', 'ar_preferred');
  params.set('title', title || 'AR');
  return `https://arvr.google.com/scene-viewer/1.0?${params.toString()}`;
};

const buildQuickLookUrl = ({ iosModelUrl }) => iosModelUrl || null;

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
  const iosModelUrl = place.arModelIosUrl || place.iosModelUrl || DEFAULT_AR_MODEL_IOS;
  const title = place.name;
  const arUrl = buildArExperienceUrl({ modelUrl, iosModelUrl, title });
  return {
    arUrl,
    qrUrl: buildArQrUrl(arUrl),
    sceneViewerUrl: buildSceneViewerUrl({ modelUrl, title }),
    iosQuicklookUrl: buildQuickLookUrl({ iosModelUrl }),
  };
};
