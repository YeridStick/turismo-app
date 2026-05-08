import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

let ARKitModule = null;
if (Platform.OS === 'ios') {
  try {
    ARKitModule = require('react-native-arkit').ARKit;
  } catch (_e) {
    ARKitModule = null;
  }
}

const ArKitScreen = ({ route, navigation }) => {
  const modelUrl = route?.params?.modelUrl;

  if (Platform.OS !== 'ios' || !ARKitModule) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.fallbackText}>
          ARKit solo está disponible en iOS con módulo nativo. Usa el visor AR en Android.
        </Text>
        <TouchableOpacity style={[styles.close, { position: 'relative', top: 20, right: 0 }]} onPress={() => navigation?.goBack?.()}>
          <Text style={styles.closeText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ARKitModule
        style={StyleSheet.absoluteFill}
        planeDetection={ARKitModule.ARPlaneDetection.Horizontal}
        lightEstimationEnabled
      >
        {modelUrl ? (
          <ARKitModule.Model
            position={{ x: 0, y: 0, z: -0.5 }}
            scale={0.1}
            model={{ uri: modelUrl }}
          />
        ) : (
          <ARKitModule.Box
            position={{ x: 0, y: 0, z: -0.5 }}
            shape={{ width: 0.1, height: 0.1, length: 0.1 }}
            material={{ color: '#14B8A6' }}
          />
        )}
      </ARKitModule>

      <TouchableOpacity style={styles.close} onPress={() => navigation?.goBack?.()}>
        <Text style={styles.closeText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  fallbackText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  close: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 18,
    zIndex: 2,
  },
  closeText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default ArKitScreen;
