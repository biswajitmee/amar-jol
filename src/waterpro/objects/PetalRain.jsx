"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import {
  Box3,
  BufferGeometry,
  Color,
  Matrix4,
  MathUtils,
  Mesh,
  Quaternion,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { sampleWaterHeight, updateBuoyantBody } from "../sim/buoyancy";

export const HERO_PETAL_MODEL_URL = "/models/flower_petal_hero_wet.glb";
const PETAL_MODEL_URL = HERO_PETAL_MODEL_URL;
const MAX_PETAL_POOL_SIZE = 3;
const RECTANGLE_START_HEIGHT = 1.28;
const PETAL_CONTACT_WIDTH = 1.55;
const PETAL_CONTACT_LENGTH = 2.18;
const PETAL_MODEL_ROTATION_X = Math.PI / 2;
const PETAL_PLANE_NORMAL = new Vector3(0, 0, 1);
const UP_NORMAL = new Vector3(0, 1, 0);
const CONTACT_CLEARANCE = 0.012;
const CONTACT_SETTLE_RELEASE_START = 0.18;
const CONTACT_SETTLE_DURATION = 0.68;
const PETAL_MODEL_ROTATION_MATRIX = new Matrix4().makeRotationX(
  PETAL_MODEL_ROTATION_X,
);
const DEFAULT_CONTACT_FOOTPRINT = {
  minX: -PETAL_CONTACT_WIDTH / 2,
  maxX: PETAL_CONTACT_WIDTH / 2,
  minY: -PETAL_CONTACT_LENGTH / 2,
  maxY: PETAL_CONTACT_LENGTH / 2,
};
const tempPoint = new Vector3();
const tempContactOffset = new Vector3();
const tempAnchorOffset = new Vector3();
const sampleNames = ["center", "front", "back", "left", "right"];
const contactSamples = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [0.5, 0.5],
  [0.5, 0],
  [0.5, 1],
  [0, 0.5],
  [1, 0.5],
];

const defaultPetalRainSettings = {
  enabled: true,
  activePetalCount: 2,
  spawnRadius: 0.92,
  spawnHeightOffset: 0.88,
  minScale: 0.11,
  maxScale: 0.16,
  fallSpeed: 0.24,
  driftStrength: 0.055,
  rotationSpeed: 0.72,
  respawnDelay: 1.75,
  showSpawnBoundary: false,
};

function isMesh(object) {
  return object instanceof Mesh || object?.isMesh === true;
}

function cloneMaterial(material) {
  if (Array.isArray(material)) {
    return material.map((entry) => cloneMaterial(entry));
  }

  const clone = material?.clone?.() ?? material;

  if (clone) {
    clone.transparent = clone.transparent || clone.opacity < 1;
    clone.needsUpdate = true;
  }

  return clone;
}

function collectMaterials(material, materials) {
  if (Array.isArray(material)) {
    material.forEach((entry) => collectMaterials(entry, materials));
    return;
  }

  if (material && !materials.includes(material)) {
    materials.push(material);
  }
}

function makePetalContactFootprint(scene) {
  scene.updateMatrixWorld(true);

  const box = new Box3().setFromObject(scene);

  if (box.isEmpty()) {
    return DEFAULT_CONTACT_FOOTPRINT;
  }

  const footprint = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };

  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        tempPoint
          .set(x, y, z)
          .applyMatrix4(PETAL_MODEL_ROTATION_MATRIX);
        footprint.minX = Math.min(footprint.minX, tempPoint.x);
        footprint.maxX = Math.max(footprint.maxX, tempPoint.x);
        footprint.minY = Math.min(footprint.minY, tempPoint.y);
        footprint.maxY = Math.max(footprint.maxY, tempPoint.y);
      }
    }
  }

  return Number.isFinite(footprint.minX) &&
    Number.isFinite(footprint.maxX) &&
    Number.isFinite(footprint.minY) &&
    Number.isFinite(footprint.maxY)
    ? footprint
    : DEFAULT_CONTACT_FOOTPRINT;
}

function setContactOffset(target, footprint, sample, scale) {
  const bounds = footprint ?? DEFAULT_CONTACT_FOOTPRINT;
  const safeScale = Math.max(0.001, scale);

  target.set(
    MathUtils.lerp(bounds.minX, bounds.maxX, sample[0]) * safeScale,
    MathUtils.lerp(bounds.minY, bounds.maxY, sample[1]) * safeScale,
    0,
  );

  return target;
}

function getContactSampleRadius(footprint, scale) {
  const bounds = footprint ?? DEFAULT_CONTACT_FOOTPRINT;
  const safeScale = Math.max(0.001, scale);

  return (
    Math.max(
      Math.abs(bounds.minX),
      Math.abs(bounds.maxX),
      Math.abs(bounds.minY),
      Math.abs(bounds.maxY),
    ) * safeScale
  );
}

export function clonePetalScene(sourceScene) {
  const scene = sourceScene.clone(true);
  const materials = [];

  scene.traverse((child) => {
    if (!isMesh(child)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
    child.renderOrder = 36;
    child.material = cloneMaterial(child.material);
    collectMaterials(child.material, materials);
  });

  return {
    scene,
    materials,
    contactFootprint: makePetalContactFootprint(scene),
  };
}

function makeSpawnBoundaryGeometry(radius) {
  const safeRadius = Math.max(0.05, radius);
  const points = [];

  for (let index = 0; index < 128; index += 1) {
    const angle = (index / 128) * Math.PI * 2;
    points.push(
      new Vector3(
        Math.cos(angle) * safeRadius,
        0,
        Math.sin(angle) * safeRadius,
      ),
    );
  }

  return new BufferGeometry().setFromPoints(points);
}

function getRandomRange(min, max) {
  return min + Math.random() * (max - min);
}

function sanitizeSettings(values) {
  const minScale = Math.max(0.01, Math.min(values.minScale, values.maxScale));
  const maxScale = Math.max(minScale, values.maxScale);

  return {
    enabled: Boolean(values.enabled),
    activePetalCount: MathUtils.clamp(
      Math.round(values.activePetalCount),
      1,
      MAX_PETAL_POOL_SIZE,
    ),
    spawnRadius: Math.max(0.12, values.spawnRadius),
    spawnHeightOffset: Math.max(0.1, values.spawnHeightOffset),
    minScale,
    maxScale,
    fallSpeed: Math.max(0.04, values.fallSpeed),
    driftStrength: Math.max(0, values.driftStrength),
    rotationSpeed: Math.max(0, values.rotationSpeed),
    respawnDelay: Math.max(0, values.respawnDelay),
    showSpawnBoundary: Boolean(values.showSpawnBoundary),
  };
}

function pickSpawnPoint(settings) {
  const radius = Math.max(0.12, settings.spawnRadius);
  const lane = Math.floor(Math.random() * 3);
  const spread = 0.72;
  const angle =
    lane === 0
      ? Math.PI + getRandomRange(-spread, spread)
      : lane === 1
        ? getRandomRange(-spread, spread)
        : -Math.PI / 2 + getRandomRange(-spread, spread);
  const distance = radius * getRandomRange(0.45, 1);
  let x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;

  if (Math.abs(x) < radius * 0.2) {
    x += (Math.random() < 0.5 ? -1 : 1) * radius * 0.22;
  }

  return {
    x,
    z,
    y: RECTANGLE_START_HEIGHT + settings.spawnHeightOffset,
  };
}

function findWaterContact({
  object,
  sampler,
  simulation,
  time,
  params,
  footprint,
  scale,
}) {
  let bestContact = null;

  for (const sample of contactSamples) {
    setContactOffset(tempContactOffset, footprint, sample, scale);
    tempPoint.copy(tempContactOffset);
    tempPoint.applyQuaternion(object.quaternion);
    tempPoint.add(object.position);

    const waterHeight = sampleWaterHeight({
      sampler,
      simulation,
      x: tempPoint.x,
      z: tempPoint.z,
      time,
      params,
    });
    const penetration = waterHeight - tempPoint.y;

    if (!bestContact || penetration > bestContact.penetration) {
      bestContact = {
        point: tempPoint.clone(),
        localOffset: tempContactOffset.clone(),
        waterHeight,
        penetration,
      };
    }
  }

  return bestContact;
}

function pinPetalContactToAnchor({
  object,
  petalState,
  sampler,
  simulation,
  time,
  params,
  alpha,
}) {
  if (!petalState.hasContactAnchor || alpha <= 0) {
    return;
  }

  tempAnchorOffset
    .copy(petalState.contactOffset)
    .applyQuaternion(object.quaternion);

  const anchor = petalState.impactAnchor;
  const waterHeight = sampleWaterHeight({
    sampler,
    simulation,
    x: anchor.x,
    z: anchor.z,
    time,
    params,
  });
  const targetX = anchor.x - tempAnchorOffset.x;
  const targetY = waterHeight + CONTACT_CLEARANCE - tempAnchorOffset.y;
  const targetZ = anchor.z - tempAnchorOffset.z;
  const safeAlpha = MathUtils.clamp(alpha, 0, 1);

  object.position.x = MathUtils.lerp(object.position.x, targetX, safeAlpha);
  object.position.y = MathUtils.lerp(object.position.y, targetY, safeAlpha);
  object.position.z = MathUtils.lerp(object.position.z, targetZ, safeAlpha);
}

function setModelOpacity(materials, opacity) {
  materials.forEach((material) => {
    material.transparent = true;
    material.opacity = opacity;
    material.needsUpdate = true;
  });
}

function resetPetal({ object, petalState, settings, index, materials }) {
  const scale = getRandomRange(settings.minScale, settings.maxScale);
  const spawn = pickSpawnPoint(settings);
  const seed = Math.random() * 1000 + index * 37;

  petalState.mode = "falling";
  petalState.age = 0;
  petalState.wait = 0;
  petalState.seed = seed;
  petalState.scale = scale;
  petalState.yaw = getRandomRange(-Math.PI, Math.PI);
  petalState.hasContactAnchor = false;
  petalState.impactAnchor.set(0, 0, 0);
  petalState.contactOffset.set(0, 0, 0);
  petalState.spin.set(
    getRandomRange(-0.65, 0.65),
    getRandomRange(-1.1, 1.1),
    getRandomRange(-0.8, 0.8),
  );
  petalState.velocity.set(
    Math.sin(seed) * settings.driftStrength * 0.22,
    -settings.fallSpeed,
    Math.cos(seed * 1.7) * settings.driftStrength * 0.2,
  );

  object.visible = true;
  object.position.set(spawn.x, spawn.y, spawn.z);
  object.rotation.set(
    getRandomRange(-0.26, 0.26),
    petalState.yaw,
    getRandomRange(-0.42, 0.42),
  );
  object.scale.setScalar(scale);
  setModelOpacity(materials, 1);
}

function PetalRainInstance({
  index,
  petal,
  settingsRef,
  simulation,
  sampler,
  waterParams,
  impactRadius,
  debug,
}) {
  const objectRef = useRef(null);
  const sampleRefs = useRef([]);
  const alignQuatRef = useRef(new Quaternion());
  const yawQuatRef = useRef(new Quaternion());
  const targetQuatRef = useRef(new Quaternion());
  const surfaceNormalRef = useRef(new Vector3());
  const debugColor = useMemo(() => new Color("#f8fff5"), []);
  const stateRef = useRef({
    mode: "waiting",
    age: 0,
    wait: index * 1.2,
    seed: Math.random() * 1000,
    scale: defaultPetalRainSettings.minScale,
    yaw: Math.random() * Math.PI * 2,
    spin: new Vector3(),
    velocity: new Vector3(),
    impactAnchor: new Vector3(),
    contactOffset: new Vector3(),
    hasContactAnchor: false,
  });

  function updateSampleMarkers(samples) {
    if (!debug) {
      return;
    }

    sampleRefs.current.forEach((marker, sampleIndex) => {
      if (!marker) {
        return;
      }

      const sample = samples?.[sampleIndex];
      marker.visible = Boolean(sample);

      if (sample) {
        marker.position.set(sample.x, sample.waterHeight + 0.018, sample.z);
      }
    });
  }

  useFrame((frameState, delta) => {
    const object = objectRef.current;
    const settings = settingsRef.current;
    const petalState = stateRef.current;
    const isActive = settings.enabled && index < settings.activePetalCount;

    if (!object || !isActive) {
      if (object) {
        object.visible = false;
      }

      updateSampleMarkers(null);
      petalState.mode = "waiting";
      petalState.age = 0;
      petalState.wait = Math.max(petalState.wait, settings.respawnDelay);
      return;
    }

    const time = frameState.clock.elapsedTime;
    const params = waterParams ?? {};
    const safeDelta = Math.min(delta, 1 / 20);
    const contactSampleRadius = getContactSampleRadius(
      petal.contactFootprint,
      petalState.scale,
    );

    petalState.age += safeDelta;

    if (petalState.mode === "waiting") {
      object.visible = false;
      updateSampleMarkers(null);
      petalState.wait -= safeDelta;

      if (petalState.wait <= 0) {
        resetPetal({
          object,
          petalState,
          settings,
          index,
          materials: petal.materials,
        });
      }

      return;
    }

    object.visible = true;

    if (petalState.mode === "falling") {
      updateSampleMarkers(null);

      const fallSpeed = Math.max(0.04, settings.fallSpeed);
      const gravity = fallSpeed * 1.05;
      const terminalFallSpeed = Math.max(fallSpeed * 1.75, 0.24);
      const windX =
        Math.sin(time * 0.7 + petalState.seed) +
        Math.sin(time * 1.4 + petalState.seed * 0.31) * 0.35;
      const windZ =
        Math.cos(time * 0.58 + petalState.seed * 1.17) +
        Math.sin(time * 1.18 + petalState.seed) * 0.25;

      petalState.velocity.y = Math.max(
        petalState.velocity.y - gravity * safeDelta,
        -terminalFallSpeed,
      );
      petalState.velocity.x += windX * settings.driftStrength * safeDelta;
      petalState.velocity.z += windZ * settings.driftStrength * safeDelta;
      petalState.velocity.x *= Math.pow(0.987, safeDelta * 60);
      petalState.velocity.z *= Math.pow(0.987, safeDelta * 60);
      object.position.addScaledVector(petalState.velocity, safeDelta);
      object.rotation.x +=
        (petalState.spin.x + Math.sin(time * 0.82 + petalState.seed) * 0.24) *
        settings.rotationSpeed *
        safeDelta;
      object.rotation.y += petalState.spin.y * settings.rotationSpeed * safeDelta;
      object.rotation.z +=
        (petalState.spin.z + Math.cos(time * 0.7 + petalState.seed) * 0.18) *
        settings.rotationSpeed *
        safeDelta;

      const contact = findWaterContact({
        object,
        sampler,
        simulation,
        time,
        params,
        footprint: petal.contactFootprint,
        scale: petalState.scale,
      });

      if (contact.penetration >= 0) {
        const impactPoint = contact.point.clone();
        const impactVelocity = petalState.velocity.clone();
        const impactAmount =
          0.32 *
          MathUtils.clamp(
            Math.abs(impactVelocity.y) / Math.max(0.2, fallSpeed),
            0.45,
            1.65,
          );
        const foamOpacity = MathUtils.clamp(impactAmount * 1.38, 0.28, 1);
        const radius = impactRadius * MathUtils.clamp(petalState.scale / 0.13, 0.72, 1.35);
        const impactRecord = {
          x: impactPoint.x,
          z: impactPoint.z,
          worldX: impactPoint.x,
          worldZ: impactPoint.z,
          time,
          strength: impactAmount,
          radius,
          foamOpacity,
          foamRadius: radius * 1.18,
          foamLifetime: 2.05,
          foamExpansion: radius * 1.05,
        };

        petalState.impactAnchor.copy(impactPoint);
        petalState.contactOffset.copy(contact.localOffset);
        petalState.hasContactAnchor = true;
        pinPetalContactToAnchor({
          object,
          petalState,
          sampler,
          simulation,
          time,
          params,
          alpha: 1,
        });
        petalState.mode = "floating";
        petalState.age = 0;
        petalState.velocity.set(
          impactVelocity.x * 0.08,
          Math.max(0.012, impactAmount * 0.08),
          impactVelocity.z * 0.08,
        );
        simulation?.emitImpact(impactRecord);
        simulation?.emitFoam({
          x: impactPoint.x,
          z: impactPoint.z,
          time,
          kind: "impact",
          strength: impactAmount * 0.8,
          radius: radius * 1.22,
          foamOpacity: foamOpacity * 0.9,
          foamRadius: radius * 1.26,
          foamLifetime: 1.75,
          foamExpansion: radius * 0.86,
        });
      }

      return;
    }

    if (petalState.mode === "floating") {
      const anchorHold = petalState.hasContactAnchor
        ? 1 -
          MathUtils.smoothstep(
            petalState.age,
            CONTACT_SETTLE_RELEASE_START,
            CONTACT_SETTLE_DURATION,
          )
        : 0;
      const buoyancyResult = updateBuoyantBody({
        object,
        velocity: petalState.velocity,
        sampler,
        simulation,
        time,
        delta: safeDelta,
        params,
        mass: 0.32,
        buoyancy: 1,
        waterDrag: 0.86,
        floatOffset: 0.017,
        tiltStrength: 0,
        sampleRadius: contactSampleRadius * 0.7,
        gravity: 0.2,
        verticalDamping: 0.84,
        applyRotation: false,
      });
      updateSampleMarkers(buoyancyResult?.samples);

      object.position.x +=
        Math.sin(time * 0.46 + petalState.seed) *
        settings.driftStrength *
        0.12 *
        (1 - anchorHold) *
        safeDelta;
      object.position.z +=
        Math.cos(time * 0.42 + petalState.seed * 1.2) *
        settings.driftStrength *
        0.12 *
        (1 - anchorHold) *
        safeDelta;

      surfaceNormalRef.current.copy(buoyancyResult?.normal ?? UP_NORMAL);
      if (surfaceNormalRef.current.lengthSq() === 0) {
        surfaceNormalRef.current.copy(UP_NORMAL);
      } else {
        surfaceNormalRef.current.normalize();
      }
      alignQuatRef.current.setFromUnitVectors(PETAL_PLANE_NORMAL, surfaceNormalRef.current);
      yawQuatRef.current.setFromAxisAngle(surfaceNormalRef.current, petalState.yaw);
      targetQuatRef.current.copy(yawQuatRef.current).multiply(alignQuatRef.current);
      object.quaternion.slerp(targetQuatRef.current, 1 - Math.pow(0.08, safeDelta * 60));
      pinPetalContactToAnchor({
        object,
        petalState,
        sampler,
        simulation,
        time,
        params,
        alpha: anchorHold,
      });
      petalState.yaw += safeDelta * settings.rotationSpeed * 0.12;

      simulation?.emitFoam({
        x: object.position.x,
        z: object.position.z,
        time,
        kind: "trail",
        strength: 0.014,
        radius: impactRadius * 0.46,
      });

      if (petalState.age > 5.2 + (petalState.seed % 1.8)) {
        petalState.mode = "sinking";
        petalState.age = 0;
        petalState.velocity.set(
          Math.sin(petalState.seed * 2.1) * 0.025,
          -0.035,
          Math.cos(petalState.seed * 1.9) * 0.025,
        );
      }

      return;
    }

    updateSampleMarkers(null);
    petalState.velocity.x +=
      Math.sin(time * 0.62 + petalState.seed * 2.4) *
      settings.driftStrength *
      0.18 *
      safeDelta;
    petalState.velocity.z +=
      Math.cos(time * 0.5 + petalState.seed * 1.8) *
      settings.driftStrength *
      0.18 *
      safeDelta;
    petalState.velocity.y = -0.045;
    petalState.velocity.multiplyScalar(Math.pow(0.97, safeDelta * 60));
    object.position.addScaledVector(petalState.velocity, safeDelta);
    object.rotation.x += safeDelta * 0.22;
    object.rotation.y += safeDelta * 0.16;
    object.rotation.z += safeDelta * 0.12;
    setModelOpacity(
      petal.materials,
      MathUtils.damp(petal.materials[0]?.opacity ?? 1, 0.36, 2.6, safeDelta),
    );

    if (petalState.age > 1.8) {
      object.visible = false;
      petalState.mode = "waiting";
      petalState.age = 0;
      petalState.wait = settings.respawnDelay * getRandomRange(0.7, 1.35);
    }
  });

  return (
    <>
      <group ref={objectRef} visible={false}>
        <primitive
          object={petal.scene}
          rotation={[PETAL_MODEL_ROTATION_X, 0, 0]}
          dispose={null}
        />
      </group>
      {debug
        ? sampleNames.map((name, sampleIndex) => (
            <mesh
              key={name}
              ref={(node) => {
                sampleRefs.current[sampleIndex] = node;
              }}
              visible={false}
              renderOrder={82}
              frustumCulled={false}
            >
              <sphereGeometry args={[0.014, 10, 8]} />
              <meshBasicMaterial color={debugColor} toneMapped={false} />
            </mesh>
          ))
        : null}
    </>
  );
}

function SpawnBoundaryCircle({ radius, visible, boundaryRef }) {
  const geometry = useMemo(() => makeSpawnBoundaryGeometry(radius), [radius]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <lineLoop
      ref={boundaryRef}
      geometry={geometry}
      position={[0, 0.07, 0]}
      visible={visible}
      renderOrder={88}
      frustumCulled={false}
    >
      <lineBasicMaterial
        color="#fff7d6"
        transparent
        opacity={0.72}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </lineLoop>
  );
}

function usePetalRainControls(debug) {
  const [values] = useControls(
    "Petal Rain",
    () => ({
      enabled: {
        value: defaultPetalRainSettings.enabled,
        label: "Enabled",
      },
      activePetalCount: {
        value: defaultPetalRainSettings.activePetalCount,
        min: 1,
        max: 3,
        step: 1,
        label: "Active petals",
      },
      spawnRadius: {
        value: defaultPetalRainSettings.spawnRadius,
        min: 0.2,
        max: 2.1,
        step: 0.01,
        label: "Spawn radius",
      },
      spawnHeightOffset: {
        value: defaultPetalRainSettings.spawnHeightOffset,
        min: 0.1,
        max: 2.4,
        step: 0.01,
        label: "Height offset",
      },
      minScale: {
        value: defaultPetalRainSettings.minScale,
        min: 0.04,
        max: 0.42,
        step: 0.005,
        label: "Min scale",
      },
      maxScale: {
        value: defaultPetalRainSettings.maxScale,
        min: 0.04,
        max: 0.5,
        step: 0.005,
        label: "Max scale",
      },
      fallSpeed: {
        value: defaultPetalRainSettings.fallSpeed,
        min: 0.06,
        max: 0.72,
        step: 0.01,
        label: "Fall speed",
      },
      driftStrength: {
        value: defaultPetalRainSettings.driftStrength,
        min: 0,
        max: 0.22,
        step: 0.005,
        label: "Drift",
      },
      rotationSpeed: {
        value: defaultPetalRainSettings.rotationSpeed,
        min: 0,
        max: 2.4,
        step: 0.01,
        label: "Rotation",
      },
      respawnDelay: {
        value: defaultPetalRainSettings.respawnDelay,
        min: 0,
        max: 8,
        step: 0.05,
        label: "Respawn delay",
      },
      showSpawnBoundary: {
        value: defaultPetalRainSettings.showSpawnBoundary,
        label: "Spawn boundary",
      },
    }),
    { collapsed: true, order: 2 },
    [],
  );

  return debug ? values : defaultPetalRainSettings;
}

export default function PetalRain({
  simulation,
  sampler,
  waterParams,
  impactRadius = 0.16,
  debug = false,
  spawnBoundaryRef,
}) {
  const gltf = useLoader(GLTFLoader, PETAL_MODEL_URL);
  const controls = usePetalRainControls(debug);
  const settings = sanitizeSettings(controls);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const petals = useMemo(
    () =>
      Array.from({ length: MAX_PETAL_POOL_SIZE }, () =>
        clonePetalScene(gltf.scene),
      ),
    [gltf.scene],
  );

  useEffect(() => {
    return () => {
      petals.forEach((petal) => {
        petal.materials.forEach((material) => material.dispose());
      });
    };
  }, [petals]);

  return (
    <>
      <SpawnBoundaryCircle
        radius={settings.spawnRadius}
        visible={debug && settings.enabled && settings.showSpawnBoundary}
        boundaryRef={spawnBoundaryRef}
      />
      {petals.map((petal, index) => (
        <PetalRainInstance
          key={index}
          index={index}
          petal={petal}
          settingsRef={settingsRef}
          simulation={simulation}
          sampler={sampler}
          waterParams={waterParams}
          impactRadius={impactRadius}
          debug={debug && waterParams?.showBuoyancySamplePoints}
        />
      ))}
    </>
  );
}

useLoader.preload(GLTFLoader, PETAL_MODEL_URL);
