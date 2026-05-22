"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, Vector3 } from "three";
import { computeBuoyancy, computeSurfaceRotation } from "../sim/buoyancy";

export default function FloatingLeaf({
  simulation,
  sampler,
  initialPosition = [0, 0.04, 0],
  size = 0.14,
  color = "#c86f4d",
}) {
  const meshRef = useRef(null);
  const velocityRef = useRef(new Vector3());
  const seedRef = useRef(Math.random() * 100);

  useFrame((state, delta) => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    const time = simulation?.time ?? state.clock.elapsedTime;
    computeBuoyancy({
      position: mesh.position,
      velocity: velocityRef.current,
      sampler,
      time,
      delta,
      floatOffset: 0.018,
      stiffness: 8.5,
      damping: 0.84,
    });
    const surfaceRotation = computeSurfaceRotation({
      sampler,
      x: mesh.position.x,
      z: mesh.position.z,
      time,
      intensity: 0.7,
    });

    mesh.rotation.x = surfaceRotation.x;
    mesh.rotation.z = surfaceRotation.z;
    mesh.rotation.y += delta * 0.35;
    mesh.position.x += Math.sin(time * 0.5 + seedRef.current) * 0.012 * delta;
    mesh.position.z += Math.cos(time * 0.42 + seedRef.current) * 0.012 * delta;
    simulation?.emitFoam({
      x: mesh.position.x,
      z: mesh.position.z,
      strength: 0.045,
      radius: 0.025,
    });
  });

  return (
    <mesh ref={meshRef} position={initialPosition} renderOrder={35} frustumCulled={false}>
      <planeGeometry args={[size, size * 1.5, 4, 4]} />
      <meshStandardMaterial
        color={color}
        side={DoubleSide}
        roughness={0.75}
        transparent
        opacity={0.82}
        depthWrite={false}
      />
    </mesh>
  );
}
