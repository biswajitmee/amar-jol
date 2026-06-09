"use client";

import React, { useMemo } from "react";
import { extend, useFrame } from "@react-three/fiber";
import type { ThreeElement, ThreeElements } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

const frag = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uAngle;
uniform float uUseWedge;
uniform float uBand;
uniform float uFeather;
uniform float uPieceCount;
uniform float uWidthFracMin;
uniform float uWidthFracMax;
uniform float uStripHeight;
uniform float uLaneJitterY;
uniform float uOverlapChance;
uniform float uClusterSpreadX;
uniform float uDriftAmpMin;
uniform float uDriftAmpMax;
uniform float uDriftHzMin;
uniform float uDriftHzMax;
uniform float uPieceFeatherX;
uniform float uPieceFeatherY;
uniform float uSeed;
uniform vec2 uCircleCenter;
uniform float uCircleRadius;
uniform float uCircleFeather;
uniform vec3 uColorCenter;
uniform vec3 uColorEdge;
uniform float uAlphaXPower;
uniform float uXColorBias;
uniform float uHColorFreq;
uniform float uHColorSpeed;
uniform float uHColorAmp;
uniform float uShimmerAmp;
uniform float uShimmerScale;
uniform float uShimmerSpeed;
uniform float uEndFeatherTop;
uniform float uEndFeatherBottom;
uniform float uEndPower;
#define MAX_PIECES 32
const float TAU = 6.28318530718;
vec2 rot2(vec2 p, float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c)*p; }
float hash11(float x){ return fract(sin(x)*43758.5453123); }
float softRect(vec2 uv, vec2 c, vec2 h, vec2 f){
  vec2 d = abs(uv - c) - h;
  vec2 m = 1.0 - smoothstep(vec2(0.0), f, d);
  return clamp(min(m.x, m.y), 0.0, 1.0);
}
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=fract(sin(dot(i, vec2(127.1,311.7)))*43758.5453);
  float b=fract(sin(dot(i+vec2(1.,0.), vec2(127.1,311.7)))*43758.5453);
  float c=fract(sin(dot(i+vec2(0.,1.), vec2(127.1,311.7)))*43758.5453);
  float d=fract(sin(dot(i+vec2(1.,1.), vec2(127.1,311.7)))*43758.5453);
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){ float v=0., a=0.5; for(int i=0;i<4;i++){ v+=a*vnoise(p); p*=2.02; a*=0.5; } return v; }
void main(){
  vec2 uv0 = vUv - 0.5;
  vec2 uv  = rot2(uv0, uAngle);
  float d = length(uv - uCircleCenter);
  float circleMask = smoothstep(uCircleRadius + uCircleFeather, uCircleRadius, d);
  float wedge = 1.0;
  if (uUseWedge > 0.5){
    float halfBand = max(1e-4, 0.5 * uBand);
    float A = smoothstep(-halfBand - uFeather, -halfBand, uv.x);
    float B = smoothstep( halfBand + uFeather,  halfBand,  uv.x);
    wedge = A * B;
  }
  float span = max(1e-4, (uBand * 0.5) + uFeather);
  float xNorm = clamp(0.5 + (uv.x/(2.0*span)) + (uXColorBias - 0.5), 0.0, 1.0);
  float centerWeight = clamp(1.0 - abs(uv.x)/span, 0.0, 1.0);
  float alphaAcross  = pow(centerWeight, max(0.001, uAlphaXPower));
  vec3 colStatic = mix(uColorEdge, uColorCenter, xNorm);
  float hPhase = TAU * (uHColorFreq * uv.x + uHColorSpeed * uTime + (uSeed*0.017));
  float hWave = 0.5 + 0.5 * cos(hPhase);
  vec3 colWave = mix(uColorEdge, uColorCenter, hWave);
  vec3 colX = mix(colStatic, colWave, clamp(uHColorAmp, 0.0, 1.0));
  float Nf = clamp(uPieceCount, 1.0, float(MAX_PIECES));
  float piecesMax = 0.0;
  float piecesSum = 0.0;
  for (int i=0; i<MAX_PIECES; i++){
    if (float(i) >= Nf) break;
    float si = float(i) + uSeed * 19.73;
    float cxBase = (hash11(si*2.3)-0.5) * uClusterSpreadX;
    float ax = mix(uDriftAmpMin, uDriftAmpMax, hash11(si*3.7));
    float hz = mix(uDriftHzMin, uDriftHzMax, hash11(si*4.9));
    float ph = hash11(si*6.1) * TAU;
    float cx = cxBase + ax * sin(TAU*hz*uTime + ph);
    float ov = step(hash11(si*7.7), uOverlapChance);
    float cy = (hash11(si*8.3)-0.5) * 0.02 + (ov * (hash11(si*9.1)-0.5) * 0.06) + (uLaneJitterY * (hash11(si*10.7)-0.5));
    float wFrac = mix(uWidthFracMin, uWidthFracMax, hash11(si*11.9));
    float m = softRect(uv, vec2(cx, cy), vec2(max(0.0005, 0.5 * wFrac), max(0.0005, uStripHeight)), vec2(uPieceFeatherX, uPieceFeatherY));
    piecesMax = max(piecesMax, m);
    piecesSum += m;
  }
  float edgeW = clamp(piecesMax*(1.0-piecesMax)*4.0, 0.0, 1.0);
  float shimmer = 1.0 + (fbm(uv * uShimmerScale + vec2(0.0, uTime * uShimmerSpeed * 0.16)) - 0.5) * 0.6 * uShimmerAmp * edgeW;
  float density = clamp(piecesSum * (1.0 / max(1.0, Nf*0.6)), 0.0, 1.0);
  vec3 colDark = mix(colX, colX * 0.6, density);
  float maskTop = smoothstep(0.0, uEndFeatherTop, 0.5 - uv.y);
  float maskBottom = smoothstep(0.0, uEndFeatherBottom, uv.y + 0.5);
  float endMask = pow(maskTop * maskBottom, max(0.001, uEndPower));
  float brightness = wedge * piecesMax * circleMask * alphaAcross * shimmer * endMask;
  brightness *= (1.0 - 0.35 * density);
  vec3 col = mix(colDark, uColor, 0.12);
  gl_FragColor = vec4(col * (brightness * uIntensity), brightness);
}
`;

const SingleBeamMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#A265C1"),
    uIntensity: 0.32,
    uAngle: 0,
    uUseWedge: 1,
    uBand: 0.7,
    uFeather: 0.12,
    uPieceCount: 32,
    uWidthFracMin: 0.01,
    uWidthFracMax: 0.02,
    uStripHeight: 0.88,
    uLaneJitterY: 0.01,
    uOverlapChance: 0.65,
    uClusterSpreadX: 0.2,
    uDriftAmpMin: 0.004,
    uDriftAmpMax: 0.012,
    uDriftHzMin: 0.25,
    uDriftHzMax: 0.7,
    uPieceFeatherX: 0.01,
    uPieceFeatherY: 0.02,
    uSeed: 0,
    uCircleCenter: new THREE.Vector2(0, 0),
    uCircleRadius: 0.52,
    uCircleFeather: 0.1,
    uColorCenter: new THREE.Color("#a25be5"),
    uColorEdge: new THREE.Color("#301046"),
    uAlphaXPower: 1.6,
    uXColorBias: 0.5,
    uHColorFreq: 1.2,
    uHColorSpeed: 0.24,
    uHColorAmp: 0.6,
    uShimmerAmp: 0,
    uShimmerScale: 6.3,
    uShimmerSpeed: 2 * Math.PI * 8,
    uEndFeatherTop: 0.12,
    uEndFeatherBottom: 0.12,
    uEndPower: 1,
  },
  vert,
  frag,
);

extend({ SingleBeamMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    singleBeamMaterial: ThreeElement<typeof SingleBeamMaterial>;
  }
}

type BeamMaterial = THREE.ShaderMaterial & Record<string, any>;

type ShaderSingleBeamProps = ThreeElements["group"] & {
  size?: [number, number];
  slices?: number;
  gap?: number;
  color?: string;
  intensity?: number;
  timeScale?: number;
  angleDeg?: number;
  ringRadius?: number;
  faceCenter?: boolean;
  pieceCount?: number;
  pieceWidthMin?: number;
  pieceWidthMax?: number;
  stripHeightUV?: number;
  laneJitterYUV?: number;
  overlapChance?: number;
  clusterSpreadXUV?: number;
  driftAmpX?: [number, number];
  driftHz?: [number, number];
  pieceFeatherXUV?: number;
  pieceFeatherYUV?: number;
  circleCenterUV?: [number, number];
  circleRadiusUV?: number;
  circleFeatherUV?: number;
  colorCenter?: string;
  colorEdge?: string;
  alphaXPower?: number;
  xColorBias?: number;
  hColorFreq?: number;
  hColorSpeed?: number;
  hColorAmp?: number;
  useWedge?: boolean;
  endFeatherTopUV?: number;
  endFeatherBottomUV?: number;
  endPower?: number;
  seedOffset?: number;
  renderOrderBase?: number;
  shimmerAmp?: number;
  shimmerHz?: number;
  shimmerScale?: number;
};

export default function ShaderSingleBeam({
  size = [220, 120],
  slices = 15,
  gap = 3,
  color = "#7b2aa4",
  intensity = 0.22,
  timeScale = 0.5,
  angleDeg = 0,
  ringRadius = 0,
  faceCenter = true,
  pieceCount = 15,
  pieceWidthMin = 24,
  pieceWidthMax = 24,
  stripHeightUV = 0.48,
  laneJitterYUV = 0.01,
  overlapChance = 0.85,
  clusterSpreadXUV = 0.2,
  driftAmpX = [0.004, 0.012],
  driftHz = [0.25, 0.7],
  pieceFeatherXUV = 0.01,
  pieceFeatherYUV = 0.02,
  circleCenterUV = [0, 0],
  circleRadiusUV = 0.52,
  circleFeatherUV = 0.1,
  colorCenter = "#a25be5",
  colorEdge = "#301046",
  alphaXPower = 1,
  xColorBias = 0.5,
  hColorFreq = 1.2,
  hColorSpeed = 0.24,
  hColorAmp = 0.6,
  useWedge = true,
  endFeatherTopUV = 0.12,
  endFeatherBottomUV = 0.52,
  endPower = 1.8,
  seedOffset = 0,
  renderOrderBase = 5,
  shimmerAmp,
  shimmerHz,
  shimmerScale,
  ...props
}: ShaderSingleBeamProps) {
  const mats = useMemo(
    () => Array.from({ length: slices }, () => React.createRef<BeamMaterial>()),
    [slices],
  );

  useFrame((state) => {
    const time = state.clock.getElapsedTime() * timeScale;

    mats.forEach((matRef, index) => {
      const material = matRef.current;
      if (!material) return;

      material.uTime = time;
      material.uColor = new THREE.Color(color);
      material.uIntensity = intensity;
      material.uAngle = THREE.MathUtils.degToRad(angleDeg);
      material.uSeed = seedOffset + index * 1.2345;
      material.uPieceCount = pieceCount;
      material.uWidthFracMin = Math.max(0.0005, pieceWidthMin / size[0]);
      material.uWidthFracMax = Math.max(0.0006, pieceWidthMax / size[0]);
      material.uStripHeight = stripHeightUV;
      material.uLaneJitterY = laneJitterYUV;
      material.uOverlapChance = overlapChance;
      material.uClusterSpreadX = clusterSpreadXUV;
      material.uDriftAmpMin = driftAmpX[0];
      material.uDriftAmpMax = driftAmpX[1];
      material.uDriftHzMin = driftHz[0];
      material.uDriftHzMax = driftHz[1];
      material.uPieceFeatherX = pieceFeatherXUV;
      material.uPieceFeatherY = pieceFeatherYUV;
      material.uCircleCenter.set(circleCenterUV[0], circleCenterUV[1]);
      material.uCircleRadius = circleRadiusUV;
      material.uCircleFeather = circleFeatherUV;
      material.uColorCenter.set(colorCenter);
      material.uColorEdge.set(colorEdge);
      material.uAlphaXPower = alphaXPower;
      material.uXColorBias = xColorBias;
      material.uHColorFreq = hColorFreq;
      material.uHColorSpeed = hColorSpeed;
      material.uHColorAmp = hColorAmp;
      material.uUseWedge = useWedge ? 1 : 0;
      material.uEndFeatherTop = endFeatherTopUV;
      material.uEndFeatherBottom = endFeatherBottomUV;
      material.uEndPower = endPower;
      if (shimmerAmp !== undefined) material.uShimmerAmp = shimmerAmp;
      if (shimmerScale !== undefined) material.uShimmerScale = shimmerScale;
      if (shimmerHz !== undefined) material.uShimmerSpeed = 2 * Math.PI * shimmerHz;
    });
  });

  const ringPositions = useMemo(() => {
    if (!ringRadius || ringRadius <= 0) return null;

    return Array.from({ length: slices }, (_, i) => {
      const theta = (i / slices) * Math.PI * 2;
      return [Math.cos(theta) * ringRadius, 0, Math.sin(theta) * ringRadius] as [number, number, number];
    });
  }, [ringRadius, slices]);

  return (
    <group {...props}>
      {Array.from({ length: slices }).map((_, i) => {
        const pos = ringPositions
          ? ringPositions[i]
          : ([0, 0, -(i - (slices - 1) * 0.5) * gap] as [number, number, number]);
        const rot =
          ringPositions && faceCenter
            ? ([0, Math.atan2(-pos[0], -pos[2]), 0] as [number, number, number])
            : ([0, 0, 0] as [number, number, number]);

        return (
          <mesh key={i} position={pos} rotation={rot} frustumCulled={false} renderOrder={renderOrderBase}>
            <planeGeometry args={[size[0], size[1], 1, 1]} />
            <singleBeamMaterial
              ref={mats[i]}
              transparent
              side={THREE.DoubleSide}
              depthTest={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
