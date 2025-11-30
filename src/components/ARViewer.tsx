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
    const [position, setPosition] = useState<[number, number, number]>([0, 0, -1.5]);
    const [modelVisible, setModelVisible] = useState(true);
    const [planeDetected, setPlaneDetected] = useState(false);

    // Referencias para guardar el estado base durante los gestos
    const baseScale = useRef<[number, number, number]>([0.3, 0.3, 0.3]);
    const baseRotation = useRef(0);
    const basePosition = useRef<[number, number, number]>([0, 0, -1.5]);
    const lastGestureTime = useRef(0);

    // Exponer función de reset al componente padre
    if (sceneRef) {
        sceneRef.current = {
            resetPosition: () => {
                setPosition([0, 0, -1.5]);
                setRotation([0, 0, 0]);
                setScale([0.3, 0.3, 0.3]);
                setModelVisible(true);
            },
            // Métodos para controlar escala y rotación desde botones
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
            },
            rotateLeft: () => {
                setRotation(prev => [0, prev[1] - 0.3, 0]);
            },
            rotateRight: () => {
                setRotation(prev => [0, prev[1] + 0.3, 0]);
            },
            placeOnPlane: (x: number = 0, y: number = 0, z: number = -1.5) => {
                setPosition([x, y, z]);
            }
        };
    }

    // Gesto de Drag mejorado con validación y límites
    const onDrag = (dragToPos: any, source: any) => {
        if (!dragToPos || !Array.isArray(dragToPos) || dragToPos.length !== 3) {
            return;
        }

        // Permitir movimiento pero mantener Z dentro de rango seguro
        const constrainedPos: [number, number, number] = [
            Math.max(-2, Math.min(dragToPos[0], 2)),      // Limitar X
            Math.max(-1, Math.min(dragToPos[1], 1.5)),    // Limitar Y
            Math.max(-3, Math.min(dragToPos[2], -0.5))    // Limitar Z
        ];

        setPosition(constrainedPos);
    };

    // Detectar cuando el modelo carga correctamente
    const onModelLoadEnd = () => {
        setModelVisible(true);
        console.log('✓ Modelo cargado correctamente');
        onModelLoad?.();
    };

    // Manejar errores de carga del modelo
    const handleModelError = (error: any) => {
        console.error('✗ Error cargando modelo:', error);
        setModelVisible(false);
        onModelError?.(error);
    };

    // Monitorear detección de planos
    const onTrackingUpdated = (state: any) => {
        if (state && state.cameraTransform) {
            console.log('📍 Estado de tracking:', state);
            // Viro puede detectar planos
            setPlaneDetected(true);
        }
    };

    return (
        <ViroARScene onTrackingUpdated={onTrackingUpdated}>
            {/* ILUMINACIÓN MEJORADA: Múltiples fuentes para mejor detección y renderizado */}
            <ViroAmbientLight color="#ffffff" intensity={1200} />

            <ViroOmniLight
                color="#ffffff"
                intensity={800}
                position={[0, 5, 0]}
                attenuationStartDistance={30}
                attenuationEndDistance={50}
            />

            <ViroOmniLight
                color="#ffffff"
                intensity={600}
                position={[5, 2, -2]}
                attenuationStartDistance={20}
                attenuationEndDistance={40}
            />

            {/* Nodo contenedor con mejores propiedades */}
            {modelVisible && (
                <ViroNode
                    position={position}
                    dragType="FixedToWorld"
                    onDrag={onDrag}
                    scale={[1, 1, 1]}
                >
                    {/* Modelo 3D con mejor manejo de errores */}
                    <Viro3DObject
                        source={{ uri: modelUrl }}
                        type="GLB"
                        scale={scale}
                        rotation={rotation}
                        position={[0, 0, 0]}
                        onLoadStart={() => console.log('Iniciando carga del modelo...')}
                        onLoadEnd={onModelLoadEnd}
                        onError={handleModelError}
                        // Propiedades adicionales para mejor renderizado
                        renderingOrder={0}
                        lightReceivingBitMask={3}
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
            },
            placeOnPlane: (x?: number, y?: number, z?: number) => {
                if (sceneRef.current && sceneRef.current.placeOnPlane) {
                    sceneRef.current.placeOnPlane(x || 0, y || 0, z || -1.5);
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