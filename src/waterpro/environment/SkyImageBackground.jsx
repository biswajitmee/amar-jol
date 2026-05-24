"use client";

import { useThree } from "@react-three/fiber";
import { folder, useControls } from "leva";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import {
  getDeploymentHeroLevaValue,
  isProductionDeployment,
} from "../debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "../debug/heroLevaPresetRegistry";

export const DEFAULT_SKY_TEXTURE_PATH = "/waterpro/sky-blue-clouds-large.png";
const SKY_BACKGROUND_PRESET_KEYS = [
  "enabled",
  "skyTexturePath",
  "positionX",
  "positionY",
  "positionZ",
  "scaleX",
  "scaleY",
  "scaleZ",
  "rotationX",
  "rotationY",
  "rotationZ",
  "curvature",
  "horizonOffset",
  "opacity",
  "brightness",
  "tint",
];

function getDeploymentSkyControls(skyTexturePath) {
  return {
    enabled: getDeploymentHeroLevaValue("skyBackground", "enabled", true),
    skyTexturePath: getDeploymentHeroLevaValue(
      "skyBackground",
      "skyTexturePath",
      skyTexturePath,
    ),
    positionX: getDeploymentHeroLevaValue("skyBackground", "positionX", 0),
    positionY: getDeploymentHeroLevaValue("skyBackground", "positionY", 8.4),
    positionZ: getDeploymentHeroLevaValue("skyBackground", "positionZ", -44),
    scaleX: getDeploymentHeroLevaValue("skyBackground", "scaleX", 190),
    scaleY: getDeploymentHeroLevaValue("skyBackground", "scaleY", 88),
    scaleZ: getDeploymentHeroLevaValue("skyBackground", "scaleZ", 190),
    rotationX: getDeploymentHeroLevaValue("skyBackground", "rotationX", 0),
    rotationY: getDeploymentHeroLevaValue("skyBackground", "rotationY", 0),
    rotationZ: getDeploymentHeroLevaValue("skyBackground", "rotationZ", 0),
    curvature: getDeploymentHeroLevaValue("skyBackground", "curvature", 0.1),
    horizonOffset: getDeploymentHeroLevaValue(
      "skyBackground",
      "horizonOffset",
      0,
    ),
    opacity: getDeploymentHeroLevaValue("skyBackground", "opacity", 1),
    brightness: getDeploymentHeroLevaValue("skyBackground", "brightness", 1),
    tint: getDeploymentHeroLevaValue("skyBackground", "tint", "#ffffff"),
  };
}

function createCurvedBackdropGeometry(curvature) {
  const widthSegments = 44;
  const heightSegments = 8;
  const safeCurvature = MathUtils.clamp(curvature, 0, 1);
  const arc = MathUtils.lerp(0.001, Math.PI * 0.95, safeCurvature);
  const radius = 1 / (2 * Math.sin(arc / 2));
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let yIndex = 0; yIndex <= heightSegments; yIndex += 1) {
    const v = yIndex / heightSegments;
    const y = v - 0.5;

    for (let xIndex = 0; xIndex <= widthSegments; xIndex += 1) {
      const u = xIndex / widthSegments;
      const theta = (u - 0.5) * arc;
      const x = Math.sin(theta) * radius;
      const z = (Math.cos(theta) - 1) * radius;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let yIndex = 0; yIndex < heightSegments; yIndex += 1) {
    for (let xIndex = 0; xIndex < widthSegments; xIndex += 1) {
      const a = yIndex * (widthSegments + 1) + xIndex;
      const b = a + 1;
      const c = a + widthSegments + 1;
      const d = c + 1;

      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function useManagedTexture(texturePath, horizonOffset) {
  const { gl } = useThree();
  const [texture, setTexture] = useState(null);
  const activeTextureRef = useRef(null);

  useEffect(() => {
    const cleanPath = String(texturePath ?? "").trim();

    if (!cleanPath) {
      setTexture((previousTexture) => {
        previousTexture?.dispose();
        activeTextureRef.current = null;
        return null;
      });
      return undefined;
    }

    let cancelled = false;
    const loader = new TextureLoader();

    loader.load(
      cleanPath,
      (loadedTexture) => {
        if (cancelled) {
          loadedTexture.dispose();
          return;
        }

        loadedTexture.colorSpace = SRGBColorSpace;
        loadedTexture.wrapS = ClampToEdgeWrapping;
        loadedTexture.wrapT = ClampToEdgeWrapping;
        loadedTexture.minFilter = LinearMipmapLinearFilter;
        loadedTexture.magFilter = LinearFilter;
        loadedTexture.generateMipmaps = true;
        loadedTexture.anisotropy = Math.min(
          8,
          gl.capabilities?.getMaxAnisotropy?.() ?? 1,
        );
        loadedTexture.needsUpdate = true;

        setTexture((previousTexture) => {
          if (previousTexture && previousTexture !== loadedTexture) {
            previousTexture.dispose();
          }

          activeTextureRef.current = loadedTexture;
          return loadedTexture;
        });
      },
      undefined,
      (error) => {
        console.warn(`Sky image failed to load: ${cleanPath}`, error);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [gl, texturePath]);

  useEffect(() => {
    if (!texture) {
      return;
    }

    texture.offset.y = horizonOffset;
    texture.needsUpdate = true;
  }, [horizonOffset, texture]);

  useEffect(() => {
    return () => {
      activeTextureRef.current?.dispose();
      activeTextureRef.current = null;
    };
  }, []);

  return texture;
}

function SkyImageBackgroundControls({
  skyTexturePath = DEFAULT_SKY_TEXTURE_PATH,
}) {
  const [controls, setControls] = useControls(
    "Sky Background",
    () => ({
      enabled: getDeploymentHeroLevaValue("skyBackground", "enabled", true),
      skyTexturePath: {
        value: getDeploymentHeroLevaValue(
          "skyBackground",
          "skyTexturePath",
          skyTexturePath,
        ),
        label: "Texture path",
      },
      Placement: folder(
        {
          positionX: {
            value: getDeploymentHeroLevaValue("skyBackground", "positionX", 0),
            min: -160,
            max: 160,
            step: 0.01,
            label: "Position X",
          },
          positionY: {
            value: getDeploymentHeroLevaValue(
              "skyBackground",
              "positionY",
              8.4,
            ),
            min: -80,
            max: 120,
            step: 0.01,
            label: "Position Y",
          },
          positionZ: {
            value: getDeploymentHeroLevaValue(
              "skyBackground",
              "positionZ",
              -44,
            ),
            min: -260,
            max: 24,
            step: 0.01,
            label: "Position Z",
          },
          scaleX: {
            value: getDeploymentHeroLevaValue("skyBackground", "scaleX", 190),
            min: 2,
            max: 520,
            step: 0.1,
            label: "Scale X",
          },
          scaleY: {
            value: getDeploymentHeroLevaValue("skyBackground", "scaleY", 88),
            min: 2,
            max: 280,
            step: 0.1,
            label: "Scale Y",
          },
          scaleZ: {
            value: getDeploymentHeroLevaValue("skyBackground", "scaleZ", 190),
            min: 2,
            max: 520,
            step: 0.1,
            label: "Scale Z",
          },
          rotationX: {
            value: getDeploymentHeroLevaValue("skyBackground", "rotationX", 0),
            min: -180,
            max: 180,
            step: 0.1,
            label: "Rotation X",
          },
          rotationY: {
            value: getDeploymentHeroLevaValue("skyBackground", "rotationY", 0),
            min: -180,
            max: 180,
            step: 0.1,
            label: "Rotation Y",
          },
          rotationZ: {
            value: getDeploymentHeroLevaValue("skyBackground", "rotationZ", 0),
            min: -180,
            max: 180,
            step: 0.1,
            label: "Rotation Z",
          },
          curvature: {
            value: getDeploymentHeroLevaValue(
              "skyBackground",
              "curvature",
              0.1,
            ),
            min: 0,
            max: 1,
            step: 0.01,
            label: "Curvature",
          },
          horizonOffset: {
            value: getDeploymentHeroLevaValue(
              "skyBackground",
              "horizonOffset",
              0,
            ),
            min: -0.45,
            max: 0.45,
            step: 0.001,
            label: "Horizon offset",
          },
        },
        { collapsed: false },
      ),
      Look: folder(
        {
          opacity: {
            value: getDeploymentHeroLevaValue("skyBackground", "opacity", 1),
            min: 0,
            max: 1,
            step: 0.01,
            label: "Opacity",
          },
          brightness: {
            value: getDeploymentHeroLevaValue("skyBackground", "brightness", 1),
            min: 0,
            max: 2.5,
            step: 0.01,
            label: "Brightness",
          },
          tint: {
            value: getDeploymentHeroLevaValue(
              "skyBackground",
              "tint",
              "#ffffff",
            ),
            label: "Tint",
          },
        },
        { collapsed: false },
      ),
    }),
    { collapsed: false, order: 2 },
    [skyTexturePath],
  );
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  useEffect(() => {
    return registerHeroLevaPresetScope("skyBackground", {
      getValues: () =>
        pickPresetValues(controlsRef.current, SKY_BACKGROUND_PRESET_KEYS),
      applyValues: setControls,
    });
  }, [setControls]);

  return <SkyImageBackgroundMesh controls={controls} />;
}

function SkyImageBackgroundMesh({ controls }) {
  const texture = useManagedTexture(
    controls.skyTexturePath,
    controls.horizonOffset,
  );
  const geometry = useMemo(
    () => createCurvedBackdropGeometry(controls.curvature),
    [controls.curvature],
  );
  const tintColor = useMemo(() => {
    const color = new Color(controls.tint);
    color.multiplyScalar(controls.brightness);
    return color;
  }, [controls.brightness, controls.tint]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  if (!controls.enabled || !texture) {
    return null;
  }

  return (
    <mesh
      position={[controls.positionX, controls.positionY, controls.positionZ]}
      rotation={[
        MathUtils.degToRad(controls.rotationX),
        MathUtils.degToRad(controls.rotationY),
        MathUtils.degToRad(controls.rotationZ),
      ]}
      scale={[controls.scaleX, controls.scaleY, controls.scaleZ]}
      renderOrder={-1000}
      frustumCulled={false}
    >
      <primitive attach="geometry" object={geometry} />
      <meshBasicMaterial
        map={texture}
        color={tintColor}
        transparent
        opacity={controls.opacity}
        depthTest
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}

export default function SkyImageBackground({
  skyTexturePath = DEFAULT_SKY_TEXTURE_PATH,
}) {
  if (isProductionDeployment()) {
    return (
      <SkyImageBackgroundMesh
        controls={getDeploymentSkyControls(skyTexturePath)}
      />
    );
  }

  return <SkyImageBackgroundControls skyTexturePath={skyTexturePath} />;
}
