"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  FogExp2,
  MathUtils,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import causticsFragmentShader from "./shaders/caustics.frag";
import { sampleWaterHeight } from "./sim/buoyancy";

const causticsVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

function makeParticleGeometry(count, radius, verticalRange) {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * radius;
    positions[i * 3] = Math.cos(angle) * distance;
    positions[i * 3 + 1] = MathUtils.randFloatSpread(verticalRange);
    positions[i * 3 + 2] = Math.sin(angle) * distance;
  }

  geometry.setAttribute("position", new BufferAttribute(positions, 3));

  return geometry;
}

function isInsideWaterBounds(point, width, depth) {
  const margin = 0.6;

  return (
    Math.abs(point.x) <= width * 0.5 + margin &&
    Math.abs(point.z) <= depth * 0.5 + margin
  );
}

export default function UnderwaterFX({
  waterGroupRef,
  waterMaterialRef,
  simulation,
  sampler,
  waterParams,
  width,
  depth,
  enabled = true,
  onUnderwaterChange,
}) {
  const { camera, gl, scene } = useThree();
  const particleGroupRef = useRef(null);
  const particleMaterialRef = useRef(null);
  const causticsMaterialRef = useRef(null);
  const worldCameraRef = useRef(new Vector3());
  const localCameraRef = useRef(new Vector3());
  const underwaterMixRef = useRef(0);
  const underwaterRef = useRef(false);
  const [isUnderwater, setIsUnderwater] = useState(false);
  const baseMoodRef = useRef(null);
  const underwaterColor = useMemo(
    () => new Color(waterParams.underwaterColor ?? "#0b6f77"),
    [waterParams.underwaterColor],
  );
  const fogColor = useMemo(
    () => new Color(waterParams.underwaterFogColor ?? "#0a5665"),
    [waterParams.underwaterFogColor],
  );
  const causticsMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uColor: { value: new Color(waterParams.causticsColor ?? "#bfffea") },
          uWaterSize: { value: new Vector2(width, depth) },
        },
        vertexShader: causticsVertexShader,
        fragmentShader: causticsFragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [depth, waterParams.causticsColor, width],
  );
  const particleGeometry = useMemo(
    () =>
      makeParticleGeometry(
        waterParams.underwaterParticleCount ?? 120,
        Math.max(width, depth) * 0.85,
        1.8,
      ),
    [depth, waterParams.underwaterParticleCount, width],
  );

  useEffect(() => {
    const existingFog = scene.fog;

    baseMoodRef.current = {
      fog: existingFog,
      fogColor: existingFog?.color?.clone?.() ?? new Color("#EAD0DB"),
      fogDensity: existingFog?.density ?? 0.00028,
      exposure: gl.toneMappingExposure,
    };

    return () => {
      const base = baseMoodRef.current;

      if (base?.fog) {
        scene.fog = base.fog;
        scene.fog.color.copy(base.fogColor);
        scene.fog.density = base.fogDensity;
      }

      gl.toneMappingExposure = base?.exposure ?? gl.toneMappingExposure;
      causticsMaterial.dispose();
      particleGeometry.dispose();
    };
  }, [causticsMaterial, gl, particleGeometry, scene]);

  useEffect(() => {
    onUnderwaterChange?.({
      isUnderwater,
      mix: underwaterMixRef.current,
    });
  }, [isUnderwater, onUnderwaterChange]);

  useFrame((state, delta) => {
    const waterGroup = waterGroupRef.current;
    const activeMaterial = waterMaterialRef.current;
    const base = baseMoodRef.current;

    if (!waterGroup || !activeMaterial || !base) {
      return;
    }

    camera.getWorldPosition(worldCameraRef.current);
    localCameraRef.current.copy(worldCameraRef.current);
    waterGroup.worldToLocal(localCameraRef.current);

    const time = simulation?.time ?? state.clock.elapsedTime;
    const localCamera = localCameraRef.current;
    const insideBounds = isInsideWaterBounds(localCamera, width, depth);
    const waterHeight = sampleWaterHeight({
      sampler,
      simulation,
      x: localCamera.x,
      z: localCamera.z,
      time,
      params: waterParams,
    });
    const depthBelowSurface = insideBounds ? waterHeight - localCamera.y : -1;
    const transitionDepth = Math.max(0.02, waterParams.underwaterTransitionDepth ?? 0.18);
    const targetMix = enabled
      ? MathUtils.clamp((depthBelowSurface + 0.035) / transitionDepth, 0, 1)
      : 0;
    const nextMix = MathUtils.damp(
      underwaterMixRef.current,
      targetMix,
      waterParams.underwaterTransitionSpeed ?? 5.2,
      delta,
    );
    const nextIsUnderwater = nextMix > 0.38;

    underwaterMixRef.current = nextMix;

    if (nextMix < 0.01 && targetMix < 0.01) {
      if (scene.fog?.color) {
        base.fog = scene.fog;
        base.fogColor.copy(scene.fog.color);
        base.fogDensity = scene.fog.density ?? base.fogDensity;
      }
      base.exposure = gl.toneMappingExposure;
    }

    if (nextIsUnderwater !== underwaterRef.current) {
      underwaterRef.current = nextIsUnderwater;
      setIsUnderwater(nextIsUnderwater);
      onUnderwaterChange?.({
        isUnderwater: nextIsUnderwater,
        mix: nextMix,
        depth: Math.max(0, depthBelowSurface),
        waterHeight,
        cameraLocal: localCamera.clone(),
      });
    }

    if (nextMix > 0.001) {
      if (!scene.fog || !(scene.fog instanceof FogExp2)) {
        scene.fog = new FogExp2(base.fogColor, base.fogDensity);
      }

      scene.fog.color.copy(base.fogColor).lerp(fogColor, nextMix);
      scene.fog.density = MathUtils.lerp(
        base.fogDensity,
        waterParams.underwaterFogDensity ?? 0.055,
        nextMix,
      );
      gl.toneMappingExposure = MathUtils.lerp(base.exposure, base.exposure * 0.68, nextMix);
    }

    activeMaterial.uniforms.uUnderwaterMix.value = nextMix;
    activeMaterial.uniforms.uUnderwaterColor.value.copy(underwaterColor);

    if (particleGroupRef.current) {
      particleGroupRef.current.position.copy(localCamera);
      particleGroupRef.current.rotation.y += delta * 0.035;
      particleGroupRef.current.rotation.x = Math.sin(time * 0.18) * 0.08;
    }

    if (particleMaterialRef.current) {
      particleMaterialRef.current.opacity = nextMix * (waterParams.underwaterParticleOpacity ?? 0.28);
      particleMaterialRef.current.size = MathUtils.lerp(0.006, 0.015, nextMix);
    }

    causticsMaterial.uniforms.uTime.value = time;
    causticsMaterial.uniforms.uIntensity.value = nextMix * (waterParams.causticsStrength ?? 0.42);
    causticsMaterial.uniforms.uColor.value.set(waterParams.causticsColor ?? "#bfffea");
    causticsMaterial.uniforms.uWaterSize.value.set(width, depth);
  });

  return (
    <>
      <points ref={particleGroupRef} geometry={particleGeometry} frustumCulled={false}>
        <pointsMaterial
          ref={particleMaterialRef}
          color={waterParams.underwaterParticleColor ?? "#c8fff0"}
          transparent
          opacity={0}
          size={0.012}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <mesh
        position={[0, -(waterParams.causticsDepth ?? 0.46), 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={8}
        frustumCulled={false}
      >
        <planeGeometry args={[width, depth, 1, 1]} />
        <primitive
          ref={causticsMaterialRef}
          attach="material"
          object={causticsMaterial}
        />
      </mesh>
    </>
  );
}
