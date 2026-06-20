"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type Vector3Tuple = [number, number, number];

type HalfRollProps = {
  images: string[];
  reverse?: boolean;
  cursorY?: number;
  yOffset?: number;
  position?: Vector3Tuple;
  radius?: number;
  planeSize?: [number, number];
  bendRadius?: number;
  bendStrength?: number;
  constantRotationSpeed?: number;
  scrollRotationSpeed?: number;
  dampingFactor?: number;
  onImageClick?: (src: string) => void;
};

type HalfRollImageProps = {
  src: string;
  index: number;
  imageCount: number;
  radius: number;
  planeSize: [number, number];
  bendRadius: number;
  bendStrength: number;
  onImageClick?: (src: string) => void;
};

function HalfRollImage({
  src,
  index,
  imageCount,
  radius,
  planeSize,
  bendRadius,
  bendStrength,
  onImageClick,
}: HalfRollImageProps) {
  const texture = useLoader(THREE.TextureLoader, src);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(planeSize[0], planeSize[1], 100, 100);
    const positions = plane.attributes.position;

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const bendAngle = (x / Math.max(bendStrength, 0.001)) * Math.PI;
      const nextZ = -bendRadius * (1 - Math.cos(bendAngle));
      const nextX = bendRadius * Math.sin(bendAngle);

      positions.setXYZ(i, nextX, y, nextZ);
    }

    positions.needsUpdate = true;
    plane.computeVertexNormals();

    return plane;
  }, [bendRadius, bendStrength, planeSize]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const angle = (index / imageCount) * Math.PI * 2;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;

  return (
    <mesh
      geometry={geometry}
      onClick={(event) => {
        event.stopPropagation();
        onImageClick?.(src);
      }}
      position={[x, 0, z]}
      rotation={[0, Math.atan2(x, z), 0]}
    >
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function HalfRoll({
  images,
  reverse = false,
  cursorY = 0,
  yOffset = 0,
  position = [0, 0, 0],
  radius = 18,
  planeSize = [3, 8],
  bendRadius = 12,
  bendStrength = 8,
  constantRotationSpeed,
  scrollRotationSpeed = 0.00002,
  dampingFactor = 0.95,
  onImageClick,
}: HalfRollProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rotationVelocity = useRef(0);
  const baseRotationSpeed =
    constantRotationSpeed ?? (reverse ? -0.0002 : 0.0002);

  useEffect(() => {
    const handleScroll = (event: WheelEvent) => {
      rotationVelocity.current += event.deltaY * scrollRotationSpeed;
    };

    window.addEventListener("wheel", handleScroll, { passive: true });

    return () => window.removeEventListener("wheel", handleScroll);
  }, [scrollRotationSpeed]);

  useFrame(() => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    rotationVelocity.current *= dampingFactor;
    rotationVelocity.current += baseRotationSpeed;
    group.rotation.y += rotationVelocity.current;

    group.position.set(position[0], position[1] + yOffset + cursorY * 0.1, position[2]);
  });

  return (
    <group ref={groupRef} position={position}>
      {images.map((src, index) => (
        <HalfRollImage
          key={`${src}-${index}`}
          bendRadius={bendRadius}
          bendStrength={bendStrength}
          imageCount={images.length}
          index={index}
          onImageClick={onImageClick}
          planeSize={planeSize}
          radius={radius}
          src={src}
        />
      ))}
    </group>
  );
}
