"use client";

import { types, type ISheet } from "@theatre/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathUtils } from "three";
import {
  getDeploymentWaterPresetValues,
  isProductionDeployment,
} from "@/src/waterpro/debug/deploymentLevaPresets";
import WaterPro from "@/src/waterpro/WaterPro.jsx";
import UnderwaterGodRaysStage from "./UnderwaterGodRaysStage";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type RgbaValue = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const waterPresets = {
  calmTropical: {
    waveStrength: 0.38,
    waveSpeed: 0.74,
    waveScale: 1.35,
    waterColor: "#6eddd4",
    deepColor: "#0f6178",
    foamStrength: 0.22,
    rippleStrength: 0.32,
    reflectionStrength: 0.45,
    fresnelPower: 3.4,
    planarReflectionEnabled: true,
    planarReflectionStrength: 0.45,
    planarReflectionDistortion: 0.012,
    planarReflectionTint: "#ffffff",
    planarReflectionFade: 0.7,
    underwaterFogColor: "#1f928f",
    underwaterFogDensity: 0.032,
    causticsStrength: 0.5,
  },
  organimoSoft: {
    waveStrength: 0.72,
    waveSpeed: 1,
    waveScale: 1,
    waterColor: "#66c5c1",
    deepColor: "#174e62",
    foamStrength: 0.82,
    rippleStrength: 0.55,
    reflectionStrength: 0.62,
    fresnelPower: 2.6,
    planarReflectionEnabled: true,
    planarReflectionStrength: 0.45,
    planarReflectionDistortion: 0.012,
    planarReflectionTint: "#ffffff",
    planarReflectionFade: 0.7,
    underwaterFogColor: "#0a5665",
    underwaterFogDensity: 0.055,
    causticsStrength: 0.42,
  },
  stormyOcean: {
    waveStrength: 1.18,
    waveSpeed: 1.46,
    waveScale: 0.78,
    waterColor: "#2f6f85",
    deepColor: "#10243b",
    foamStrength: 1.15,
    rippleStrength: 0.95,
    reflectionStrength: 0.86,
    fresnelPower: 1.7,
    planarReflectionEnabled: true,
    planarReflectionStrength: 0.42,
    planarReflectionDistortion: 0.018,
    planarReflectionTint: "#ffffff",
    planarReflectionFade: 0.78,
    underwaterFogColor: "#0b3348",
    underwaterFogDensity: 0.09,
    causticsStrength: 0.25,
  },
  shallowLagoon: {
    waveStrength: 0.24,
    waveSpeed: 0.62,
    waveScale: 1.8,
    waterColor: "#7ce9cf",
    deepColor: "#1f9fa4",
    foamStrength: 0.18,
    rippleStrength: 0.24,
    reflectionStrength: 0.38,
    fresnelPower: 4.2,
    planarReflectionEnabled: true,
    planarReflectionStrength: 0.38,
    planarReflectionDistortion: 0.01,
    planarReflectionTint: "#ffffff",
    planarReflectionFade: 0.66,
    underwaterFogColor: "#49c6b8",
    underwaterFogDensity: 0.024,
    causticsStrength: 0.68,
  },
  cinematicProductHero: {
    waveStrength: 0.68,
    waveSpeed: 0.92,
    waveScale: 1.05,
    waterColor: "#5bc5c9",
    deepColor: "#123a58",
    foamStrength: 0.6,
    rippleStrength: 0.48,
    reflectionStrength: 0.9,
    fresnelPower: 2.25,
    planarReflectionEnabled: true,
    planarReflectionStrength: 0.5,
    planarReflectionDistortion: 0.012,
    planarReflectionTint: "#ffffff",
    planarReflectionFade: 0.72,
    underwaterFogColor: "#0f5870",
    underwaterFogDensity: 0.05,
    causticsStrength: 0.46,
  },
} as const;

type WaterPresetName = keyof typeof waterPresets;

type WaterDebugValues = Partial<{
  preset: WaterPresetName;
  waterPosition: Vector3Values | [number, number, number];
  waterRotation: Vector3Values | [number, number, number];
  waterScale: number | Vector3Values | [number, number, number];
  waterSize: Vector3Values | [number, number, number];
  waveStrength: number;
  waveSpeed: number;
  waveScale: number;
  rippleStrength: number;
  rippleDamping: number;
  foamStrength: number;
  reflectionStrength: number;
  fresnelPower: number;
  planarReflectionEnabled: boolean;
  planarReflectionStrength: number;
  planarReflectionDistortion: number;
  planarReflectionTint: string;
  planarReflectionFade: number;
  planarReflectionTargetScale: number;
  planarReflectionClipBias: number;
  underwaterEnabled: boolean;
  underwaterFogColor: string;
  underwaterFogDensity: number;
  causticsStrength: number;
  showRippleTexture: boolean;
  showFoamTexture: boolean;
  showBuoyancySamplePoints: boolean;
  showReflectionTextureDebug: boolean;
  reflectionDebugRawTexture: boolean;
  reflectionDebugFullStrength: boolean;
  reflectionDebugNoDistortion: boolean;
  reflectionDebugFixedBlend: boolean;
}>;

type WaterTheatreValues = {
  preset: WaterPresetName;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
  waterSize: Vector3Values;
  waveStrength: number;
  waveSpeed: number;
  waveScale: number;
  waterColor: RgbaValue;
  deepColor: RgbaValue;
  foamStrength: number;
  rippleStrength: number;
  rippleDamping: number;
  reflectionStrength: number;
  fresnelPower: number;
  planarReflectionEnabled: boolean;
  planarReflectionStrength: number;
  planarReflectionDistortion: number;
  planarReflectionTint: RgbaValue;
  planarReflectionFade: number;
  planarReflectionTargetScale: number;
  planarReflectionClipBias: number;
  underwaterEnabled: boolean;
  underwaterFogColor: RgbaValue;
  underwaterFogDensity: number;
  causticsStrength: number;
  showRippleTexture: boolean;
  showFoamTexture: boolean;
  showBuoyancySamplePoints: boolean;
  showReflectionTextureDebug: boolean;
  reflectionDebugRawTexture: boolean;
  reflectionDebugFullStrength: boolean;
  reflectionDebugNoDistortion: boolean;
  reflectionDebugFixedBlend: boolean;
};

type HeroWaterStageProps = {
  theatreSheet: ISheet;
};

const defaultPreset: WaterPresetName = "organimoSoft";
const defaultWaterValues = {
  position: { x: 0, y: 0.95, z: 2.2 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  waterSize: { x: 4.2, y: 1, z: 2.35 },
  rippleDamping: 0.985,
  underwaterEnabled: true,
  planarReflectionTargetScale: 0.5,
  planarReflectionClipBias: 0,
  showRippleTexture: false,
  showFoamTexture: false,
  showBuoyancySamplePoints: false,
  showReflectionTextureDebug: false,
  reflectionDebugRawTexture: false,
  reflectionDebugFullStrength: false,
  reflectionDebugNoDistortion: false,
  reflectionDebugFixedBlend: false,
};

const presetLabels: Record<WaterPresetName, string> = {
  calmTropical: "Calm Tropical",
  organimoSoft: "Organimo Soft",
  stormyOcean: "Stormy Ocean",
  shallowLagoon: "Shallow Lagoon",
  cinematicProductHero: "Cinematic Product Hero",
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function hexToRgba(hex: string, alpha = 1): RgbaValue {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);

  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
    a: alpha,
  };
}

function rgbaToHex(color: RgbaValue | string | undefined, fallback: string) {
  if (!color || typeof color === "string") {
    return color ?? fallback;
  }

  const toByte = (value: number) =>
    MathUtils.clamp(Math.round(value * 255), 0, 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toByte(color.r)}${toByte(color.g)}${toByte(color.b)}`;
}

function toPresetName(value: unknown): WaterPresetName {
  return typeof value === "string" && value in waterPresets
    ? (value as WaterPresetName)
    : defaultPreset;
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toVector3(value: unknown, fallback: Vector3Values): Vector3Values {
  const vector = value as Partial<Vector3Values> | number[] | undefined;

  return {
    x: toNumber(
      Array.isArray(vector) ? vector[0] : vector?.x,
      fallback.x,
    ),
    y: toNumber(
      Array.isArray(vector) ? vector[1] : vector?.y,
      fallback.y,
    ),
    z: toNumber(
      Array.isArray(vector) ? vector[2] : vector?.z,
      fallback.z,
    ),
  };
}

function toScaleVector(value: unknown, fallback: Vector3Values): Vector3Values {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      x: value,
      y: value,
      z: value,
    };
  }

  return toVector3(value, fallback);
}

function vectorToArray(value: Vector3Values): [number, number, number] {
  return [value.x, value.y, value.z];
}

function rotationToRadians(value: Vector3Values): [number, number, number] {
  return [
    MathUtils.degToRad(value.x),
    MathUtils.degToRad(value.y),
    MathUtils.degToRad(value.z),
  ];
}

const waterTheatreConfig = {
  preset: types.stringLiteral(defaultPreset, presetLabels),
  position: {
    x: types.number(defaultWaterValues.position.x),
    y: types.number(defaultWaterValues.position.y),
    z: types.number(defaultWaterValues.position.z),
  },
  rotation: {
    x: types.number(defaultWaterValues.rotation.x),
    y: types.number(defaultWaterValues.rotation.y),
    z: types.number(defaultWaterValues.rotation.z),
  },
  scale: {
    x: types.number(defaultWaterValues.scale.x),
    y: types.number(defaultWaterValues.scale.y),
    z: types.number(defaultWaterValues.scale.z),
  },
  waterSize: {
    x: types.number(defaultWaterValues.waterSize.x),
    y: types.number(defaultWaterValues.waterSize.y),
    z: types.number(defaultWaterValues.waterSize.z),
  },
  waveStrength: types.number(waterPresets.organimoSoft.waveStrength, {
    range: [0, 16],
  }),
  waveSpeed: types.number(waterPresets.organimoSoft.waveSpeed, {
    range: [0, 24],
  }),
  waveScale: types.number(waterPresets.organimoSoft.waveScale, {
    range: [0.35, 24],
  }),
  waterColor: types.rgba(hexToRgba(waterPresets.organimoSoft.waterColor)),
  deepColor: types.rgba(hexToRgba(waterPresets.organimoSoft.deepColor)),
  foamStrength: types.number(waterPresets.organimoSoft.foamStrength, {
    range: [0, 1.4],
  }),
  rippleStrength: types.number(waterPresets.organimoSoft.rippleStrength, {
    range: [0, 1.4],
  }),
  rippleDamping: types.number(defaultWaterValues.rippleDamping, {
    range: [0.94, 0.999],
  }),
  reflectionStrength: types.number(waterPresets.organimoSoft.reflectionStrength, {
    range: [0, 14],
  }),
  fresnelPower: types.number(waterPresets.organimoSoft.fresnelPower, {
    range: [0.8, 60],
  }),
  planarReflectionEnabled: types.boolean(
    waterPresets.organimoSoft.planarReflectionEnabled,
  ),
  planarReflectionStrength: types.number(
    waterPresets.organimoSoft.planarReflectionStrength,
    { range: [0, 1.5] },
  ),
  planarReflectionDistortion: types.number(
    waterPresets.organimoSoft.planarReflectionDistortion,
    { range: [0, 0.08] },
  ),
  planarReflectionTint: types.rgba(
    hexToRgba(waterPresets.organimoSoft.planarReflectionTint),
  ),
  planarReflectionFade: types.number(
    waterPresets.organimoSoft.planarReflectionFade,
    { range: [0, 1] },
  ),
  planarReflectionTargetScale: types.number(
    defaultWaterValues.planarReflectionTargetScale,
    { range: [0.1, 1] },
  ),
  planarReflectionClipBias: types.number(
    defaultWaterValues.planarReflectionClipBias,
    { range: [-0.02, 0.05] },
  ),
  underwaterEnabled: types.boolean(defaultWaterValues.underwaterEnabled),
  underwaterFogColor: types.rgba(
    hexToRgba(waterPresets.organimoSoft.underwaterFogColor),
  ),
  underwaterFogDensity: types.number(
    waterPresets.organimoSoft.underwaterFogDensity,
    { range: [0.005, 0.12] },
  ),
  causticsStrength: types.number(waterPresets.organimoSoft.causticsStrength, {
    range: [0, 1],
  }),
  showRippleTexture: types.boolean(defaultWaterValues.showRippleTexture),
  showFoamTexture: types.boolean(defaultWaterValues.showFoamTexture),
  showBuoyancySamplePoints: types.boolean(
    defaultWaterValues.showBuoyancySamplePoints,
  ),
  showReflectionTextureDebug: types.boolean(
    defaultWaterValues.showReflectionTextureDebug,
  ),
  reflectionDebugRawTexture: types.boolean(
    defaultWaterValues.reflectionDebugRawTexture,
  ),
  reflectionDebugFullStrength: types.boolean(
    defaultWaterValues.reflectionDebugFullStrength,
  ),
  reflectionDebugNoDistortion: types.boolean(
    defaultWaterValues.reflectionDebugNoDistortion,
  ),
  reflectionDebugFixedBlend: types.boolean(
    defaultWaterValues.reflectionDebugFixedBlend,
  ),
};

function getTheatreWater(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Hero Water";
  let waterObject = theatreObjects.get(objectKey);

  if (!waterObject) {
    waterObject = theatreSheet.object("Hero Water", waterTheatreConfig);
    theatreObjects.set(objectKey, waterObject);
  }

  return waterObject;
}

function toWaterInitialValue(values: WaterDebugValues | null) {
  const presetName = toPresetName(values?.preset);
  const preset = waterPresets[presetName];
  const waterScale = toScaleVector(values?.waterScale, defaultWaterValues.scale);

  return {
    preset: presetName,
    position: toVector3(values?.waterPosition, defaultWaterValues.position),
    rotation: toVector3(values?.waterRotation, defaultWaterValues.rotation),
    scale: waterScale,
    waterSize: toVector3(values?.waterSize, defaultWaterValues.waterSize),
    waveStrength: toNumber(values?.waveStrength, preset.waveStrength),
    waveSpeed: toNumber(values?.waveSpeed, preset.waveSpeed),
    waveScale: toNumber(values?.waveScale, preset.waveScale),
    waterColor: hexToRgba(preset.waterColor),
    deepColor: hexToRgba(preset.deepColor),
    foamStrength: toNumber(values?.foamStrength, preset.foamStrength),
    rippleStrength: toNumber(values?.rippleStrength, preset.rippleStrength),
    rippleDamping: toNumber(
      values?.rippleDamping,
      defaultWaterValues.rippleDamping,
    ),
    reflectionStrength: toNumber(
      values?.reflectionStrength,
      preset.reflectionStrength,
    ),
    fresnelPower: toNumber(values?.fresnelPower, preset.fresnelPower),
    planarReflectionEnabled:
      values?.planarReflectionEnabled ?? preset.planarReflectionEnabled,
    planarReflectionStrength: toNumber(
      values?.planarReflectionStrength,
      preset.planarReflectionStrength,
    ),
    planarReflectionDistortion: toNumber(
      values?.planarReflectionDistortion,
      preset.planarReflectionDistortion,
    ),
    planarReflectionTint: hexToRgba(
      values?.planarReflectionTint ?? preset.planarReflectionTint,
    ),
    planarReflectionFade: toNumber(
      values?.planarReflectionFade,
      preset.planarReflectionFade,
    ),
    planarReflectionTargetScale: toNumber(
      values?.planarReflectionTargetScale,
      defaultWaterValues.planarReflectionTargetScale,
    ),
    planarReflectionClipBias: toNumber(
      values?.planarReflectionClipBias,
      defaultWaterValues.planarReflectionClipBias,
    ),
    underwaterEnabled:
      values?.underwaterEnabled ?? defaultWaterValues.underwaterEnabled,
    underwaterFogColor: hexToRgba(
      values?.underwaterFogColor ?? preset.underwaterFogColor,
    ),
    underwaterFogDensity: toNumber(
      values?.underwaterFogDensity,
      preset.underwaterFogDensity,
    ),
    causticsStrength: toNumber(
      values?.causticsStrength,
      preset.causticsStrength,
    ),
    showRippleTexture:
      values?.showRippleTexture ?? defaultWaterValues.showRippleTexture,
    showFoamTexture:
      values?.showFoamTexture ?? defaultWaterValues.showFoamTexture,
    showBuoyancySamplePoints:
      values?.showBuoyancySamplePoints ??
      defaultWaterValues.showBuoyancySamplePoints,
    showReflectionTextureDebug:
      values?.showReflectionTextureDebug ??
      defaultWaterValues.showReflectionTextureDebug,
    reflectionDebugRawTexture:
      values?.reflectionDebugRawTexture ??
      defaultWaterValues.reflectionDebugRawTexture,
    reflectionDebugFullStrength:
      values?.reflectionDebugFullStrength ??
      defaultWaterValues.reflectionDebugFullStrength,
    reflectionDebugNoDistortion:
      values?.reflectionDebugNoDistortion ??
      defaultWaterValues.reflectionDebugNoDistortion,
    reflectionDebugFixedBlend:
      values?.reflectionDebugFixedBlend ??
      defaultWaterValues.reflectionDebugFixedBlend,
  };
}

function toWaterProSettings(values: WaterTheatreValues) {
  const presetName = toPresetName(values.preset);
  const preset = waterPresets[presetName];

  return {
    preset: presetName,
    waterSize: values.waterSize,
    waveStrength: values.waveStrength,
    waveSpeed: values.waveSpeed,
    waveScale: values.waveScale,
    waterColor: rgbaToHex(values.waterColor, preset.waterColor),
    deepColor: rgbaToHex(values.deepColor, preset.deepColor),
    foamStrength: values.foamStrength,
    rippleStrength: values.rippleStrength,
    rippleDamping: values.rippleDamping,
    reflectionStrength: values.reflectionStrength,
    fresnelPower: values.fresnelPower,
    planarReflectionEnabled:
      values.planarReflectionEnabled ?? preset.planarReflectionEnabled,
    planarReflectionStrength: toNumber(
      values.planarReflectionStrength,
      preset.planarReflectionStrength,
    ),
    planarReflectionDistortion: toNumber(
      values.planarReflectionDistortion,
      preset.planarReflectionDistortion,
    ),
    planarReflectionTint: rgbaToHex(
      values.planarReflectionTint,
      preset.planarReflectionTint,
    ),
    planarReflectionFade: toNumber(
      values.planarReflectionFade,
      preset.planarReflectionFade,
    ),
    planarReflectionTargetScale: toNumber(
      values.planarReflectionTargetScale,
      defaultWaterValues.planarReflectionTargetScale,
    ),
    planarReflectionClipBias: toNumber(
      values.planarReflectionClipBias,
      defaultWaterValues.planarReflectionClipBias,
    ),
    underwaterEnabled: values.underwaterEnabled,
    underwaterFogColor: rgbaToHex(
      values.underwaterFogColor,
      preset.underwaterFogColor,
    ),
    underwaterFogDensity: values.underwaterFogDensity,
    causticsStrength: values.causticsStrength,
    showRippleTexture: values.showRippleTexture,
    showFoamTexture: values.showFoamTexture,
    showBuoyancySamplePoints: values.showBuoyancySamplePoints,
    showReflectionTextureDebug: values.showReflectionTextureDebug,
    reflectionDebugRawTexture: values.reflectionDebugRawTexture,
    reflectionDebugFullStrength: values.reflectionDebugFullStrength,
    reflectionDebugNoDistortion: values.reflectionDebugNoDistortion,
    reflectionDebugFixedBlend: values.reflectionDebugFixedBlend,
  };
}

export default function HeroWaterStage({ theatreSheet }: HeroWaterStageProps) {
  const waterObject = useMemo(
    () => getTheatreWater(theatreSheet),
    [theatreSheet],
  );
  const deploymentWaterValues = useMemo(
    () => getDeploymentWaterPresetValues<WaterDebugValues>() ?? null,
    [],
  );
  const [theatreValues, setTheatreValues] = useState<WaterTheatreValues>(
    () =>
      isProductionDeployment() && deploymentWaterValues
        ? toWaterInitialValue(deploymentWaterValues)
        : (waterObject.value as WaterTheatreValues),
  );
  const [debugValues, setDebugValues] = useState<WaterDebugValues | null>(null);
  const debugKeyRef = useRef("");

  const handleDebugSettingsChange = useCallback((values: WaterDebugValues) => {
    const nextKey = JSON.stringify(values);

    if (nextKey === debugKeyRef.current) {
      return;
    }

    debugKeyRef.current = nextKey;
    setDebugValues(values);
  }, []);

  useEffect(() => {
    if (isProductionDeployment()) {
      return;
    }

    waterObject.initialValue = toWaterInitialValue(debugValues);
  }, [debugValues, waterObject]);

  useEffect(() => {
    if (isProductionDeployment()) {
      if (deploymentWaterValues) {
        setTheatreValues(toWaterInitialValue(deploymentWaterValues));
      }

      return undefined;
    }

    const unsubscribe = waterObject.onValuesChange((values: WaterTheatreValues) => {
      setTheatreValues(values as WaterTheatreValues);
    });

    return unsubscribe;
  }, [deploymentWaterValues, waterObject]);

  const waterSettings = useMemo(
    () => toWaterProSettings(theatreValues),
    [theatreValues],
  );

  return (
    <UnderwaterGodRaysStage theatreSheet={theatreSheet}>
      {(godRaysTransform) => (
        <WaterPro
          position={vectorToArray(theatreValues.position)}
          rotation={rotationToRadians(theatreValues.rotation)}
          scale={vectorToArray(theatreValues.scale)}
          debug={!isProductionDeployment()}
          theatreSettings={waterSettings}
          underwaterRaysTransform={godRaysTransform}
          usePanelTransform
          onDebugSettingsChange={handleDebugSettingsChange}
        />
      )}
    </UnderwaterGodRaysStage>
  );
}
