const DEFAULT_AR_PAGE = 'https://modelviewer.dev/editor';

const buildSceneViewerUrl = ({ modelUrl, title }) => {
  if (!modelUrl) return { intentUrl: null, httpsUrl: null };
  const params = new URLSearchParams();
  params.set('file', modelUrl);
  params.set('mode', 'ar_preferred');
  params.set('title', title || 'AR');
  const httpsUrl = `https://arvr.google.com/scene-viewer/1.0?${params.toString()}`;
  const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?${params.toString()}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end;`;
  return { intentUrl, httpsUrl };
};

const buildQuickLookUrl = ({ iosModelUrl }) => iosModelUrl || null;

export const buildArExperienceUrl = ({ modelUrl, iosModelUrl, title }) => {
  if (!modelUrl) return null;
  const base = DEFAULT_AR_PAGE;
  const params = new URLSearchParams();
  params.set('model', modelUrl);
  if (iosModelUrl) params.set('ios', iosModelUrl);
  if (title) params.set('title', title);
  params.set('ar', '1');
  return `${base}?${params.toString()}`;
};

export const buildArQrUrl = (url) =>
  url ? `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=320&margin=2` : null;

const normalizeUrls = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  if (typeof value === 'string') return [value];
  return [];
};

const isHttpUrl = (url) => typeof url === 'string' && url.startsWith('http');
const matchExt = (ext) =>
  (url) => new RegExp(`\\.(?:${ext})(?:\\?|$)`, 'i').test(url);

export const getPlaceArConfig = (place) => {
  if (!place) return null;

  const modelCandidates = normalizeUrls(place.model3dUrls);
  if (typeof place.model3dUrl === 'string') modelCandidates.push(place.model3dUrl);

  const glbModel = modelCandidates.find((url) => isHttpUrl(url) && matchExt('glb|gltf')(url));
  const usdzModel = modelCandidates.find((url) => isHttpUrl(url) && matchExt('usdz')(url));

  const rawModel = place.arModelUrl || place.modelUrl || glbModel;
  const rawIos = place.arModelIosUrl || place.iosModelUrl || usdzModel;

  const modelUrl =
    isHttpUrl(rawModel) && matchExt('glb|gltf')(rawModel) ? rawModel : null;
  const iosModelUrl =
    isHttpUrl(rawIos) && matchExt('usdz')(rawIos) ? rawIos : null;

  if (!modelUrl && !iosModelUrl) return null;

  const title = place.name;
  const arUrl = buildArExperienceUrl({ modelUrl, iosModelUrl, title });
  const sceneViewerLinks = buildSceneViewerUrl({ modelUrl, title });
  return {
    modelUrl,
    iosModelUrl,
    arUrl,
    qrUrl: buildArQrUrl(arUrl),
    sceneViewerIntent: sceneViewerLinks.intentUrl,
    sceneViewerUrl: sceneViewerLinks.httpsUrl,
    iosQuicklookUrl: buildQuickLookUrl({ iosModelUrl }),
  };
};
