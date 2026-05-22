"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  MathUtils,
  Quaternion,
  Vector3,
} from "three";
import { sampleWaterHeight, updateBuoyantBody } from "../sim/buoyancy";

const LEAF_WIDTH = 0.13;
const LEAF_LENGTH = 0.23;
const PLANE_NORMAL = new Vector3(0, 0, 1);
const UP_NORMAL = new Vector3(0, 1, 0);
const sampleNames = ["center", "front", "back", "left", "right"];
const contactSamples = [
  [-0.5, -0.5],
  [0.5, -0.5],
  [-0.5, 0.5],
  [0.5, 0.5],
  [0, 0],
];

function toVector3(value, fallback) {
  if (value instanceof Vector3) {
    return value.clone();
  }

  return new Vector3(
    value?.[0] ?? fallback[0],
    value?.[1] ?? fallback[1],
    value?.[2] ?? fallback[2],
  );
}

function toScaleArray(value) {
  if (value instanceof Vector3) {
    return [
      Math.max(0.001, value.x),
      Math.max(0.001, value.y),
      Math.max(0.001, value.z),
    ];
  }

  if (Array.isArray(value)) {
    return [
      Math.max(0.001, value[0] ?? 1),
      Math.max(0.001, value[1] ?? value[0] ?? 1),
      Math.max(0.001, value[2] ?? 1),
    ];
  }

  const scalar = Math.max(0.001, value ?? 1);
  return [scalar, scalar, scalar];
}

function findWaterContact({
  mesh,
  sampler,
  simulation,
  time,
  params,
  halfWidth,
  halfLength,
}) {
  let bestContact = null;

  for (const sample of contactSamples) {
    const point = new Vector3(sample[0] * halfWidth, sample[1] * halfLength, 0);
    point.applyQuaternion(mesh.quaternion);
    point.add(mesh.position);

    const waterHeight = sampleWaterHeight({
      sampler,
      simulation,
      x: point.x,
      z: point.z,
      time,
      params,
    });
    const penetration = waterHeight - point.y;

    if (!bestContact || penetration > bestContact.penetration) {
      bestContact = {
        point,
        waterHeight,
        penetration,
      };
    }
  }

  return bestContact;
}

export default function FallingLeaf({
  simulation,
  sampler,
  waterParams,
  startPosition,
  initialPosition,
  scale = 1,
  fallSpeed = 0.38,
  windStrength = 0.08,
  buoyancy = 1,
  sinkDelay = 4.2,
  sinkSpeed = 0.09,
  impactStrength = 0.35,
  onImpact,
  color = "#d47c5a",
  impactRadius = 0.055,
  texture = null,
  debug = false,
}) {
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const sampleRefs = useRef([]);
  const alignQuatRef = useRef(new Quaternion());
  const yawQuatRef = useRef(new Quaternion());
  const targetQuatRef = useRef(new Quaternion());
  const surfaceNormalRef = useRef(new Vector3());
  const startVector = useMemo(
    () => toVector3(startPosition ?? initialPosition, [0, 1.2, 0]),
    [initialPosition, startPosition],
  );
  const scaleArray = useMemo(() => toScaleArray(scale), [scale]);
  const startKey = `${startVector.x}|${startVector.y}|${startVector.z}|${fallSpeed}`;
  const stateRef = useRef({
    mode: "falling",
    age: 0,
    seed: Math.random() * 100,
    yaw: Math.random() * Math.PI * 2,
    spin: MathUtils.randFloat(0.65, 1.2),
    velocity: new Vector3(),
  });
  const materialColor = useMemo(() => new Color(color), [color]);
  const debugColor = useMemo(() => new Color("#f7fff5"), []);

  function updateSampleMarkers(samples) {
    if (!debug) {
      return;
    }

    sampleRefs.current.forEach((marker, index) => {
      if (!marker) {
        return;
      }

      const sample = samples?.[index];
      marker.visible = Boolean(sample);

      if (sample) {
        marker.position.set(sample.x, sample.waterHeight + 0.018, sample.z);
      }
    });
  }

  useEffect(() => {
    const mesh = meshRef.current;
    const leafState = stateRef.current;

    leafState.mode = "falling";
    leafState.age = 0;
    leafState.yaw = leafState.seed * 0.37;
    leafState.velocity.set(
      Math.sin(leafState.seed) * windStrength * 0.12,
      -Math.abs(fallSpeed),
      Math.cos(leafState.seed * 1.7) * windStrength * 0.12,
    );

    if (mesh) {
      mesh.position.copy(startVector);
      mesh.rotation.set(0, leafState.yaw, 0);
    }

    if (materialRef.current) {
      materialRef.current.opacity = 0.9;
    }
  }, [fallSpeed, startKey, startVector, windStrength]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    const leafState = stateRef.current;
    const time = state.clock.elapsedTime;
    const params = waterParams ?? {};
    const halfWidth = (LEAF_WIDTH * scaleArray[0]) / 2;
    const halfLength = (LEAF_LENGTH * scaleArray[1]) / 2;
    const wind = Math.max(0, windStrength);
    const buoyancyAmount = Math.max(0.05, buoyancy);
    leafState.age += delta;

    if (leafState.mode === "falling") {
      updateSampleMarkers(null);

      const gravity = Math.max(0.35, Math.abs(fallSpeed) * 1.85);
      const terminalFallSpeed = Math.max(0.55, Math.abs(fallSpeed) * 2.8);
      const windX =
        Math.sin(time * 0.9 + leafState.seed) +
        Math.sin(time * 2.15 + leafState.seed * 0.43) * 0.35;
      const windZ =
        Math.cos(time * 0.72 + leafState.seed * 1.3) +
        Math.sin(time * 1.35 + leafState.seed) * 0.28;

      leafState.velocity.y = Math.max(
        leafState.velocity.y - gravity * delta,
        -terminalFallSpeed,
      );
      leafState.velocity.x += windX * wind * delta;
      leafState.velocity.z += windZ * wind * delta;
      leafState.velocity.x *= Math.pow(0.985, delta * 60);
      leafState.velocity.z *= Math.pow(0.985, delta * 60);
      mesh.position.addScaledVector(leafState.velocity, delta);
      mesh.rotation.set(
        Math.sin(time * 2.2 + leafState.seed) * 0.86,
        leafState.yaw + time * leafState.spin,
        Math.cos(time * 1.75 + leafState.seed) * 0.72,
      );

      const contact = findWaterContact({
        mesh,
        sampler,
        simulation,
        time,
        params,
        halfWidth,
        halfLength,
      });

      if (contact.penetration >= 0) {
        const impactPoint = contact.point.clone();
        const impactVelocity = leafState.velocity.clone();
        const impactAmount =
          impactStrength *
          MathUtils.clamp(Math.abs(impactVelocity.y) / Math.max(0.2, fallSpeed), 0.45, 1.65);
        const foamOpacity = MathUtils.clamp(impactAmount * 1.38, 0.32, 1);
        const impactRecord = {
          x: impactPoint.x,
          z: impactPoint.z,
          worldX: impactPoint.x,
          worldZ: impactPoint.z,
          time,
          strength: impactAmount,
          radius: impactRadius,
          foamOpacity,
          foamRadius: impactRadius * 1.2,
          foamLifetime: 2.05,
          foamExpansion: impactRadius * 1.08,
        };

        mesh.position.y += contact.penetration + 0.01;
        leafState.mode = "floating";
        leafState.age = 0;
        leafState.velocity.set(
          impactVelocity.x * 0.32,
          Math.max(0.025, impactAmount * 0.14),
          impactVelocity.z * 0.32,
        );
        simulation?.emitImpact(impactRecord);
        simulation?.emitFoam({
          x: impactPoint.x,
          z: impactPoint.z,
          time,
          kind: "impact",
          strength: impactAmount * 0.8,
          radius: impactRadius * 1.25,
          foamOpacity: foamOpacity * 0.9,
          foamRadius: impactRadius * 1.28,
          foamLifetime: 1.75,
          foamExpansion: impactRadius * 0.86,
        });
        onImpact?.({
          ...impactRecord,
          position: impactPoint,
          waterHeight: contact.waterHeight,
          velocity: impactVelocity,
        });
      }

      return;
    }

    if (leafState.mode === "floating") {
      const buoyancyResult = updateBuoyantBody({
        object: mesh,
        velocity: leafState.velocity,
        sampler,
        simulation,
        time,
        delta,
        params,
        mass: 0.35,
        buoyancy: buoyancyAmount,
        waterDrag: 0.86,
        floatOffset: 0.018,
        tiltStrength: 0,
        sampleRadius: Math.max(halfWidth, halfLength) * 0.86,
        gravity: 0.22,
        verticalDamping: 0.84,
        applyRotation: false,
      });
      updateSampleMarkers(buoyancyResult?.samples);

      mesh.position.x +=
        Math.sin(time * 0.56 + leafState.seed) * wind * 0.18 * delta +
        leafState.velocity.x * 0.1 * delta;
      mesh.position.z +=
        Math.cos(time * 0.48 + leafState.seed * 1.2) * wind * 0.18 * delta +
        leafState.velocity.z * 0.1 * delta;

      surfaceNormalRef.current.copy(buoyancyResult?.normal ?? UP_NORMAL);
      if (surfaceNormalRef.current.lengthSq() === 0) {
        surfaceNormalRef.current.copy(UP_NORMAL);
      } else {
        surfaceNormalRef.current.normalize();
      }
      alignQuatRef.current.setFromUnitVectors(PLANE_NORMAL, surfaceNormalRef.current);
      yawQuatRef.current.setFromAxisAngle(surfaceNormalRef.current, leafState.yaw);
      targetQuatRef.current.copy(yawQuatRef.current).multiply(alignQuatRef.current);
      mesh.quaternion.slerp(targetQuatRef.current, 1 - Math.pow(0.08, delta * 60));
      leafState.yaw += delta * 0.18;

      simulation?.emitFoam({
        x: mesh.position.x,
        z: mesh.position.z,
        time,
        kind: "trail",
        strength: 0.018 * buoyancyAmount,
        radius: impactRadius * 0.55,
      });

      if (leafState.age > sinkDelay) {
        leafState.mode = "sinking";
        leafState.age = 0;
        leafState.velocity.set(
          Math.sin(leafState.seed * 2.1) * 0.035,
          -Math.max(0.01, sinkSpeed),
          Math.cos(leafState.seed * 1.9) * 0.035,
        );
      }

      return;
    }

    updateSampleMarkers(null);

    const driftX =
      Math.sin(time * 0.72 + leafState.seed * 2.4) * wind * 0.32 +
      Math.cos(time * 0.31 + leafState.seed) * 0.018;
    const driftZ =
      Math.cos(time * 0.6 + leafState.seed * 1.8) * wind * 0.32 +
      Math.sin(time * 0.28 + leafState.seed) * 0.018;

    leafState.velocity.x += driftX * delta;
    leafState.velocity.z += driftZ * delta;
    leafState.velocity.y = -Math.max(0.01, sinkSpeed);
    leafState.velocity.x *= Math.pow(0.97, delta * 60);
    leafState.velocity.z *= Math.pow(0.97, delta * 60);
    mesh.position.addScaledVector(leafState.velocity, delta);
    mesh.rotation.x += delta * 0.32;
    mesh.rotation.y += delta * 0.22;
    mesh.rotation.z += delta * 0.18;

    if (materialRef.current) {
      materialRef.current.opacity = MathUtils.lerp(
        materialRef.current.opacity,
        0.38,
        1 - Math.pow(0.035, delta),
      );
    }
  });

  return (
    <>
      <mesh
        ref={meshRef}
        position={startVector}
        scale={scaleArray}
        renderOrder={34}
        frustumCulled={false}
      >
        <planeGeometry args={[LEAF_WIDTH, LEAF_LENGTH, 2, 6]} />
        <meshStandardMaterial
          ref={materialRef}
          map={texture ?? undefined}
          color={texture ? "#ffffff" : materialColor}
          side={DoubleSide}
          roughness={0.76}
          metalness={0}
          transparent
          opacity={0.9}
          alphaTest={texture ? 0.08 : 0}
          depthWrite={false}
        />
      </mesh>

      {debug
        ? sampleNames.map((name, index) => (
            <mesh
              key={name}
              ref={(node) => {
                sampleRefs.current[index] = node;
              }}
              visible={false}
              renderOrder={80}
              frustumCulled={false}
            >
              <sphereGeometry args={[0.018, 10, 8]} />
              <meshBasicMaterial color={debugColor} toneMapped={false} />
            </mesh>
          ))
        : null}
    </>
  );
}
