"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Vec2Tuple = [number, number];
type Vec3Tuple = [number, number, number];

type SharedNoise = {
  dir?: Vec2Tuple;
  worldScale?: number;
  warpAmt?: number;
  ridgePower?: number;
  ridgeMix?: number;
  driftSpeed?: number;
  wobbleFreq?: number;
  wobbleMag?: number;
  dissolveScale?: number;
  dissolveSpeed?: number;
  dissolveWidth?: number;
};

type CloudFloatingProps = {
  position?: Vec3Tuple;
  color1?: string;
  color2?: string;
  opacity?: number;
  speed?: number;
  numPlanes?: number;
  xSpread?: number;
  ySpread?: number;
  zSpread?: number;
  baseScale?: number;
  debug?: boolean;
  sharedNoise?: SharedNoise;
  perLayerWindVariance?: number;
  fixedStepHz?: number;
  maxSubSteps?: number;
  scrollPauseThreshold?: number;
  minVelFactor?: number;
  damping?: number;
  cameraCompFactor?: number;
  jitterStabilize?: boolean;
  jitterLowpassAlpha?: number;
  jitterCompStrength?: number;
};

type CloudLayer = {
  key: number;
  position: Vec3Tuple;
  scale: Vec3Tuple;
  rotation: Vec3Tuple;
  opacity: number;
  speed: number;
  seed: number;
  dir: Vec2Tuple;
  wobbleFreq: number;
  wobbleMag: number;
};

type CloudMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uColor1: { value: THREE.Color };
    uColor2: { value: THREE.Color };
    uOpacity: { value: number };
    uSpeed: { value: number };
    uSeed: { value: number };
    uDir: { value: THREE.Vector2 };
    uOffset: { value: THREE.Vector2 };
  };
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randVec2 = (baseX: number, baseY: number, mag = 0.12): Vec2Tuple => [
  baseX + rand(-mag, mag),
  baseY + rand(-mag, mag),
];

export default function CloudFloating({
  position = [0, 8, 0],
  color1 = "#D6362D",
  color2 = "#6A511A",
  opacity = 0.2,
  speed = 10.9,
  numPlanes = 100,
  xSpread = 70,
  ySpread = 70,
  zSpread = 50,
  baseScale = 50,
  debug = false,
  sharedNoise = { dir: [-1.0, 0.22] },
  perLayerWindVariance = 0.22,
  fixedStepHz = 60,
  maxSubSteps = 6,
  scrollPauseThreshold = 1.0,
  minVelFactor = 0.08,
  damping = 0.02,
}: CloudFloatingProps) {
  const windDir = sharedNoise.dir ?? [-1.0, 0.22];
  const safePlaneCount = Math.min(Math.max(1, Math.floor(numPlanes)), 8);
  const safeBaseScale = Math.min(baseScale, 60);
  const safeXSpread = Math.min(xSpread, 220);
  const safeYSpread = Math.min(ySpread, 140);
  const safeZSpread = Math.min(zSpread, 120);
  const layers = useMemo<CloudLayer[]>(
    () =>
      Array.from({ length: safePlaneCount }).map((_, i) => {
        const t = safePlaneCount > 1 ? i / (safePlaneCount - 1) : 0;
        const x = rand(-1, 1);
        const yBell = 1 - x * x;
        const peak = Math.sin(Math.PI * (1 - t));
        const xSpreadCur = safeXSpread * (0.7 + 0.3 * yBell) * (1 - t * 0.72);
        const zSpreadCur = safeZSpread * (0.45 + 0.55 * t);
        const dir = randVec2(windDir[0], windDir[1], perLayerWindVariance);

        return {
          key: i,
          position: [
            x * xSpreadCur,
            safeYSpread * (0.25 + 0.75 * yBell) * peak + rand(-0.8, 0.8),
            rand(-zSpreadCur, zSpreadCur),
          ],
          scale: [
            safeBaseScale * (1.05 - t * 0.68) * rand(0.86, 1.12) * (0.85 + 0.35 * yBell),
            safeBaseScale * (0.65 + t * 1.05) * rand(0.88, 1.08) * (0.6 + 0.6 * yBell),
            1,
          ],
          rotation: [0, 0, rand(-0.08, 0.08)],
          opacity: opacity * (1 - t * t) * (0.85 + 0.2 * yBell) * rand(0.92, 1.05),
          speed: speed * rand(0.82, 1.12),
          seed: Math.random() * 1000,
          dir,
          wobbleFreq: 0.5 + rand(-0.08, 0.08),
          wobbleMag: 0.12 + rand(-0.03, 0.03),
        };
      }),
    [opacity, perLayerWindVariance, safeBaseScale, safePlaneCount, safeXSpread, safeYSpread, safeZSpread, speed, windDir],
  );

  const groupRef = useRef<THREE.Group>(null);
  const matRefs = useRef<Array<CloudMaterial | null>>([]);
  const offsetsRef = useRef<THREE.Vector2[]>([]);
  const taccRef = useRef<number[]>([]);
  const accumulatorRef = useRef(0);
  const cloudTimeRef = useRef(0);
  const localVelSmoothedRef = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    matRefs.current = [];
    offsetsRef.current = Array.from({ length: safePlaneCount }, () => new THREE.Vector2(0, 0));
    taccRef.current = Array.from({ length: safePlaneCount }, () => Math.random() * 10);
    accumulatorRef.current = 0;
    groupRef.current?.userData.basePosition?.copy?.(new THREE.Vector3().fromArray(position));
  }, [safePlaneCount, position]);

  const fixedDt = 1 / Math.max(1, fixedStepHz);

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.12);
    const windowWithVelocity = window as typeof window & {
      _springScrollVelocitySmoothed?: number;
      _springScrollVelocity?: number;
    };
    const globalSmoothed =
      typeof windowWithVelocity._springScrollVelocitySmoothed === "number"
        ? windowWithVelocity._springScrollVelocitySmoothed
        : typeof windowWithVelocity._springScrollVelocity === "number"
          ? Math.abs(windowWithVelocity._springScrollVelocity)
          : 0;

    localVelSmoothedRef.current =
      localVelSmoothedRef.current * 0.88 + Math.abs(globalSmoothed) * 0.12;

    const scrollVel = localVelSmoothedRef.current;
    const velocitySlowThreshold = 0.45;
    const driftBaseSpeed = 0.12;
    const perStepMax = 1.2;
    const localDamping = THREE.MathUtils.clamp(damping || 0.02, 0, 0.2);
    const velFactor =
      scrollVel <= velocitySlowThreshold
        ? 1
        : Math.max(minVelFactor, 1 - (scrollVel - velocitySlowThreshold) * 0.4);
    const pauseUpdates = scrollVel >= scrollPauseThreshold;

    accumulatorRef.current += safeDelta;
    const maxSteps = Math.max(1, Math.floor(Math.min(maxSubSteps, accumulatorRef.current / fixedDt)));
    let steps = 0;

    while (accumulatorRef.current >= fixedDt && steps < maxSteps) {
      layers.forEach((layer, i) => {
        offsetsRef.current[i] ??= new THREE.Vector2(0, 0);
        taccRef.current[i] ??= Math.random() * 10;

        const dirVec = new THREE.Vector2(layer.dir[0], layer.dir[1]);
        if (dirVec.lengthSq() < 1e-8) dirVec.set(1, 0);
        dirVec.normalize();

        const appliedFactor = pauseUpdates ? minVelFactor : velFactor;
        const driftStep = dirVec.multiplyScalar(driftBaseSpeed * layer.speed * fixedDt * appliedFactor);
        if (driftStep.length() > perStepMax) driftStep.setLength(perStepMax);

        offsetsRef.current[i].add(driftStep);
        taccRef.current[i] += fixedDt * layer.speed;
        offsetsRef.current[i].lerp(new THREE.Vector2(0, 0), localDamping);
        if (offsetsRef.current[i].length() > 400) offsetsRef.current[i].setLength(400);
      });
      accumulatorRef.current -= fixedDt;
      steps += 1;
    }

    cloudTimeRef.current = state.clock.getElapsedTime() * 0.12;

    matRefs.current.forEach((material, i) => {
      const layer = layers[i];
      if (!material || !layer) return;

      offsetsRef.current[i] ??= new THREE.Vector2(0, 0);
      taccRef.current[i] ??= Math.random() * 10;

      const wobbleVal = Math.sin(taccRef.current[i] * layer.wobbleFreq) * layer.wobbleMag;
      const dirVec = new THREE.Vector2(layer.dir[0], layer.dir[1]).normalize();
      const totalOffset = offsetsRef.current[i]
        .clone()
        .add(new THREE.Vector2(-dirVec.y, dirVec.x).multiplyScalar(wobbleVal));
      const prev = material.uniforms.uOffset.value;

      material.uniforms.uSeed.value = layer.seed;
      material.uniforms.uSpeed.value = layer.speed;
      material.uniforms.uDir.value.set(layer.dir[0], layer.dir[1]);
      prev.x = THREE.MathUtils.lerp(prev.x, totalOffset.x, 0.12);
      prev.y = THREE.MathUtils.lerp(prev.y, totalOffset.y, 0.12);
      material.uniforms.uTime.value = cloudTimeRef.current;
    });

    if (groupRef.current) {
      const base =
        groupRef.current.userData.basePosition ??
        new THREE.Vector3().fromArray(position);
      groupRef.current.userData.basePosition = base;
      groupRef.current.position.lerp(base, THREE.MathUtils.clamp(1 - Math.exp(-6 * safeDelta), 0, 1));
      groupRef.current.lookAt(camera.position.x, groupRef.current.position.y, camera.position.z);
    }

    if (debug && Math.floor(state.clock.getElapsedTime()) % 4 === 0) {
      console.log("[CloudFloating] velocity", localVelSmoothedRef.current.toFixed(3));
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {layers.map((cfg, idx) => (
        <mesh key={cfg.key} position={cfg.position} scale={cfg.scale} rotation={cfg.rotation}>
          <planeGeometry args={[6, 4, 8, 8]} />
          <shaderMaterial
            ref={(material) => {
              matRefs.current[idx] = material as CloudMaterial | null;
            }}
            blending={THREE.NormalBlending}
            transparent
            depthWrite={false}
            depthTest
            side={THREE.DoubleSide}
            alphaTest={0.005}
            premultipliedAlpha={false}
            uniforms={{
              uTime: { value: 0 },
              uColor1: { value: new THREE.Color(color1) },
              uColor2: { value: new THREE.Color(color2) },
              uOpacity: { value: cfg.opacity },
              uSpeed: { value: cfg.speed },
              uSeed: { value: cfg.seed },
              uDir: { value: new THREE.Vector2(cfg.dir[0], cfg.dir[1]) },
              uOffset: { value: new THREE.Vector2(0, 0) },
            }}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
          />
        </mesh>
      ))}
    </group>
  );
}

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uOpacity;
uniform float uSpeed;
uniform float uSeed;
uniform vec2 uDir;
uniform vec2 uOffset;

float random(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453123); }
float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); float a=random(i); float b=random(i+vec2(1.0,0.0)); float c=random(i+vec2(0.0,1.0)); float d=random(i+vec2(1.0,1.0)); return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
float fbm(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float dist = length(uv);
  vec2 offset = uOffset;
  float time = uTime * 0.25;
  float body = fbm(uv * 6.0 + offset + uSeed * 0.058 + time * 0.02);
  float edge = fbm(uv * 19.0 + offset * 0.4 + uSeed * 0.0010 + time * 0.04);
  float blob = smoothstep(0.85, 0.2, dist - body * 0.25);
  float feather = smoothstep(0.4, 1.0, dist + edge * 0.35);
  float alpha = blob * (1.0 - feather) * uOpacity;
  alpha = max(alpha, 0.0005);
  alpha *= smoothstep(0.8, 0.35, length(uv));
  vec3 baseCol = mix(uColor1, uColor2, vUv.y + body * 0.15);
  gl_FragColor = vec4(baseCol, alpha);
}
`;
