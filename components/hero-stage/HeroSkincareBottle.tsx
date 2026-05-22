"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  Group,
  MathUtils,
  SRGBColorSpace,
} from "three";
import type { HeroBottleSettings } from "./HeroBottleTypes";

type HeroSkincareBottleProps = {
  settings: HeroBottleSettings;
};

function makeBottleLabelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const context = canvas.getContext("2d");

  if (!context) {
    return new CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "rgba(255, 246, 231, 0.94)");
  gradient.addColorStop(1, "rgba(238, 215, 192, 0.82)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(166, 118, 82, 0.34)";
  context.lineWidth = 8;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  context.fillStyle = "#5f4739";
  context.textAlign = "center";
  context.letterSpacing = "4px";
  context.font = "52px Georgia, serif";
  context.fillText("LUMIERE", canvas.width * 0.5, 230);

  context.letterSpacing = "2px";
  context.font = "20px Arial, sans-serif";
  context.fillText("DE LA MER", canvas.width * 0.5, 278);

  context.strokeStyle = "rgba(95, 71, 57, 0.45)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(128, 306);
  context.lineTo(384, 306);
  context.stroke();

  context.font = "24px Arial, sans-serif";
  context.fillText("RADIANCE RENEWAL", canvas.width * 0.5, 496);
  context.font = "22px Arial, sans-serif";
  context.fillText("SERUM", canvas.width * 0.5, 532);
  context.font = "16px Arial, sans-serif";
  context.fillText("LUMIERE GLOW COMPLEX", canvas.width * 0.5, 586);

  context.strokeStyle = "rgba(167, 128, 89, 0.5)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(canvas.width * 0.5, 392, 44, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(canvas.width * 0.5, 348);
  context.lineTo(canvas.width * 0.5, 436);
  context.moveTo(canvas.width * 0.5 - 44, 392);
  context.lineTo(canvas.width * 0.5 + 44, 392);
  context.stroke();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  return texture;
}

export default function HeroSkincareBottle({ settings }: HeroSkincareBottleProps) {
  const groupRef = useRef<Group>(null);
  const labelTexture = useMemo(() => makeBottleLabelTexture(), []);

  useEffect(() => {
    return () => {
      labelTexture.dispose();
    };
  }, [labelTexture]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const time = clock.elapsedTime;
    groupRef.current.visible = settings.showBottle;
    groupRef.current.position.set(
      settings.bottleX,
      settings.bottleY + Math.sin(time * 0.55) * 0.018,
      settings.bottleZ,
    );
    groupRef.current.scale.setScalar(settings.bottleScale);
    groupRef.current.rotation.set(
      MathUtils.degToRad(settings.bottleRotationX ?? 0),
      MathUtils.degToRad(settings.bottleRotationY ?? 0) +
        Math.sin(time * 0.18) * 0.035,
      MathUtils.degToRad(settings.bottleRotationZ ?? 0),
    );
  });

  if (!settings.showBottle) {
    return null;
  }

  return (
    <group ref={groupRef} renderOrder={32}>
      <mesh position={[0, 1.18, 0]} renderOrder={32}>
        <cylinderGeometry args={[0.42, 0.47, 2.28, 72, 8]} />
        <meshPhysicalMaterial
          color="#f3ddc4"
          roughness={0.42}
          metalness={0.03}
          transmission={0.32}
          thickness={0.42}
          transparent
          opacity={settings.bottleOpacity}
          clearcoat={0.82}
          clearcoatRoughness={0.18}
          ior={1.42}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.08, 0]} renderOrder={33}>
        <cylinderGeometry args={[0.47, 0.47, 0.11, 72, 1]} />
        <meshPhysicalMaterial
          color="#fff1dc"
          roughness={0.18}
          metalness={0.02}
          transparent
          opacity={0.68}
          clearcoat={1}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 2.36, 0]} renderOrder={33}>
        <cylinderGeometry args={[0.27, 0.35, 0.32, 72, 1]} />
        <meshPhysicalMaterial
          color="#efd1ac"
          roughness={0.28}
          metalness={0.1}
          transparent
          opacity={0.78}
          clearcoat={0.9}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 2.9, 0]} renderOrder={34}>
        <cylinderGeometry args={[0.32, 0.34, 0.78, 96, 1]} />
        <meshStandardMaterial
          color="#d7a166"
          roughness={0.18}
          metalness={0.92}
          envMapIntensity={1.7}
        />
      </mesh>

      <mesh position={[0, 3.31, 0]} renderOrder={35}>
        <cylinderGeometry args={[0.33, 0.33, 0.055, 96, 1]} />
        <meshStandardMaterial color="#ffe0ac" roughness={0.16} metalness={0.95} />
      </mesh>

      <mesh position={[0, 1.28, 0.474]} renderOrder={36}>
        <planeGeometry args={[0.72, 1.08]} />
        <meshBasicMaterial
          map={labelTexture}
          transparent
          opacity={0.88}
          side={DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
