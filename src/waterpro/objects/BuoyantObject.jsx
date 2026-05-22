"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Vector3 } from "three";
import { updateBuoyantBody } from "../sim/buoyancy";

const sampleNames = ["center", "front", "back", "left", "right"];

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

export default function BuoyantObject({
  simulation,
  sampler,
  waterParams,
  children,
  initialPosition,
  position,
  mass = 1,
  buoyancy = 1,
  waterDrag = 0.82,
  floatOffset = 0.04,
  tiltStrength = 0.75,
  sampleRadius = 0.16,
  canSink = false,
  sinkAfter = Infinity,
  sinkSpeed = 0.08,
  debug = false,
  radius = 0.12,
}) {
  const groupRef = useRef(null);
  const sampleRefs = useRef([]);
  const velocityRef = useRef(new Vector3());
  const ageRef = useRef(0);
  const startVector = useMemo(
    () => toVector3(position ?? initialPosition, [0, 0.08, 0]),
    [initialPosition, position],
  );
  const debugColor = useMemo(() => new Color("#f7fff5"), []);

  useEffect(() => {
    const group = groupRef.current;

    ageRef.current = 0;
    velocityRef.current.set(0, 0, 0);

    if (group) {
      group.position.copy(startVector);
      group.rotation.set(0, group.rotation.y, 0);
    }
  }, [startVector]);

  useFrame((state, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    ageRef.current += delta;
    const time = simulation?.time ?? state.clock.elapsedTime;
    const result = updateBuoyantBody({
      object: group,
      velocity: velocityRef.current,
      sampler: sampler ?? simulation?.sampler,
      simulation,
      time,
      delta,
      params: waterParams,
      mass,
      buoyancy,
      waterDrag,
      floatOffset,
      tiltStrength,
      sampleRadius,
      canSink,
      sinkAfter,
      sinkSpeed,
      age: ageRef.current,
    });

    if (debug && result?.samples) {
      result.samples.forEach((sample, index) => {
        const marker = sampleRefs.current[index];

        if (marker) {
          marker.position.set(sample.x, sample.waterHeight + 0.018, sample.z);
        }
      });
    }
  });

  return (
    <>
      <group ref={groupRef} position={startVector}>
        {children ?? (
          <mesh>
            <sphereGeometry args={[radius, 24, 12]} />
            <meshStandardMaterial color="#e6c28d" roughness={0.48} metalness={0.04} />
          </mesh>
        )}
      </group>

      {debug
        ? sampleNames.map((name, index) => (
            <mesh
              key={name}
              ref={(node) => {
                sampleRefs.current[index] = node;
              }}
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
