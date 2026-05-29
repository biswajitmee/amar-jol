"use client";

import { useLoader } from "@react-three/fiber";
import { useControls } from "leva";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  ClampToEdgeWrapping,
  DoubleSide,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  NoColorSpace,
  Object3D,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  type Group,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  getDeploymentHeroLevaValue,
  isProductionDeployment,
} from "@/src/waterpro/debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "@/src/waterpro/debug/heroLevaPresetRegistry";

const PETAL_MODEL_URL = "/models/flower_petal_hero_wet.glb";
const PETAL_BASE_COLOR_URL =
  "/models/textures/flower_petal_hero/flower_petal_hero_basecolor.png";
const PETAL_NORMAL_URL =
  "/models/textures/flower_petal_hero/flower_petal_hero_normal.png";
const PETAL_ROUGHNESS_URL =
  "/models/textures/flower_petal_hero/flower_petal_hero_roughness.png";
const DROPLET_NAME_PATTERN = /^FlowerPetalHero_Droplet_\d{2}$/;
const PETAL_MATERIAL_PRESET_KEYS = [
  "petalColor",
  "petalRoughness",
  "petalClearcoat",
  "petalClearcoatRoughness",
  "petalSheen",
  "petalTransmission",
  "dropletTransmission",
  "dropletRoughness",
  "dropletIOR",
  "materialDebug",
] as const;

type PetalMaterialSettings = {
  petalColor: string;
  petalRoughness: number;
  petalClearcoat: number;
  petalClearcoatRoughness: number;
  petalSheen: number;
  petalTransmission: number;
  dropletTransmission: number;
  dropletRoughness: number;
  dropletIOR: number;
  materialDebug: boolean;
};

type PetalTextureSet = {
  baseColorMap: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
};

type PreparedPetalModel = {
  scene: Group;
  materials: MeshPhysicalMaterial[];
};

const defaultPetalMaterial: PetalMaterialSettings = {
  petalColor: "#fff8fa",
  petalRoughness: 0.46,
  petalClearcoat: 0.24,
  petalClearcoatRoughness: 0.32,
  petalSheen: 0.22,
  petalTransmission: 0.035,
  dropletTransmission: 0.86,
  dropletRoughness: 0.025,
  dropletIOR: 1.333,
  materialDebug: false,
};

function clamp01(value: number) {
  return MathUtils.clamp(value, 0, 1);
}

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh === true;
}

function configureTexture(
  texture: Texture,
  colorSpace: Texture["colorSpace"] = NoColorSpace,
) {
  texture.colorSpace = colorSpace;
  texture.flipY = false;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}

function makePetalMaterial(
  settings: PetalMaterialSettings,
  textures: PetalTextureSet,
) {
  const transmission = MathUtils.clamp(settings.petalTransmission, 0, 0.12);
  const material = new MeshPhysicalMaterial({
    name: "WaterPro_Browser_Petal_Physical",
    color: settings.materialDebug ? "#ff78bf" : settings.petalColor,
    map: settings.materialDebug ? undefined : textures.baseColorMap,
    normalMap: settings.materialDebug ? undefined : textures.normalMap,
    normalScale: new Vector2(0.32, 0.32),
    roughnessMap: settings.materialDebug ? undefined : textures.roughnessMap,
    metalness: 0,
    roughness: MathUtils.clamp(settings.petalRoughness, 0.22, 0.72),
    clearcoat: MathUtils.clamp(settings.petalClearcoat, 0, 0.5),
    clearcoatRoughness: MathUtils.clamp(
      settings.petalClearcoatRoughness,
      0.12,
      0.62,
    ),
    sheen: MathUtils.clamp(settings.petalSheen, 0, 0.55),
    sheenColor: "#ffe2ea",
    sheenRoughness: 0.74,
    transmission,
    thickness: 0.035,
    attenuationColor: "#ffd6c8",
    attenuationDistance: 0.9,
    ior: 1.36,
    specularColor: "#fff0e8",
    specularIntensity: settings.materialDebug ? 0.8 : 0.52,
    envMapIntensity: 0.72,
    emissive: settings.materialDebug ? "#451028" : "#ffc1cf",
    emissiveMap: settings.materialDebug ? undefined : textures.baseColorMap,
    emissiveIntensity: settings.materialDebug ? 0.08 : 1.45,
    side: DoubleSide,
    depthWrite: true,
    transparent: false,
  });

  material.needsUpdate = true;
  return material;
}

function makeDropletMaterial(
  settings: PetalMaterialSettings,
  dropletIndex: number,
) {
  const roughness = MathUtils.clamp(settings.dropletRoughness, 0, 0.18);
  const material = new MeshPhysicalMaterial({
    name: `WaterPro_Browser_Droplet_${dropletIndex
      .toString()
      .padStart(2, "0")}_Physical`,
    color: settings.materialDebug ? "#7fffff" : "#f7feff",
    metalness: 0,
    roughness,
    transmission: MathUtils.clamp(settings.dropletTransmission, 0, 1),
    thickness: 0.07,
    attenuationColor: "#e7fbff",
    attenuationDistance: 1.8,
    ior: MathUtils.clamp(settings.dropletIOR, 1.1, 1.6),
    clearcoat: 1,
    clearcoatRoughness: Math.max(0.015, roughness * 0.45),
    specularColor: "#ffffff",
    specularIntensity: 1,
    envMapIntensity: 1.25,
    emissive: settings.materialDebug ? "#123d3f" : "#f8ffff",
    emissiveIntensity: settings.materialDebug ? 0.12 : 0.46,
    transparent: true,
    opacity: settings.materialDebug ? 0.82 : 0.78,
    depthWrite: false,
  });

  material.needsUpdate = true;
  return material;
}

function preparePetalModel(
  sourceScene: Group,
  settings: PetalMaterialSettings,
  textures: PetalTextureSet,
): PreparedPetalModel {
  const scene = sourceScene.clone(true);
  const materials: MeshPhysicalMaterial[] = [];
  const petalMaterial = makePetalMaterial(settings, textures);
  let dropletIndex = 0;

  materials.push(petalMaterial);
  scene.traverse((child) => {
    if (!isMesh(child)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;

    if (DROPLET_NAME_PATTERN.test(child.name)) {
      dropletIndex += 1;
      const dropletMaterial = makeDropletMaterial(settings, dropletIndex);
      child.material = dropletMaterial;
      child.renderOrder = 48 + dropletIndex;
      materials.push(dropletMaterial);
      return;
    }

    if (child.name === "FlowerPetalHero") {
      child.material = petalMaterial;
      child.renderOrder = 46;
    }
  });

  return { scene, materials };
}

function usePetalMaterialControls() {
  const [values, setValues] = useControls(
    "Petal Material",
    () => ({
      petalColor: {
        value: defaultPetalMaterial.petalColor,
        label: "Petal color",
      },
      petalRoughness: {
        value: defaultPetalMaterial.petalRoughness,
        min: 0.2,
        max: 0.75,
        step: 0.01,
        label: "Petal roughness",
      },
      petalClearcoat: {
        value: defaultPetalMaterial.petalClearcoat,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: "Petal clearcoat",
      },
      petalClearcoatRoughness: {
        value: defaultPetalMaterial.petalClearcoatRoughness,
        min: 0.1,
        max: 0.7,
        step: 0.01,
        label: "Clearcoat roughness",
      },
      petalSheen: {
        value: defaultPetalMaterial.petalSheen,
        min: 0,
        max: 0.6,
        step: 0.01,
        label: "Petal sheen",
      },
      petalTransmission: {
        value: defaultPetalMaterial.petalTransmission,
        min: 0,
        max: 0.12,
        step: 0.005,
        label: "Petal transmission",
      },
      dropletTransmission: {
        value: defaultPetalMaterial.dropletTransmission,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Droplet transmission",
      },
      dropletRoughness: {
        value: defaultPetalMaterial.dropletRoughness,
        min: 0,
        max: 0.18,
        step: 0.005,
        label: "Droplet roughness",
      },
      dropletIOR: {
        value: defaultPetalMaterial.dropletIOR,
        min: 1.1,
        max: 1.6,
        step: 0.001,
        label: "Droplet IOR",
      },
      materialDebug: {
        value: defaultPetalMaterial.materialDebug,
        label: "Material debug",
      },
    }),
    { collapsed: false, order: 2 },
    [],
  ) as unknown as [
    PetalMaterialSettings,
    (values: Partial<PetalMaterialSettings>) => void,
  ];
  const valuesRef = useRef<PetalMaterialSettings>(values);
  valuesRef.current = values;

  useEffect(() => {
    return registerHeroLevaPresetScope("petalMaterial", {
      getValues: () =>
        pickPresetValues(valuesRef.current, PETAL_MATERIAL_PRESET_KEYS),
      applyValues: setValues as (values: Record<string, unknown>) => void,
    });
  }, [setValues]);

  return values;
}

function getDeploymentPetalMaterialSettings(): PetalMaterialSettings {
  return {
    petalColor: getDeploymentHeroLevaValue(
      "petalMaterial",
      "petalColor",
      defaultPetalMaterial.petalColor,
    ),
    petalRoughness: getDeploymentHeroLevaValue(
      "petalMaterial",
      "petalRoughness",
      defaultPetalMaterial.petalRoughness,
    ),
    petalClearcoat: getDeploymentHeroLevaValue(
      "petalMaterial",
      "petalClearcoat",
      defaultPetalMaterial.petalClearcoat,
    ),
    petalClearcoatRoughness: getDeploymentHeroLevaValue(
      "petalMaterial",
      "petalClearcoatRoughness",
      defaultPetalMaterial.petalClearcoatRoughness,
    ),
    petalSheen: getDeploymentHeroLevaValue(
      "petalMaterial",
      "petalSheen",
      defaultPetalMaterial.petalSheen,
    ),
    petalTransmission: getDeploymentHeroLevaValue(
      "petalMaterial",
      "petalTransmission",
      defaultPetalMaterial.petalTransmission,
    ),
    dropletTransmission: getDeploymentHeroLevaValue(
      "petalMaterial",
      "dropletTransmission",
      defaultPetalMaterial.dropletTransmission,
    ),
    dropletRoughness: getDeploymentHeroLevaValue(
      "petalMaterial",
      "dropletRoughness",
      defaultPetalMaterial.dropletRoughness,
    ),
    dropletIOR: getDeploymentHeroLevaValue(
      "petalMaterial",
      "dropletIOR",
      defaultPetalMaterial.dropletIOR,
    ),
    materialDebug: getDeploymentHeroLevaValue(
      "petalMaterial",
      "materialDebug",
      defaultPetalMaterial.materialDebug,
    ),
  };
}

function FlowerPetalModel({
  materialSettings,
}: {
  materialSettings: PetalMaterialSettings;
}) {
  const gltf = useLoader(GLTFLoader, PETAL_MODEL_URL);
  const [baseColorMap, normalMap, roughnessMap] = useLoader(TextureLoader, [
    PETAL_BASE_COLOR_URL,
    PETAL_NORMAL_URL,
    PETAL_ROUGHNESS_URL,
  ]) as Texture[];
  const textures = useMemo(
    () => ({
      baseColorMap: configureTexture(baseColorMap, SRGBColorSpace),
      normalMap: configureTexture(normalMap),
      roughnessMap: configureTexture(roughnessMap),
    }),
    [baseColorMap, normalMap, roughnessMap],
  );
  const preparedModel = useMemo(
    () => preparePetalModel(gltf.scene, materialSettings, textures),
    [gltf.scene, materialSettings, textures],
  );

  useEffect(() => {
    return () => {
      preparedModel.materials.forEach((material) => {
        material.dispose();
      });
    };
  }, [preparedModel]);

  return (
    <group
      position={[0.52, 1.01, 2.82]}
      rotation={[
        MathUtils.degToRad(1.5),
        MathUtils.degToRad(-18),
        MathUtils.degToRad(-2),
      ]}
      scale={[0.56, 0.56, 0.56]}
      renderOrder={46}
    >
      <primitive object={preparedModel.scene} dispose={null} />
    </group>
  );
}

function FlowerPetalStageWithControls() {
  const materialSettings = usePetalMaterialControls();

  return (
    <Suspense fallback={null}>
      <FlowerPetalModel materialSettings={materialSettings} />
    </Suspense>
  );
}

export default function FlowerPetalStage() {
  if (isProductionDeployment()) {
    return (
      <Suspense fallback={null}>
        <FlowerPetalModel
          materialSettings={getDeploymentPetalMaterialSettings()}
        />
      </Suspense>
    );
  }

  return <FlowerPetalStageWithControls />;
}

useLoader.preload(GLTFLoader, PETAL_MODEL_URL);
useLoader.preload(TextureLoader, [
  PETAL_BASE_COLOR_URL,
  PETAL_NORMAL_URL,
  PETAL_ROUGHNESS_URL,
]);
