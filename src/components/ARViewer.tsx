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

    // Referencias para guardar el estado base durante los gestos
    const baseScale = useRef<[number, number, number]>([0.3, 0.3, 0.3]);
    const baseRotation = useRef<[number, number, number]>([0, 0, 0]);
    const basePosition = useRef<[number, number, number]>([0, 0, -1.5]);
    const lastGestureTime = useRef(0);

    // Constantes para reseteo consistente
    const INITIAL_POSITION: [number, number, number] = [0, 0, -1.5];
    const INITIAL_ROTATION: [number, number, number] = [0, 0, 0];
    const INITIAL_SCALE: [number, number, number] = [0.3, 0.3, 0.3];

    // Exponer función de reset al componente padre
    if (sceneRef) {
        sceneRef.current = {
            resetPosition: () => {
                // Reset completo y consistente
                setPosition([...INITIAL_POSITION]);
                setRotation([...INITIAL_ROTATION]);
                setScale([...INITIAL_SCALE]);
                basePosition.current = [...INITIAL_POSITION];
                baseRotation.current = [...INITIAL_ROTATION];
                baseScale.current = [...INITIAL_SCALE];
                setModelVisible(true);
                console.log('↻ Posición completamente reseteada');
            },
            // Métodos para controlar escala desde botones
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
                setRotation(prev => {
                    // Incremento de 45 grados (0.785 radianes) para rotación clara
                    const newRotation = prev[1] - 0.785;
                    return [0, newRotation, 0];
                });
            },
            rotateRight: () => {
                setRotation(prev => {
                    const newRotation = prev[1] + 0.785;
                    return [0, newRotation, 0];
                });
            },
            // Nuevo método para rotar continuamente (presión prolongada)
            rotateLeftSmall: () => {
                setRotation(prev => [0, prev[1] - 0.1, 0]);
            },
            rotateRightSmall: () => {
                setRotation(prev => [0, prev[1] + 0.1, 0]);
            }
        };
    }

    // Gesto de Pinch mejorado con debounce
    const onPinch = (pinchState: any, scaleFactor: number, source: any) => {
        const now = Date.now();

        if (pinchState === 1) { // PINCH_STARTED
            baseScale.current = [...scale];
            lastGestureTime.current = now;
        } else if (pinchState === 3) { // PINCH_MOVED
            // Aplicar debounce para evitar actualizaciones excesivas (~60fps)
            if (now - lastGestureTime.current < 16) return;

            lastGestureTime.current = now;
            const currentScale = baseScale.current[0];
            const newScale = currentScale * scaleFactor;

            // Rango de escala más controlado
            const clampedScale = Math.max(0.1, Math.min(newScale, 3.5));
            setScale([clampedScale, clampedScale, clampedScale]);
        }
    };

    // Gesto de Rotación mejorado - AHORA FUNCIONAL
    const onRotate = (rotateState: any, rotationFactor: number, source: any) => {
        const now = Date.now();

        if (rotateState === 1) { // ROTATE_STARTED
            baseRotation.current = [...rotation];
            lastGestureTime.current = now;
        } else if (rotateState === 3) { // ROTATE_MOVED
            if (now - lastGestureTime.current < 16) return;

            lastGestureTime.current = now;
            // Aplicar rotación de forma diferente para que funcione
            // El factor de rotación viene en radianes
            const rotationAmount = rotationFactor * 0.6;
            const newRotation = baseRotation.current[1] + rotationAmount;

            setRotation([0, newRotation, 0]);

            console.log(`🔄 Rotando: ${(newRotation * 180 / Math.PI).toFixed(1)}°`);
        }
    };

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

    // Monitorear detección de planos - MEJORADO
    const onTrackingUpdated = (state: any) => {
        if (state) {
            // Log para debugging
            if (state === 'TRACKING_NORMAL') {
                console.log('📍 AR Tracking: NORMAL');
            } else if (state === 'TRACKING_LIMITED') {
                console.log('⚠️ AR Tracking: LIMITED (apunta a superficie)');
            } else if (state === 'TRACKING_UNAVAILABLE') {
                console.log('❌ AR Tracking: NO DISPONIBLE');
            }
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
                        // Gestos mejorados
                        onPinch={onPinch}
                        onRotate={onRotate}
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
            rotateLeftSmall: () => {
                if (sceneRef.current && sceneRef.current.rotateLeftSmall) {
                    sceneRef.current.rotateLeftSmall();
                }
            },
            rotateRightSmall: () => {
                if (sceneRef.current && sceneRef.current.rotateRightSmall) {
                    sceneRef.current.rotateRightSmall();
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