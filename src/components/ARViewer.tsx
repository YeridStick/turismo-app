import {
    Viro3DObject,
    ViroAmbientLight,
    ViroARPlaneSelector,
    ViroARScene,
    ViroARSceneNavigator,
} from '@reactvision/react-viro';
import React from 'react';
import { StyleSheet } from 'react-native';

// URL del modelo de prueba (Pato de Khronos Group)
const TEST_MODEL_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';

interface ARSceneProps {
    modelUrl?: string;
}

/**
 * @description La escena de Realidad Aumentada que se renderiza.
 * Contiene luces y el selector de planos para colocar el objeto.
 */
const ARScene = ({ modelUrl = TEST_MODEL_URL }: ARSceneProps) => {
    return (
        <ViroARScene>
            {/* Luz Ambiental: Asegura que el modelo se vea bien iluminado. */}
            <ViroAmbientLight color="#ffffff" intensity={500} />

            {/* ViroARPlaneSelector: Permite detectar planos horizontales (suelo, mesas) */}
            <ViroARPlaneSelector>
                {/* Viro3DObject: Carga el modelo desde la URL */}
                <Viro3DObject
                    source={{ uri: modelUrl }}
                    type="GLB"
                    // La escala inicial debe ser pequeña, ya que los modelos 3D suelen ser muy grandes
                    scale={[0.05, 0.05, 0.05]}
                    position={[0, 0, 0]} // Posición inicial dentro del plano detectado

                    // Opcional: Permite al usuario interactuar con el modelo (mover, rotar, escalar)
                    onDrag={() => { }}
                // Se recomienda añadir un loading spinner aquí en una versión productiva.
                />
            </ViroARPlaneSelector>
        </ViroARScene>
    );
};

interface ARViewerProps {
    modelUrl?: string;
    onModelPlaced?: () => void;
}

/**
 * @description Componente principal que inicializa el navegador de la escena AR.
 * Este es el componente que llamas en tu pantalla principal (ej: ARScreen.tsx).
 */
export const ARViewer: React.FC<ARViewerProps> = ({ modelUrl, onModelPlaced }) => {
    return (
        <ViroARSceneNavigator
            autofocus={true}
            initialScene={{
                scene: () => <ARScene modelUrl={modelUrl} />,
            }}
            style={styles.container}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
