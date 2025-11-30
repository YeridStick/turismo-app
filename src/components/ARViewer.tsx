import {
    Viro3DObject,
    ViroAmbientLight,
    ViroARScene,
    ViroARSceneNavigator,
    ViroNode,
    ViroOmniLight,
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
    // Estados tipados correctamente
    const [scale, setScale] = useState<[number, number, number]>([0.3, 0.3, 0.3]);
    const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
    // Posición inicial mejorada - más cercana al usuario
    const [position, setPosition] = useState<[number, number, number]>([0, 0, -1.2]);
    const [modelVisible, setModelVisible] = useState(true);

    // Referencias para guardar el estado base durante los gestos
    const baseScale = useRef<[number, number, number]>([0.3, 0.3, 0.3]);
    const baseRotation = useRef(0);
    const lastGestureTime = useRef(0);

    // Referencia para la posición de la cámara
    const cameraRef = useRef<{
        position: [number, number, number];
        rotation: [number, number, number];
        forward: [number, number, number];
    }>({
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        forward: [0, 0, -1]
    });

    // Función para calcular la posición frente a la cámara
    const getPositionInFrontOfCamera = (distance: number = 1.2): [number, number, number] => {
        const { position: camPos, forward } = cameraRef.current;
        return [
            camPos[0] + forward[0] * distance,
            camPos[1] + forward[1] * distance,
            camPos[2] + forward[2] * distance
        ];
    };

    // Actualizar referencia de cámara
    const onCameraTransformUpdate = (cameraTransform: any) => {
        const { position: camPos, rotation: camRot, forward } = cameraTransform;
        cameraRef.current = {
            position: camPos,
            rotation: camRot,
            forward: forward
        };
    };

    // Exponer función de reset al componente padre
    if (sceneRef) {
        sceneRef.current = {
            resetPosition: () => {
                // Calcular nueva posición frente a la cámara actual
                const newPos = getPositionInFrontOfCamera(1.2);

                setPosition(newPos);
                setRotation([0, 0, 0]);
                setScale([0.3, 0.3, 0.3]);

                // Resetear referencias base
                baseRotation.current = 0;
                baseScale.current = [0.3, 0.3, 0.3];

                setModelVisible(true);
                console.log('↻ Modelo reseteado frente a la cámara');
            },
            increaseScale: () => {
                setScale(prev => {
                    const newScale = prev[0] * 1.2;
                    const clampedScale = Math.min(newScale, 3.5);
                    return [clampedScale, clampedScale, clampedScale];
                });
            },
            decreaseScale: () => {
                setScale(prev => {
                    const newScale = prev[0] * 0.8;
                    const clampedScale = Math.max(newScale, 0.1);
                    return [clampedScale, clampedScale, clampedScale];
                });
            }
        };
    }

    // Gesto de Pinch (Escalado)
    const onPinch = (pinchState: any, scaleFactor: number, source: any) => {
        const now = Date.now();

        if (pinchState === 1) { // PINCH_STARTED
            baseScale.current = [...scale];
            lastGestureTime.current = now;
        } else if (pinchState === 3) { // PINCH_MOVED
            // Debounce ligero
            if (now - lastGestureTime.current < 16) return;
            lastGestureTime.current = now;

            const currentScale = baseScale.current[0];
            const newScale = currentScale * scaleFactor;
            const clampedScale = Math.max(0.1, Math.min(newScale, 3.5));

            setScale([clampedScale, clampedScale, clampedScale]);
        }
    };

    // Gesto de Rotación (Eje Y)
    const onRotate = (rotateState: any, rotationFactor: number, source: any) => {
        const now = Date.now();

        if (rotateState === 1) { // ROTATE_STARTED
            baseRotation.current = rotation[1];
            lastGestureTime.current = now;
        } else if (rotateState === 3) { // ROTATE_MOVED
            if (now - lastGestureTime.current < 16) return;
            lastGestureTime.current = now;

            // rotationFactor viene en grados
            const newRotationY = baseRotation.current - rotationFactor;
            setRotation([0, newRotationY, 0]);
        }
    };

    // Gesto de Drag (Movimiento)
    const onDrag = (dragToPos: any, source: any) => {
        if (!dragToPos || !Array.isArray(dragToPos) || dragToPos.length !== 3) return;

        // Actualizamos la posición del NODO contenedor
        setPosition(dragToPos);
    };

    // Detectar cuando el modelo carga correctamente
    const onModelLoadEnd = () => {
        setModelVisible(true);
        console.log('✓ Modelo cargado correctamente');
        onModelLoad?.();
    };

    const handleModelError = (error: any) => {
        console.error('✗ Error cargando modelo:', error);
        setModelVisible(false);
        onModelError?.(error);
    };

    return (
        <ViroARScene onCameraTransformUpdate={onCameraTransformUpdate}>
            {/* ILUMINACIÓN */}
            <ViroAmbientLight color="#ffffff" intensity={1000} />
            <ViroOmniLight color="#ffffff" intensity={800} position={[0, 5, 0]} />
            <ViroOmniLight color="#ffffff" intensity={600} position={[5, 2, -2]} />

            {/* 
                ESTRATEGIA DE GESTOS UNIFICADA:
                Movemos TODOS los gestos (Drag, Rotate, Pinch) al Viro3DObject.
                Al quitar 'dragType' del ViroNode, evitamos que capture los toques
                antes de que el objeto pueda detectar los dos dedos.
            */}
            {modelVisible && (
                <ViroNode
                    position={position}
                    scale={scale}
                    rotation={rotation}
                // dragType eliminado del Node para evitar conflictos
                >
                    <Viro3DObject
                        source={{ uri: modelUrl }}
                        type="GLB"
                        scale={[1, 1, 1]}
                        rotation={[0, 0, 0]}
                        onLoadStart={() => console.log('Iniciando carga del modelo...')}
                        onLoadEnd={onModelLoadEnd}
                        onError={handleModelError}

                        // TODOS los gestos en el objeto
                        dragType="FixedToWorld"
                        onDrag={onDrag}
                        onPinch={onPinch}
                        onRotate={onRotate}
                    />
                </ViroNode>
            )}
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
            },
            increaseScale: () => {
                if (sceneRef.current && sceneRef.current.increaseScale) {
                    sceneRef.current.increaseScale();
                }
            },
            decreaseScale: () => {
                if (sceneRef.current && sceneRef.current.decreaseScale) {
                    sceneRef.current.decreaseScale();
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