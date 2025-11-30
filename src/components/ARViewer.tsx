import {
    Viro3DObject,
    ViroAmbientLight,
    ViroARScene,
    ViroARSceneNavigator,
    ViroNode,
    ViroQuad,
    ViroSpotLight,
} from '@reactvision/react-viro';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

// URL del modelo de prueba (Pato de Khronos Group)
const TEST_MODEL_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';

interface ARSceneProps {
    modelUrl?: string;
    onModelLoad?: () => void;
    onModelError?: (error: any) => void;
}

/**
 * @description La escena de Realidad Aumentada que se renderiza.
 * El modelo aparece directamente frente a la cámara, sin necesidad de detectar planos.
 */
const ARScene = ({ modelUrl = TEST_MODEL_URL, onModelLoad, onModelError }: ARSceneProps) => {
    const [scale, setScale] = useState([0.2, 0.2, 0.2]);
    const [rotation, setRotation] = useState([0, 0, 0]);

    const onPinch = (pinchState: any, scaleFactor: number, source: any) => {
        if (pinchState === 3) { // 3 = PINCH_MOVED
            // Ajustar la escala base multiplicada por el factor del pinch
            const currentScale = scale[0];
            const newScale = currentScale * scaleFactor;
            // Limitar escala mínima y máxima
            const clampedScale = Math.max(0.05, Math.min(newScale, 1.0));
            setScale([clampedScale, clampedScale, clampedScale]);
        }
    };

    const onRotate = (rotateState: any, rotationFactor: number, source: any) => {
        if (rotateState === 3) { // 3 = ROTATE_MOVED
            // Rotar solo en el eje Y (vertical)
            const currentRotation = rotation[1];
            const newRotation = currentRotation - rotationFactor;
            setRotation([0, newRotation, 0]);
        }
    };

    return (
        <ViroARScene>
            {/* Luz Ambiental */}
            <ViroAmbientLight color="#ffffff" intensity={800} />

            {/* Luz direccional para generar sombras y volumen */}
            <ViroSpotLight
                innerAngle={5}
                outerAngle={90}
                direction={[0, -1, -0.2]}
                position={[0, 3, 1]}
                color="#ffffff"
                castsShadow={true}
                shadowMapSize={2048}
                shadowNearZ={2}
                shadowFarZ={5}
                shadowOpacity={0.7}
            />

            {/* Nodo contenedor posicionable */}
            <ViroNode
                position={[0, -0.5, -1.5]}
                dragType="FixedToWorld"
                onDrag={() => { }}
            >
                {/* Sombra falsa (Quad) para dar sensación de contacto con el suelo */}
                <ViroQuad
                    rotation={[-90, 0, 0]}
                    position={[0, -0.01, 0]} // Un poco debajo del modelo
                    width={1.5}
                    height={1.5}
                    arShadowReceiver={true}
                    style={{ opacity: 0.3 }} // Sombra suave
                />

                {/* Modelo 3D */}
                <Viro3DObject
                    source={{ uri: modelUrl }}
                    type="GLB"
                    scale={scale}
                    rotation={rotation}
                    position={[0, 0, 0]}
                    onLoadStart={() => console.log('Iniciando carga...')}
                    onLoadEnd={() => {
                        console.log('Carga completa');
                        onModelLoad?.();
                    }}
                    onError={(error) => {
                        console.error('Error carga:', error);
                        onModelError?.(error);
                    }}
                    // Gestos
                    onPinch={onPinch}
                    onRotate={onRotate}
                />
            </ViroNode>
        </ViroARScene>
    );
};

interface ARViewerProps {
    modelUrl?: string;
    onModelPlaced?: () => void;
    onModelLoad?: () => void;
    onModelError?: (error: any) => void;
}

export const ARViewer: React.FC<ARViewerProps> = ({
    modelUrl,
    onModelPlaced,
    onModelLoad,
    onModelError
}) => {
    return (
        <ViroARSceneNavigator
            autofocus={true}
            initialScene={{
                scene: () => (
                    <ARScene
                        modelUrl={modelUrl}
                        onModelLoad={onModelLoad}
                        onModelError={onModelError}
                    />
                ),
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
