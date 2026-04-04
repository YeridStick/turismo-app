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

/**
 * Convierte enlaces de Google Drive a enlaces de descarga directa
 */
const getDirectModelUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  // Google Drive file link: https://drive.google.com/file/d/FILE_ID/view...
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  
  // Google Drive sharing link: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (url.includes('drive.google.com') && openMatch && openMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
  }

  return url;
};

export const getPlaceArConfig = (place) => {
  if (!place) return null;

  let modelCandidates = normalizeUrls(place.model3dUrls).map(getDirectModelUrl);
  if (typeof place.model3dUrl === 'string') {
    modelCandidates.push(getDirectModelUrl(place.model3dUrl));
  }
  
  // Limpiar candidatos nulos o vacíos
  modelCandidates = modelCandidates.filter(u => u && u.length > 5);

  const glbModel = modelCandidates.find((url) => isHttpUrl(url) && matchExt('glb|gltf')(url));
  const usdzModel = modelCandidates.find((url) => isHttpUrl(url) && matchExt('usdz')(url));

  // Si no hay modelos específicos por extensión, pero tenemos candidatos, 
  // asumimos que el primero es el modelo principal (Android/Generic)
  const rawModel = place.arModelUrl || place.modelUrl || glbModel || modelCandidates[0];
  const rawIos = place.arModelIosUrl || place.iosModelUrl || usdzModel;

  // Permitimos el modelo si es una URL HTTP válida, relajando la extensión si es Google Drive
  const isDrive = (u) => typeof u === 'string' && u.includes('drive.google.com');

  const modelUrl = 
    isHttpUrl(rawModel) && (matchExt('glb|gltf')(rawModel) || isDrive(rawModel)) 
      ? rawModel 
      : null;

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
