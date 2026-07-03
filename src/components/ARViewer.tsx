import {
    Viro3DObject,
    ViroAmbientLight,
    ViroARScene,
    ViroARSceneNavigator,
    ViroDirectionalLight,
} from '@reactvision/react-viro';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

// URL del modelo de prueba
const TEST_MODEL_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';

const resolveModelType = (url?: string): "GLB" | "GLTF" | "OBJ" => {
    const clean = (url || "").trim().split("?")[0].toLowerCase();
    if (clean.endsWith(".gltf")) return "GLTF";
    if (clean.endsWith(".obj")) return "OBJ";
    return "GLB";
};

interface ARSceneProps {
    modelUrl?: string;
    powerSaver?: boolean;
    onLoadProgress?: (progress: number) => void;
    onModelLoad?: () => void;
    onModelError?: (error: any) => void;
    sceneRef?: any;
}

const ARScene = ({
    modelUrl = TEST_MODEL_URL,
    powerSaver = true,
    onLoadProgress,
    onModelLoad,
    onModelError,
    sceneRef
}: ARSceneProps) => {
    const modelType = resolveModelType(modelUrl);
    // Estados tipados correctamente
    const [scale, setScale] = useState<[number, number, number]>([0.05, 0.05, 0.05]);
    const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
    // Posición inicial ajustada - Y en -0.3 para que esté a nivel del suelo
    const [position, setPosition] = useState<[number, number, number]>([0, -0.3, -1.2]);
    const [modelVisible, setModelVisible] = useState(true);

    // Referencias para guardar el estado base durante los gestos
    const baseScale = useRef<[number, number, number]>([0.05, 0.05, 0.05]);
    const baseRotation = useRef(0);
    const lastGestureTime = useRef(0);

    // Exponer función de reset al componente padre
    if (sceneRef) {
        sceneRef.current = {
            resetPosition: () => {
                setPosition([0, -0.3, -1.2]);
                setRotation([0, 0, 0]);
                setScale([0.05, 0.05, 0.05]);

                // Resetear referencias base
                baseRotation.current = 0;
                baseScale.current = [0.05, 0.05, 0.05];

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
                    const clampedScale = Math.max(newScale, 0.005);
                    return [clampedScale, clampedScale, clampedScale];
                });
            },
            rotateLeft: () => {
                setRotation(prev => {
                    const newRotationY = prev[1] + 10; // Rotar 10 grados a la izquierda
                    baseRotation.current = newRotationY;
                    return [prev[0], newRotationY, prev[2]];
                });
            },
            rotateRight: () => {
                setRotation(prev => {
                    const newRotationY = prev[1] - 10; // Rotar 10 grados a la derecha
                    baseRotation.current = newRotationY;
                    return [prev[0], newRotationY, prev[2]];
                });
            }
        };
    }

    // Gesto de Pinch (Escalado)
    const onPinch = (pinchState: any, scaleFactor: number, source: any) => {
        const now = Date.now();
        const throttleMs = powerSaver ? 24 : 16;

        if (pinchState === 1) { // PINCH_STARTED
            baseScale.current = [...scale];
            lastGestureTime.current = now;
        } else if (pinchState === 3) { // PINCH_MOVED
            // Debounce ligero
            if (now - lastGestureTime.current < throttleMs) return;
            lastGestureTime.current = now;

            const currentScale = baseScale.current[0];
            const newScale = currentScale * scaleFactor;
            const clampedScale = Math.max(0.005, Math.min(newScale, 3.5));

            setScale([clampedScale, clampedScale, clampedScale]);
        }
    };

    // Gesto de Rotación (Eje Y)
    const onRotate = (rotateState: any, rotationFactor: number, source: any) => {
        const now = Date.now();
        const throttleMs = powerSaver ? 24 : 16;

        if (rotateState === 1) { // ROTATE_STARTED
            baseRotation.current = rotation[1];
            lastGestureTime.current = now;
        } else if (rotateState === 3) { // ROTATE_MOVED
            if (now - lastGestureTime.current < throttleMs) return;
            lastGestureTime.current = now;

            // rotationFactor viene en grados
            const newRotationY = baseRotation.current - rotationFactor;
            setRotation([0, newRotationY, 0]);
        }
    };

    // Gesto de Drag (Movimiento)
    const onDrag = (dragToPos: any, source: any) => {
        if (!dragToPos || !Array.isArray(dragToPos) || dragToPos.length !== 3) return;

        // Actualizamos la posición directamente
        setPosition([dragToPos[0], dragToPos[1], dragToPos[2]]);
    };

    // Detectar cuando el modelo carga correctamente
    const onModelLoadEnd = () => {
        setModelVisible(true);
        console.log(`✓ Modelo cargado correctamente (${modelType})`);
        onLoadProgress?.(100);
        onModelLoad?.();
    };

    const handleModelError = (error: any) => {
        console.error('✗ Error cargando modelo:', error);
        setModelVisible(false);
        onModelError?.(error);
    };

    return (
        <ViroARScene>
            {/* ILUMINACIÓN OPTIMIZADA (SILK): Solo 2 fuentes para máximo rendimiento sin perder calidad */}
            <ViroAmbientLight color="#ffffff" intensity={powerSaver ? 160 : 220} />
            <ViroDirectionalLight
                color="#ffffff"
                direction={[0.3, -1, -0.5]}
                castsShadow={!powerSaver}
                intensity={powerSaver ? 620 : 850}
                shadowMapSize={powerSaver ? 512 : 768}
                shadowOpacity={powerSaver ? 0.25 : 0.35}
            />
            {/* OmniLights eliminadas para liberar CPU/GPU */}

            {/* 
                ESTRATEGIA DE GESTOS SIMPLIFICADA:
                Aplicamos TODAS las transformaciones y gestos directamente al Viro3DObject.
                Esto elimina conflictos de jerarquía y permite que los gestos multi-touch
                (pinch y rotate) funcionen correctamente.
            */}
            {modelVisible && (
                <Viro3DObject
                    source={{ uri: modelUrl }}
                    type={modelType}
                    position={position}
                    scale={scale}
                    rotation={rotation}
                    onLoadStart={() => {
                        console.log('Iniciando carga del modelo...');
                        onLoadProgress?.(65);
                    }}
                    onLoadEnd={onModelLoadEnd}
                    onError={handleModelError}

                    // TODOS los gestos aplicados directamente al objeto
                    dragType="FixedToWorld"
                    onDrag={onDrag}
                    onPinch={onPinch}
                    onRotate={onRotate}
                />
            )}
        </ViroARScene>
    );
};

interface ARViewerProps {
    modelUrl?: string;
    powerSaver?: boolean;
    onModelPlaced?: () => void;
    onLoadProgress?: (progress: number) => void;
    onModelLoad?: () => void;
    onModelError?: (error: any) => void;
    viewerRef?: any;
}

export const ARViewer: React.FC<ARViewerProps> = ({
    modelUrl,
    powerSaver = true,
    onModelPlaced,
    onLoadProgress,
    onModelLoad,
    onModelError,
    viewerRef
}) => {
    // Referencia interna para comunicarse con la escena
    const sceneRef = useRef<any>(null);
    const callbacksRef = useRef({ onLoadProgress, onModelLoad, onModelError });
    callbacksRef.current = { onLoadProgress, onModelLoad, onModelError };
    const sceneProps = useMemo(
        () => ({
            modelUrl,
            powerSaver,
            onLoadProgress: (progress: number) => callbacksRef.current.onLoadProgress?.(progress),
            onModelLoad: () => callbacksRef.current.onModelLoad?.(),
            onModelError: (error: any) => callbacksRef.current.onModelError?.(error),
            sceneRef
        }),
        [modelUrl, powerSaver]
    );
    const arInitialScene = useMemo(
        () => ({
            scene: () => <ARScene {...sceneProps} />,
        }),
        [sceneProps]
    );

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
            },
            rotateLeft: () => {
                if (sceneRef.current && sceneRef.current.rotateLeft) {
                    sceneRef.current.rotateLeft();
                }
            },
            rotateRight: () => {
                if (sceneRef.current && sceneRef.current.rotateRight) {
                    sceneRef.current.rotateRight();
                }
            }
        };
    }

    return (
        <ViroARSceneNavigator
            key={`ar-${modelUrl || TEST_MODEL_URL}`}
            autofocus={true}
            initialScene={arInitialScene}
            style={styles.container}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
