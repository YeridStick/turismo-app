import { Asset } from 'expo-asset';

const DEFAULT_REMOTE_GLTF = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const DEFAULT_REMOTE_USDZ = 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz';
const DEFAULT_AR_PAGE = 'https://modelviewer.dev/editor';

let DEFAULT_AR_MODEL = DEFAULT_REMOTE_GLTF;
let DEFAULT_AR_MODEL_IOS = DEFAULT_REMOTE_USDZ;

// Intenta usar archivos locales empaquetados; si no existen, usa los remotos
try {
  const asset = Asset.fromModule(require('../../public/model.glb'));
  if (asset?.uri) DEFAULT_AR_MODEL = asset.uri;
} catch (err) {
  // se mantiene el remoto
}

try {
  const assetIos = Asset.fromModule(require('../../public/model.usdz'));
  if (assetIos?.uri) DEFAULT_AR_MODEL_IOS = assetIos.uri;
} catch (err) {
  // se mantiene el remoto
}

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
  const rawModel = place.arModelUrl || place.modelUrl || place.model3dUrl;
  const rawIos = place.arModelIosUrl || place.iosModelUrl;
  const modelUrl = typeof rawModel === 'string' && rawModel.startsWith('http') ? rawModel : DEFAULT_AR_MODEL;
  const iosModelUrl = typeof rawIos === 'string' && rawIos.startsWith('http') ? rawIos : DEFAULT_AR_MODEL_IOS;
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
