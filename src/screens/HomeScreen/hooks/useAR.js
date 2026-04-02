import { useState, useCallback } from "react";
import { Platform, Linking } from "react-native";
import { getPlaceArConfig } from "../../../services/ar";

const useAR = () => {
  const [arVisible, setArVisible] = useState(false);
  const [arUrl, setArUrl] = useState(null);
  const [arConfig, setArConfig] = useState(null);

  const openAR = useCallback(async (place) => {
    if (!place) return;
    const config = getPlaceArConfig(place);
    setArConfig(config);
    setArUrl(config?.modelUrl || null);
    setArVisible(true);
  }, []);

  const closeAR = useCallback(() => {
    setArVisible(false);
    setArUrl(null);
    setArConfig(null);
  }, []);

  const handleShouldStartLoad = useCallback((event) => {
    const url = event?.url || "";
    if (Platform.OS === "android" && url.startsWith("intent://")) {
      const fallback = arConfig?.sceneViewerUrl || arUrl;
      if (fallback) {
        Linking.openURL(fallback).catch(() => {});
      }
      return false;
    }
    return true;
  }, [arConfig, arUrl]);

  const generateArHtml = useCallback(() => {
    if (!arUrl) return "";
    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
          <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
          <style>html,body{margin:0;padding:0;height:100%;background:#0b1021;} model-viewer{width:100%;height:100%;}</style>
        </head>
        <body>
          <model-viewer src="${arConfig?.modelUrl || arUrl}" ios-src="${arConfig?.iosModelUrl || ""}"
            ar ar-modes="webxr scene-viewer quick-look" camera-controls auto-rotate shadow-intensity="1" exposure="1"
            style="width:100%;height:100%;">
          </model-viewer>
        </body>
      </html>`;
  }, [arUrl, arConfig]);

  return {
    arVisible,
    setArVisible,
    arUrl,
    arConfig,
    openAR,
    closeAR,
    handleShouldStartLoad,
    generateArHtml,
  };
};

export default useAR;
