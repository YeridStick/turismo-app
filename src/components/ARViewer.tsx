import {
    Viro3DObject,
    ViroAmbientLight,
    ViroARScene,
    ViroARSceneNavigator,
    ViroNode,
    ViroOmniLight,
    ViroQuad,
} from '@reactvision/react-viro';
import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

// URL del modelo de prueba
const TEST_MODEL_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';

interface ARSceneProps {
    modelUrl?: string;
    onModelLoad?: () => void;
    onModelError?: (error: any) => void;
    sceneRef?: any;
}

const ARScene = ({ modelUrl = TEST_MODEL_URL, onModelLoad, onModelError, sceneRef }: ARSceneProps) => {
    const [scale, setScale] = useState([0.2, 0.2, 0.2]);
    const [rotation, setRotation] = useState([0, 0, 0]);
    const [position, setPosition] = useState([0, -0.3, -0.8]); // Más cerca y centrado

    // Referencias para guardar el estado base durante los gestos
    const baseScale = useRef([0.2, 0.2, 0.2]);
    const baseRotation = useRef(0);

    // Exponer función de reset al componente padre
    if (sceneRef) {
        sceneRef.current = {
            resetPosition: () => {
                setPosition([0, -0.3, -0.8]);
                setRotation([0, 0, 0]);
                // Mantenemos la escala actual o la reseteamos si prefieres
            }
        };
    }

    const onPinch = (pinchState: any, scaleFactor: number, source: any) => {
        if (pinchState === 1) { // PINCH_STARTED
            baseScale.current = scale;
        } else if (pinchState === 3) { // PINCH_MOVED
            const currentScale = baseScale.current[0];
            const newScale = currentScale * scaleFactor;
            const clampedScale = Math.max(0.05, Math.min(newScale, 2.0));
            setScale([clampedScale, clampedScale, clampedScale]);
        }
    };

    const onRotate = (rotateState: any, rotationFactor: number, source: any) => {
        if (rotateState === 1) { // ROTATE_STARTED
            baseRotation.current = rotation[1];
        } else if (rotateState === 3) { // ROTATE_MOVED
            // rotationFactor es el cambio en rotación, lo sumamos a la base
            const newRotation = baseRotation.current - rotationFactor;
            setRotation([0, newRotation, 0]);
        }
    };

    const onDrag = (dragToPos: any, source: any) => {
        // Actualizamos la posición mientras se arrastra para mantener el estado sincronizado
        setPosition(dragToPos);
    };

    return (
        <ViroARScene>
            {/* ILUMINACIÓN MEJORADA: Luz ambiental fuerte + Luz Omni para rellenar sombras */}
            <ViroAmbientLight color="#ffffff" intensity={1000} />
            <ViroOmniLight
                color="#ffffff"
                intensity={1000}
                position={[0, 5, 0]}
                attenuationStartDistance={20}
                attenuationEndDistance={30}
            />

            {/* Nodo contenedor posicionable */}
            <ViroNode
                position={position}
                dragType="FixedToWorld"
                onDrag={onDrag}
            >
                {/* Sombra falsa (Quad) */}
                <ViroQuad
                    rotation={[-90, 0, 0]}
                    position={[0, -0.01, 0]}
                    width={1.5}
                    height={1.5}
                    arShadowReceiver={true}
                    style={{ opacity: 0.4 }}
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
    viewerRef?: any;
}

export const ARViewer: React.FC<ARViewerProps> = ({
    modelUrl,
    onModelPlaced,
    onModelLoad,
    onModelError,
    viewerRef
}) => {
    // Referencia interna para comunicarse con la escena
    const sceneRef = useRef<any>(null);

    // Exponer métodos al padre (ARScreen)
    if (viewerRef) {
        viewerRef.current = {
            resetPosition: () => {
                if (sceneRef.current && sceneRef.current.resetPosition) {
                    sceneRef.current.resetPosition();
                }
            }
        };
    }

    return (
        <ViroARSceneNavigator
            autofocus={true}
            initialScene={{
                scene: () => (
                    <ARScene
                        modelUrl={modelUrl}
                        onModelLoad={onModelLoad}
                        onModelError={onModelError}
                        sceneRef={sceneRef}
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
