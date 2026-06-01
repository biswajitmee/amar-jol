"use client";

import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Matrix4,
  MathUtils,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  getDeploymentHeroLevaValue,
  isProductionDeployment,
} from "../debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "../debug/heroLevaPresetRegistry";

const MAX_BUBBLES = 900;
const PATH_SEGMENTS = 180;
const PI2 = Math.PI * 2;
const UP = new Vector3(0, 1, 0);

const defaultHelixaBubblePathSettings = {
  visible: true,
  bubbleCount: 70,
  radius: 0.72,
  height: 50.85,
  turns: 0.05,
  depthScale: 0.56,
  startAngle: 164,
  pathJitter: 0.30,
  spawnSpread: 0.22,
  riseHeight: 80.50,
  riseSpeed: 0.14,
  wobble: 0.45,
  bubbleSize: 0.25,
  sizeVariation: 0.85,
  opacity: 0.80,
  bubbleColor: "#dffcff",
  showPath: false,
  pathOpacity: 0.3,
  pathColor: "#bdfcff",
};

const HELIXA_BUBBLE_PATH_PRESET_KEYS = Object.keys(
  defaultHelixaBubblePathSettings,
);

const bubbleVertexShader = `
precision highp float;

uniform float uTime;
uniform float uSize;
uniform float uRiseHeight;
uniform float uRiseSpeed;
uniform float uWobble;
uniform float uOpacity;
uniform vec3 uRiseDirection;

attribute float aSeed;
attribute float aCycleOffset;
attribute float aRiseScale;
attribute float aSizeScale;

varying float vAlpha;
varying float vRing;

void main() {
  float speed = uRiseSpeed * mix(0.72, 1.34, fract(aSeed * 19.71));
  float t = fract(aCycleOffset + uTime * speed);
  float fadeIn = smoothstep(0.0, 0.12, t);
  float fadeOut = 1.0 - smoothstep(0.72, 1.0, t);
  float wobbleGrow = 0.16 + t * 0.92;

  vec3 animated = position;
  animated += uRiseDirection * t * uRiseHeight * aRiseScale;
  animated.x += sin(t * 7.4 + aSeed * 41.0) * uWobble * wobbleGrow;
  animated.z += cos(t * 6.8 + aSeed * 29.0) * uWobble * wobbleGrow;

  vAlpha = fadeIn * fadeOut * uOpacity;
  vRing = mix(0.31, 0.43, fract(aSeed * 11.47));

  vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * aSizeScale * (420.0 / max(1.0, -mvPosition.z));
}
`;

const bubbleFragmentShader = `
precision highp float;

uniform vec3 uColor;

varying float vAlpha;
varying float vRing;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float rimInner = smoothstep(vRing - 0.08, vRing - 0.015, d);
  float rimOuter = 1.0 - smoothstep(vRing + 0.015, vRing + 0.08, d);
  float rim = rimInner * rimOuter;
  float core = (1.0 - smoothstep(0.04, 0.42, d)) * 0.16;
  float edgeFade = 1.0 - smoothstep(0.48, 0.5, d);
  float alpha = (rim + core) * vAlpha * edgeFade;

  gl_FragColor = vec4(uColor, alpha);
}
`;

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function seededUnit(index, salt) {
  const value =
    Math.sin((index + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;

  return value - Math.floor(value);
}

function sanitizeSettings(values) {
  return {
    visible: Boolean(values.visible),
    bubbleCount: MathUtils.clamp(
      Math.round(values.bubbleCount),
      1,
      MAX_BUBBLES,
    ),
    radius: Math.max(0.02, values.radius),
    height: Math.max(0.05, values.height),
    turns: Math.max(0.05, values.turns),
    depthScale: Math.max(0.02, values.depthScale),
    startAngle: values.startAngle,
    pathJitter: MathUtils.clamp(values.pathJitter, 0, 1),
    spawnSpread: Math.max(0, values.spawnSpread),
    riseHeight: Math.max(0, values.riseHeight),
    riseSpeed: Math.max(0, values.riseSpeed),
    wobble: Math.max(0, values.wobble),
    bubbleSize: Math.max(0.001, values.bubbleSize),
    sizeVariation: MathUtils.clamp(values.sizeVariation, 0, 1),
    opacity: MathUtils.clamp(values.opacity, 0, 1),
    bubbleColor: values.bubbleColor || defaultHelixaBubblePathSettings.bubbleColor,
    showPath: Boolean(values.showPath),
    pathOpacity: MathUtils.clamp(values.pathOpacity, 0, 1),
    pathColor: values.pathColor || defaultHelixaBubblePathSettings.pathColor,
  };
}

function getDeploymentHelixaBubblePathSettings() {
  return Object.fromEntries(
    Object.entries(defaultHelixaBubblePathSettings).map(([key, fallback]) => [
      key,
      getDeploymentHeroLevaValue("helixaBubblePath", key, fallback),
    ]),
  );
}

function writeHelixaPoint(progress, settings, target) {
  const p = MathUtils.clamp(progress, 0, 1);
  const angle =
    MathUtils.degToRad(settings.startAngle) + p * settings.turns * PI2;
  const radius = settings.radius;
  const depthRadius = radius * settings.depthScale;

  target.set(
    Math.cos(angle) * radius,
    (p - 0.5) * settings.height,
    Math.sin(angle) * depthRadius,
  );

  return target;
}

function writeHelixaFrame(progress, settings, center, tangent, normal, binormal) {
  const next = writeHelixaPoint(
    Math.min(1, progress + 0.006),
    settings,
    tangent,
  );

  writeHelixaPoint(progress, settings, center);
  tangent.subVectors(next, center);

  if (tangent.lengthSq() < 0.000001) {
    tangent.set(0, 1, 0);
  } else {
    tangent.normalize();
  }

  normal.crossVectors(tangent, UP);

  if (normal.lengthSq() < 0.000001) {
    normal.set(1, 0, 0);
  } else {
    normal.normalize();
  }

  binormal.crossVectors(normal, tangent);

  if (binormal.lengthSq() < 0.000001) {
    binormal.set(0, 0, 1);
  } else {
    binormal.normalize();
  }
}

function makePathGeometry(settings) {
  const point = new Vector3();
  const points = [];

  for (let index = 0; index <= PATH_SEGMENTS; index += 1) {
    writeHelixaPoint(index / PATH_SEGMENTS, settings, point);
    points.push(point.clone());
  }

  return new BufferGeometry().setFromPoints(points);
}

function makeBubbleGeometry(settings) {
  const count = settings.bubbleCount;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const cycleOffsets = new Float32Array(count);
  const riseScales = new Float32Array(count);
  const sizeScales = new Float32Array(count);
  const center = new Vector3();
  const tangent = new Vector3();
  const normal = new Vector3();
  const binormal = new Vector3();

  for (let index = 0; index < count; index += 1) {
    const seed = seededUnit(index, 1);
    const progress = wrap01(
      (index + seed * settings.pathJitter) / Math.max(1, count),
    );
    const radialAngle = seededUnit(index, 2) * PI2;
    const radialDistance = Math.sqrt(seededUnit(index, 3)) * settings.spawnSpread;

    writeHelixaFrame(progress, settings, center, tangent, normal, binormal);
    center.addScaledVector(normal, Math.cos(radialAngle) * radialDistance);
    center.addScaledVector(binormal, Math.sin(radialAngle) * radialDistance);

    positions[index * 3] = center.x;
    positions[index * 3 + 1] = center.y;
    positions[index * 3 + 2] = center.z;
    seeds[index] = seed;
    cycleOffsets[index] = seededUnit(index, 4);
    riseScales[index] = 0.7 + seededUnit(index, 5) * 0.64;
    sizeScales[index] =
      1 - settings.sizeVariation * 0.5 + seededUnit(index, 6) * settings.sizeVariation;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  geometry.setAttribute("aCycleOffset", new BufferAttribute(cycleOffsets, 1));
  geometry.setAttribute("aRiseScale", new BufferAttribute(riseScales, 1));
  geometry.setAttribute("aSizeScale", new BufferAttribute(sizeScales, 1));

  return geometry;
}

function makeBubbleMaterial(settings) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: settings.bubbleSize },
      uRiseHeight: { value: settings.riseHeight },
      uRiseSpeed: { value: settings.riseSpeed },
      uWobble: { value: settings.wobble },
      uOpacity: { value: settings.opacity },
      uRiseDirection: { value: new Vector3(0, 1, 0) },
      uColor: { value: new Color(settings.bubbleColor) },
    },
    vertexShader: bubbleVertexShader,
    fragmentShader: bubbleFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
}

function useHelixaBubblePathControls() {
  const [values, setValues] = useControls(
    "Helixa Bubble Path",
    () => ({
      visible: {
        value: defaultHelixaBubblePathSettings.visible,
        label: "visible",
      },
      bubbleCount: {
        value: defaultHelixaBubblePathSettings.bubbleCount,
        min: 1,
        max: MAX_BUBBLES,
        step: 1,
        label: "bubbleCount",
      },
      radius: {
        value: defaultHelixaBubblePathSettings.radius,
        min: 0.02,
        max: 8,
        step: 0.01,
        label: "radius",
      },
      height: {
        value: defaultHelixaBubblePathSettings.height,
        min: 0.05,
        max: 50,
        step: 0.01,
        label: "height",
      },
      turns: {
        value: defaultHelixaBubblePathSettings.turns,
        min: 0.05,
        max: 8,
        step: 0.01,
        label: "turns",
      },
      depthScale: {
        value: defaultHelixaBubblePathSettings.depthScale,
        min: 0.02,
        max: 4,
        step: 0.01,
        label: "depthScale",
      },
      startAngle: {
        value: defaultHelixaBubblePathSettings.startAngle,
        min: -360,
        max: 360,
        step: 1,
        label: "startAngle",
      },
      pathJitter: {
        value: defaultHelixaBubblePathSettings.pathJitter,
        min: 0,
        max: 1,
        step: 0.01,
        label: "pathJitter",
      },
      spawnSpread: {
        value: defaultHelixaBubblePathSettings.spawnSpread,
        min: 0,
        max: 0.5,
        step: 0.001,
        label: "spawnSpread",
      },
      riseHeight: {
        value: defaultHelixaBubblePathSettings.riseHeight,
        min: 0,
        max: 80,
        step: 0.01,
        label: "riseHeight",
      },
      riseSpeed: {
        value: defaultHelixaBubblePathSettings.riseSpeed,
        min: 0,
        max: 1.5,
        step: 0.001,
        label: "riseSpeed",
      },
      wobble: {
        value: defaultHelixaBubblePathSettings.wobble,
        min: 0,
        max: 0.6,
        step: 0.001,
        label: "wobble",
      },
      bubbleSize: {
        value: defaultHelixaBubblePathSettings.bubbleSize,
        min: 0.005,
        max: 0.24,
        step: 0.001,
        label: "bubbleSize",
      },
      sizeVariation: {
        value: defaultHelixaBubblePathSettings.sizeVariation,
        min: 0,
        max: 1,
        step: 0.01,
        label: "sizeVariation",
      },
      opacity: {
        value: defaultHelixaBubblePathSettings.opacity,
        min: 0,
        max: 1,
        step: 0.01,
        label: "opacity",
      },
      bubbleColor: {
        value: defaultHelixaBubblePathSettings.bubbleColor,
        label: "bubbleColor",
      },
      showPath: {
        value: defaultHelixaBubblePathSettings.showPath,
        label: "showPath",
      },
      pathOpacity: {
        value: defaultHelixaBubblePathSettings.pathOpacity,
        min: 0,
        max: 1,
        step: 0.01,
        label: "pathOpacity",
      },
      pathColor: {
        value: defaultHelixaBubblePathSettings.pathColor,
        label: "pathColor",
      },
    }),
    { collapsed: false, order: 3 },
    [],
  );
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    return registerHeroLevaPresetScope("helixaBubblePath", {
      getValues: () =>
        pickPresetValues(valuesRef.current, HELIXA_BUBBLE_PATH_PRESET_KEYS),
      applyValues: setValues,
    });
  }, [setValues]);

  if (isProductionDeployment()) {
    return sanitizeSettings(getDeploymentHelixaBubblePathSettings());
  }

  return sanitizeSettings(values);
}

export default function HelixaBubblePath() {
  const settings = useHelixaBubblePathControls();
  const material = useMemo(() => makeBubbleMaterial(settings), []);
  const pathGeometry = useMemo(() => makePathGeometry(settings), [
    settings.depthScale,
    settings.height,
    settings.radius,
    settings.startAngle,
    settings.turns,
  ]);
  const bubbleGeometry = useMemo(() => makeBubbleGeometry(settings), [
    settings.bubbleCount,
    settings.depthScale,
    settings.height,
    settings.pathJitter,
    settings.radius,
    settings.sizeVariation,
    settings.spawnSpread,
    settings.startAngle,
    settings.turns,
  ]);
  const pointsRef = useRef(null);
  const helpers = useMemo(
    () => ({
      inverseParent: new Matrix4(),
      localRiseDirection: new Vector3(0, 1, 0),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    return () => {
      pathGeometry.dispose();
    };
  }, [pathGeometry]);

  useEffect(() => {
    return () => {
      bubbleGeometry.dispose();
    };
  }, [bubbleGeometry]);

  useFrame(({ clock }) => {
    const points = pointsRef.current;

    if (!points) {
      return;
    }

    points.visible = settings.visible;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uSize.value = settings.bubbleSize;
    material.uniforms.uRiseHeight.value = settings.riseHeight;
    material.uniforms.uRiseSpeed.value = settings.riseSpeed;
    material.uniforms.uWobble.value = settings.wobble;
    material.uniforms.uOpacity.value = settings.opacity;
    material.uniforms.uColor.value.set(settings.bubbleColor);

    if (points.parent) {
      points.parent.updateWorldMatrix(true, false);
      helpers.inverseParent.copy(points.parent.matrixWorld).invert();
      helpers.localRiseDirection
        .set(0, 1, 0)
        .transformDirection(helpers.inverseParent);
      material.uniforms.uRiseDirection.value.copy(helpers.localRiseDirection);
    } else {
      material.uniforms.uRiseDirection.value.set(0, 1, 0);
    }
  });

  return (
    <group visible={settings.visible} frustumCulled={false}>
      <line
        geometry={pathGeometry}
        visible={settings.showPath}
        renderOrder={91}
        frustumCulled={false}
      >
        <lineBasicMaterial
          color={settings.pathColor}
          transparent
          opacity={settings.pathOpacity}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </line>
      <points
        ref={pointsRef}
        geometry={bubbleGeometry}
        material={material}
        renderOrder={78}
        frustumCulled={false}
      />
    </group>
  );
}
