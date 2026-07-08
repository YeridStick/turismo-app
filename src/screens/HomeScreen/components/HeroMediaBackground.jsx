import React, { useEffect, useMemo, useState } from "react";
import { AppState, InteractionManager, View } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import styles from "../styles";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const HeroMediaBackground = ({ imageUri, videoUri, children }) => {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setShouldLoadVideo(false);
    setVideoReady(false);

    if (!videoUri) return undefined;

    let timeoutId = null;
    let isMounted = true;
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        if (isMounted && AppState.currentState === "active") {
          setShouldLoadVideo(true);
        }
      }, 900);
    });

    return () => {
      isMounted = false;
      task?.cancel?.();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [videoUri]);

  const videoHtml = useMemo(() => {
    if (!videoUri) return null;
    const source = escapeHtml(videoUri);
    const poster = escapeHtml(imageUri);

    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              overflow: hidden;
              background: transparent;
            }
            video {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
              background: transparent;
            }
          </style>
        </head>
        <body>
          <video id="heroVideo" src="${source}" poster="${poster}" autoplay muted loop playsinline webkit-playsinline preload="metadata"></video>
          <script>
            const video = document.getElementById('heroVideo');
            const notifyReady = () => {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
            };
            video.addEventListener('canplay', notifyReady, { once: true });
            video.addEventListener('playing', notifyReady, { once: true });
            video.play().catch(() => {});
          </script>
        </body>
      </html>
    `;
  }, [imageUri, videoUri]);

  return (
    <View style={styles.heroBackground}>
      <Image
        source={{ uri: imageUri }}
        style={styles.heroImageFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={120}
      />
      {videoHtml && shouldLoadVideo ? (
        <View
          style={[
            styles.heroVideoLayer,
            !videoReady && styles.heroVideoLayerHidden,
          ]}
          pointerEvents="none"
        >
          <WebView
            source={{ html: videoHtml }}
            style={styles.heroVideoWebView}
            originWhitelist={["*"]}
            scrollEnabled={false}
            bounces={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled={false}
            pointerEvents="none"
            onMessage={(event) => {
              if (event.nativeEvent.data === "ready") {
                setVideoReady(true);
              }
            }}
          />
        </View>
      ) : null}
      {children}
    </View>
  );
};

export default React.memo(HeroMediaBackground);
