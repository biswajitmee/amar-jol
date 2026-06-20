"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type Vector3Tuple = [number, number, number];

type TextWheelProps = {
  texts?: string[];
  reverse?: boolean;
  cursorY?: number;
  yOffset?: number;
  position?: Vector3Tuple;
  fontUrl?: string;
  radius?: number;
  fontSize?: number;
  color?: string;
  constantRotationSpeed?: number;
  scrollRotationSpeed?: number;
  dampingFactor?: number;
};

export default function TextWheel({
  texts = [],
  reverse = false,
  cursorY = 0,
  yOffset = 0,
  position = [0, 0, 0],
  fontUrl = "/horizontal-gallery/10mal12Lampen.ttf",
  radius = 20,
  fontSize = 2.2,
  color = "#000000",
  constantRotationSpeed,
  scrollRotationSpeed = 0.0002,
  dampingFactor = 0.35,
}: TextWheelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rotationVelocity = useRef(0);
  const baseRotationSpeed =
    constantRotationSpeed ?? (reverse ? -0.002 : 0.002);
  const letters = useMemo(() => texts.join("").split(""), [texts]);

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
    group.position.set(position[0], position[1] + yOffset + cursorY * 0.5, position[2]);
  });

  if (letters.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef} position={position}>
      {letters.map((letter, index) => {
        const angle = (index / letters.length) * Math.PI * 2;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        return (
          <Text
            anchorX="center"
            anchorY="middle"
            color={color}
            font={fontUrl}
            fontSize={fontSize}
            key={`${letter}-${index}`}
            position={[x, 0, z]}
            rotation={[0, Math.atan2(x, z), 0]}
          >
            {letter}
          </Text>
        );
      })}
    </group>
  );
}
