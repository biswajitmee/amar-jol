"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, DoubleSide, Vector3 } from "three";
import { usePlanarReflectionCapture } from "./usePlanarReflectionCapture";

const PREVIEW_DISTANCE = 2.4;
const PREVIEW_WIDTH_RATIO = 0.34;

function ReflectionTextureDebugPreview({
  meshRef,
  texture,
  visible,
  targetSize,
}) {
  const { camera } = useThree();
  const offset = useMemo(() => new Vector3(), []);
  const position = useMemo(() => new Vector3(), []);
  const targetAspect = targetSize.height > 0 ? targetSize.width / targetSize.height : 1;

  useFrame(() => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    mesh.visible = Boolean(visible && texture);

    if (!mesh.visible) {
      return;
    }

    const distance = PREVIEW_DISTANCE;
    let viewWidth = 2.8;
    let viewHeight = 1.6;

    if (camera.isPerspectiveCamera) {
      viewHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * distance;
      viewWidth = viewHeight * camera.aspect;
    } else if (camera.isOrthographicCamera) {
      viewWidth = (camera.right - camera.left) / camera.zoom;
      viewHeight = (camera.top - camera.bottom) / camera.zoom;
    }

    const previewWidth = viewWidth * PREVIEW_WIDTH_RATIO;
    const previewHeight = previewWidth / targetAspect;
    const marginX = viewWidth * 0.04;
    const marginY = viewHeight * 0.06;

    offset.set(
      -viewWidth / 2 + previewWidth / 2 + marginX,
      viewHeight / 2 - previewHeight / 2 - marginY,
      -distance,
    );
    position.copy(offset).applyMatrix4(camera.matrixWorld);
    mesh.position.copy(position);
    mesh.quaternion.copy(camera.quaternion);
    mesh.scale.set(previewWidth, previewHeight, 1);
  });

  if (!visible || !texture) {
    return null;
  }

  return (
    <mesh ref={meshRef} renderOrder={10000} frustumCulled={false}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

export default function PlanarReflectionCapture({
  waterMeshRef,
  waterMaterialRef,
  fallbackTexture = null,
  enabled = true,
  planarReflectionEnabled = true,
  planarReflectionStrength = 0.45,
  planarReflectionDistortion = 0.012,
  planarReflectionTint = "#ffffff",
  planarReflectionFade = 0.7,
  showDebugPreview = false,
  targetScale = 0.5,
  clipBias = 0,
}) {
  const previewMeshRef = useRef(null);
  const hiddenObjectRefs = useMemo(() => [previewMeshRef], []);
  const tintColor = useMemo(() => new Color(planarReflectionTint), [planarReflectionTint]);
  const reflection = usePlanarReflectionCapture({
    waterMeshRef,
    enabled,
    targetScale,
    clipBias,
    hiddenObjectRefs,
  });

  useFrame(() => {
    const uniforms = waterMaterialRef?.current?.uniforms;

    if (!uniforms) {
      return;
    }

    uniforms.uPlanarReflectionTexture.value = reflection.reflectionTexture ?? fallbackTexture;
    uniforms.uPlanarReflectionMatrix.value.copy(reflection.reflectionTextureMatrix);
    uniforms.uPlanarReflectionEnabled.value =
      planarReflectionEnabled && reflection.reflectionEnabled ? 1 : 0;
    uniforms.uPlanarReflectionStrength.value = planarReflectionStrength;
    uniforms.uPlanarReflectionDistortion.value = planarReflectionDistortion;
    uniforms.uPlanarReflectionTint.value.copy(tintColor);
    uniforms.uPlanarReflectionFade.value = planarReflectionFade;
  });

  return (
    <ReflectionTextureDebugPreview
      meshRef={previewMeshRef}
      texture={reflection.reflectionTexture}
      visible={showDebugPreview}
      targetSize={reflection.reflectionTargetSize}
    />
  );
}

export { usePlanarReflectionCapture };
