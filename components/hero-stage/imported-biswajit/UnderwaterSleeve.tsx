"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type UnderwaterSleeveProps = {
  topY?: number;
  depth?: number;
  radius?: number;
  closeBottom?: boolean;
  topColor?: string;
  bottomColor?: string;
  onlyWhenUnderwater?: boolean;
  opacity?: number;
};

function makeVerticalGradientTexture({
  width = 2048,
  height = 2048,
  top = "#8E79BE",
  bottom = "#2E264C",
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.Texture();
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export default function UnderwaterSleeve({
  topY = -0.12,
  depth = 12000,
  radius = 5000,
  closeBottom = true,
  topColor = "#4D2E69",
  bottomColor = "#4D2E69",
  onlyWhenUnderwater = false,
  opacity = 0.42,
}: UnderwaterSleeveProps) {
  const { camera } = useThree();
  const cylRef = useRef<THREE.Mesh>(null);
  const capRef = useRef<THREE.Mesh>(null);

  const gradTex = useMemo(
    () => makeVerticalGradientTexture({ top: topColor, bottom: bottomColor }),
    [bottomColor, topColor],
  );

  const height = depth;
  const centerY = topY - height / 2;
  const bottomY = topY - depth;

  const cylGeom = useMemo(
    () => new THREE.CylinderGeometry(radius, radius, height, 96, 1, true),
    [height, radius],
  );
  const cylMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: gradTex,
        side: THREE.BackSide,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [gradTex, opacity],
  );

  const capGeom = useMemo(
    () => new THREE.CircleGeometry(radius * 0.998, 128),
    [radius],
  );
  const capMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: bottomColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [bottomColor, opacity],
  );

  useFrame(() => {
    if (!cylRef.current) return;

    const visible = !onlyWhenUnderwater || camera.position.y < 0;
    cylRef.current.visible = visible;
    cylRef.current.position.set(camera.position.x, centerY, camera.position.z);

    if (capRef.current) {
      capRef.current.visible = visible;
      capRef.current.position.set(camera.position.x, bottomY, camera.position.z);
    }
  });

  return (
    <>
      <mesh
        ref={cylRef}
        geometry={cylGeom}
        material={cylMat}
        frustumCulled={false}
        renderOrder={-100}
      />
      {closeBottom ? (
        <mesh
          ref={capRef}
          geometry={capGeom}
          material={capMat}
          rotation-x={-Math.PI / 2}
          frustumCulled={false}
          renderOrder={-100}
        />
      ) : null}
    </>
  );
}
