"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

type SandSurfaceProps = {
  textureUrl: string;
  size?: number;
};

export default function SandSurface({
  textureUrl,
  size = 20000,
}: SandSurfaceProps) {
  const [sandTex, setSandTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();

    setSandTex(null);
    loader.load(
      textureUrl,
      (texture) => {
        loadedTexture = texture;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(size / 200, size / 200);
        texture.anisotropy = 8;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        if (active) {
          setSandTex(texture);
        } else {
          texture.dispose();
        }
      },
      undefined,
      () => {
        if (active) {
          setSandTex(null);
        }
      },
    );

    return () => {
      active = false;
      loadedTexture?.dispose();
    };
  }, [size, textureUrl]);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial
        color={sandTex ? "white" : "#c9b79a"}
        map={sandTex}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}
