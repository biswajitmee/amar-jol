"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { button, folder, useControls } from "leva";

export const DEFAULT_WATER_PRO_PRESET = "organimoSoft";

const WATER_PRESET_API = "/api/waterpro-presets";
const LEVA_PRESET_VALUE_KEYS = [
  "preset",
  "waterPosition",
  "waterRotation",
  "waterScale",
  "waterSize",
  "waveStrength",
  "waveSpeed",
  "waveScale",
  "rippleStrength",
  "rippleDamping",
  "foamStrength",
  "reflectionStrength",
  "fresnelPower",
  "planarReflectionEnabled",
  "planarReflectionStrength",
  "planarReflectionDistortion",
  "planarReflectionTint",
  "planarReflectionFade",
  "planarReflectionTargetScale",
  "planarReflectionClipBias",
  "underwaterEnabled",
  "underwaterFogColor",
  "underwaterFogDensity",
  "causticsStrength",
  "showRippleTexture",
  "showFoamTexture",
  "showBuoyancySamplePoints",
  "showReflectionTextureDebug",
  "reflectionDebugRawTexture",
  "reflectionDebugFullStrength",
  "reflectionDebugNoDistortion",
  "reflectionDebugFixedBlend",
];

export const WATER_PRO_PRESETS = {
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
    sunDirection: [0.2, 0.86, 0.46],
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
    sunDirection: [0.36, 0.78, 0.5],
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
    sunDirection: [-0.35, 0.55, 0.72],
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
    sunDirection: [0.58, 0.8, 0.16],
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
    sunDirection: [0.18, 0.82, 0.55],
    underwaterFogColor: "#0f5870",
    underwaterFogDensity: 0.05,
    causticsStrength: 0.46,
  },
};

function toVector3Control(value, fallback = [0, 0, 0]) {
  return {
    x: value?.x ?? value?.[0] ?? fallback[0],
    y: value?.y ?? value?.[1] ?? fallback[1],
    z: value?.z ?? value?.[2] ?? fallback[2],
  };
}

function toDegreesVector3Control(value, fallback = [0, 0, 0]) {
  const vector = toVector3Control(value, fallback);
  const radiansToDegrees = 180 / Math.PI;

  return {
    x: vector.x * radiansToDegrees,
    y: vector.y * radiansToDegrees,
    z: vector.z * radiansToDegrees,
  };
}

function getWaterPositionValues(values, fallback = [0, 0, 0]) {
  const fallbackPosition = toVector3Control(fallback);
  const vectorPosition = toVector3Control(
    values?.waterPosition,
    [fallbackPosition.x, fallbackPosition.y, fallbackPosition.z],
  );

  return {
    x: values?.waterPositionX ?? vectorPosition.x,
    y: values?.waterPositionY ?? vectorPosition.y,
    z: values?.waterPositionZ ?? vectorPosition.z,
  };
}

function getWaterRotationValues(values, fallback = [0, 0, 0]) {
  const fallbackRotation = toVector3Control(fallback);
  const vectorRotation = toVector3Control(
    values?.waterRotation,
    [fallbackRotation.x, fallbackRotation.y, fallbackRotation.z],
  );

  return {
    x: values?.waterRotationX ?? vectorRotation.x,
    y: values?.waterRotationY ?? vectorRotation.y,
    z: values?.waterRotationZ ?? vectorRotation.z,
  };
}

function toScale3Control(value, fallback = 1) {
  const fallbackScale =
    typeof fallback === "number"
      ? { x: fallback, y: fallback, z: fallback }
      : toVector3Control(fallback, [1, 1, 1]);

  if (typeof value === "number") {
    return {
      x: value,
      y: value,
      z: value,
    };
  }

  return {
    x: value?.x ?? value?.[0] ?? fallbackScale.x,
    y: value?.y ?? value?.[1] ?? fallbackScale.y,
    z: value?.z ?? value?.[2] ?? fallbackScale.z,
  };
}

function getWaterScaleValues(values, fallback = 1) {
  const fallbackScale = toScale3Control(fallback);
  const vectorScale = toScale3Control(values?.waterScale, [
    fallbackScale.x,
    fallbackScale.y,
    fallbackScale.z,
  ]);

  return {
    x: values?.waterScaleX ?? vectorScale.x,
    y: values?.waterScaleY ?? vectorScale.y,
    z: values?.waterScaleZ ?? vectorScale.z,
  };
}

function toPositionSliderValues(values, fallback = [0, 0, 0]) {
  const position = getWaterPositionValues(values, fallback);

  return {
    waterPositionX: position.x,
    waterPositionY: position.y,
    waterPositionZ: position.z,
  };
}

function toRotationSliderValues(values, fallback = [0, 0, 0]) {
  const rotation = getWaterRotationValues(values, fallback);

  return {
    waterRotationX: rotation.x,
    waterRotationY: rotation.y,
    waterRotationZ: rotation.z,
  };
}

function toScaleSliderValues(values, fallback = 1) {
  const scale = getWaterScaleValues(values, fallback);

  return {
    waterScaleX: scale.x,
    waterScaleY: scale.y,
    waterScaleZ: scale.z,
  };
}

function normalizePanelValues(
  values,
  fallbackPosition = [0, 0, 0],
  fallbackRotation = [0, 0, 0],
  fallbackScale = 1,
) {
  return {
    ...values,
    waterPosition: getWaterPositionValues(values, fallbackPosition),
    waterRotation: getWaterRotationValues(values, fallbackRotation),
    waterScale: getWaterScaleValues(values, fallbackScale),
  };
}

function getPresetValues(presetName) {
  return WATER_PRO_PRESETS[presetName] ?? WATER_PRO_PRESETS[DEFAULT_WATER_PRO_PRESET];
}

function getPresetControlValues(presetName) {
  const preset = getPresetValues(presetName);

  return {
    waveStrength: preset.waveStrength,
    waveSpeed: preset.waveSpeed,
    waveScale: preset.waveScale,
    rippleStrength: preset.rippleStrength,
    foamStrength: preset.foamStrength,
    reflectionStrength: preset.reflectionStrength,
    fresnelPower: preset.fresnelPower,
    planarReflectionEnabled: preset.planarReflectionEnabled,
    planarReflectionStrength: preset.planarReflectionStrength,
    planarReflectionDistortion: preset.planarReflectionDistortion,
    planarReflectionTint: preset.planarReflectionTint,
    planarReflectionFade: preset.planarReflectionFade,
    underwaterFogColor: preset.underwaterFogColor,
    underwaterFogDensity: preset.underwaterFogDensity,
    causticsStrength: preset.causticsStrength,
  };
}

function pickLevaPresetValues(values) {
  return LEVA_PRESET_VALUE_KEYS.reduce((presetValues, key) => {
    if (values[key] !== undefined) {
      presetValues[key] = values[key];
    }

    return presetValues;
  }, {});
}

function cleanPresetName(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w -]/g, "")
    .slice(0, 64);
}

function makePanelSchema(defaults, transformDefaults, presetFileControls) {
  const preset = defaults.preset ?? DEFAULT_WATER_PRO_PRESET;
  const presetValues = getPresetValues(preset);

  return {
    preset: {
      value: preset,
      options: Object.keys(WATER_PRO_PRESETS),
      label: "Preset",
    },
    "Preset File": folder(
      {
        savePresetName: {
          value: "hero-water-custom",
          label: "Save name",
        },
        loadPresetName: {
          value: "hero-water-custom",
          label: "Load name",
        },
        saveCurrentPreset: button(presetFileControls.saveCurrentPreset),
        loadSavedPreset: button(presetFileControls.loadSavedPreset),
        presetFileStatus: {
          value: "Ready",
          label: "Status",
          editable: false,
        },
      },
      { collapsed: true },
    ),
    Transform: folder(
      {
        waterPositionX: {
          value: transformDefaults.position.x,
          label: "Position X",
          min: -72,
          max: 72,
          step: 0.01,
        },
        waterPositionY: {
          value: transformDefaults.position.y,
          label: "Position Y",
          min: -72,
          max: 72,
          step: 0.01,
        },
        waterPositionZ: {
          value: transformDefaults.position.z,
          label: "Position Z",
          min: -72,
          max: 72,
          step: 0.01,
        },
        waterRotationX: {
          value: transformDefaults.rotation.x,
          label: "Rotation X",
          min: -360,
          max: 360,
          step: 0.1,
        },
        waterRotationY: {
          value: transformDefaults.rotation.y,
          label: "Rotation Y",
          min: -360,
          max: 360,
          step: 0.1,
        },
        waterRotationZ: {
          value: transformDefaults.rotation.z,
          label: "Rotation Z",
          min: -360,
          max: 360,
          step: 0.1,
        },
        waterScaleX: {
          value: transformDefaults.scale.x,
          label: "Scale X",
          min: 0.1,
          max: 20,
          step: 0.01,
        },
        waterScaleY: {
          value: transformDefaults.scale.y,
          label: "Scale Y",
          min: 0.1,
          max: 20,
          step: 0.01,
        },
        waterScaleZ: {
          value: transformDefaults.scale.z,
          label: "Scale Z",
          min: 0.1,
          max: 100,
          step: 0.01,
        },
        waterSize: {
          value: transformDefaults.size,
          label: "Plane size",
          min: 0.05,
          max: 48,
          step: 0.01,
        },
      },
      { collapsed: true },
    ),
    Surface: folder(
      {
        waveStrength: {
          value: presetValues.waveStrength,
          label: "Wave strength",
          min: 0,
          max: 16,
          step: 0.01,
        },
        waveSpeed: {
          value: presetValues.waveSpeed,
          label: "Wave speed",
          min: 0,
          max: 24,
          step: 0.01,
        },
        waveScale: {
          value: presetValues.waveScale,
          label: "Wave scale",
          min: -10.00,
          max: 24,
          step: 0.01,
        },
        reflectionStrength: {
          value: presetValues.reflectionStrength,
          label: "Environment reflection",
          min: 0,
          max: 14,
          step: 0.01,
        },
        fresnelPower: {
          value: presetValues.fresnelPower,
          label: "Fresnel",
          min: 0.8,
          max: 60,
          step: 0.05,
        },
        "Live Planar Reflection": folder(
          {
            planarReflectionEnabled: {
              value: presetValues.planarReflectionEnabled ?? defaults.planarReflectionEnabled ?? true,
              label: "Enabled",
            },
            planarReflectionStrength: {
              value: presetValues.planarReflectionStrength ?? defaults.planarReflectionStrength ?? 0.45,
              label: "Strength",
              min: 0,
              max: 1.5,
              step: 0.01,
            },
            planarReflectionDistortion: {
              value: presetValues.planarReflectionDistortion ?? defaults.planarReflectionDistortion ?? 0.012,
              label: "Distortion",
              min: 0,
              max: 0.08,
              step: 0.001,
            },
            planarReflectionFade: {
              value: presetValues.planarReflectionFade ?? defaults.planarReflectionFade ?? 0.7,
              label: "Fade",
              min: 0,
              max: 1,
              step: 0.01,
            },
            planarReflectionTargetScale: {
              value: defaults.planarReflectionTargetScale ?? 0.5,
              label: "Target scale",
              min: 0.1,
              max: 1,
              step: 0.05,
            },
            planarReflectionClipBias: {
              value: defaults.planarReflectionClipBias ?? 0,
              label: "Clip bias",
              min: -0.02,
              max: 0.05,
              step: 0.0005,
            },
          },
          { collapsed: true },
        ),
      },
      { collapsed: false },
    ),
    Ripples: folder(
      {
        rippleStrength: {
          value: presetValues.rippleStrength,
          label: "Strength",
          min: 0,
          max: 1.4,
          step: 0.01,
        },
        rippleDamping: {
          value: defaults.rippleDamping,
          label: "Damping",
          min: 0.94,
          max: 0.999,
          step: 0.001,
        },
      },
      { collapsed: true },
    ),
    Foam: folder(
      {
        foamStrength: {
          value: presetValues.foamStrength,
          label: "Strength",
          min: 0,
          max: 1.4,
          step: 0.01,
        },
      },
      { collapsed: true },
    ),
    "Underwater Fog": folder(
      {
        underwaterEnabled: {
          value: defaults.underwaterEnabled,
          label: "Enabled",
        },
        underwaterFogColor: {
          value: presetValues.underwaterFogColor,
          label: "Fog color",
        },
        underwaterFogDensity: {
          value: presetValues.underwaterFogDensity,
          label: "Fog density",
          min: 0.005,
          max: 0.12,
          step: 0.001,
        },
        causticsStrength: {
          value: presetValues.causticsStrength,
          label: "Caustics",
          min: 0,
          max: 1,
          step: 0.01,
        },
      },
      { collapsed: true },
    ),
    "Debug Views": folder(
      {
        showRippleTexture: {
          value: defaults.showRippleTexture ?? false,
          label: "Ripple texture",
        },
        showFoamTexture: {
          value: defaults.showFoamTexture ?? false,
          label: "Foam texture",
        },
        showBuoyancySamplePoints: {
          value: defaults.showBuoyancySamplePoints ?? false,
          label: "Buoyancy points",
        },
        showReflectionTextureDebug: {
          value: defaults.showReflectionTextureDebug ?? false,
          label: "Raw reflection",
        },
        reflectionDebugRawTexture: {
          value: defaults.reflectionDebugRawTexture ?? false,
          label: "Reflection raw texture",
        },
        reflectionDebugFullStrength: {
          value: defaults.reflectionDebugFullStrength ?? false,
          label: "Reflection full strength",
        },
        reflectionDebugNoDistortion: {
          value: defaults.reflectionDebugNoDistortion ?? false,
          label: "Reflection no distortion",
        },
        reflectionDebugFixedBlend: {
          value: defaults.reflectionDebugFixedBlend ?? false,
          label: "Reflection fixed blend",
        },
      },
      { collapsed: true },
    ),
  };
}

export function useWaterDebugPanel(defaults, transform = {}) {
  const preset = defaults.preset ?? DEFAULT_WATER_PRO_PRESET;
  const initialTransformRef = useRef(null);
  const valuesRef = useRef({});
  const setRef = useRef(null);
  const skipNextPresetApplyRef = useRef(false);

  if (!initialTransformRef.current) {
    initialTransformRef.current = {
      position: toVector3Control(transform.position, [0, 0, 0]),
      rotation: toDegreesVector3Control(transform.rotation, [0, 0, 0]),
      scale: toScale3Control(transform.scale, 1),
      size: toVector3Control(defaults.waterSize, [
        defaults.width ?? 4.2,
        1,
        defaults.depth ?? 2.35,
      ]),
    };
  }

  const setPresetStatus = useCallback((message) => {
    setRef.current?.({ presetFileStatus: message });
  }, []);

  const saveCurrentPreset = useCallback(async () => {
    const currentValues = valuesRef.current;
    const name = cleanPresetName(currentValues.savePresetName);

    if (!name) {
      setPresetStatus("Add a preset name first");
      return;
    }

    try {
      setPresetStatus(`Saving ${name}...`);
      const response = await fetch(WATER_PRESET_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          values: pickLevaPresetValues(currentValues),
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed with ${response.status}`);
      }

      setRef.current?.({
        loadPresetName: name,
        presetFileStatus: `Saved ${name}`,
      });
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : "Save failed");
    }
  }, [setPresetStatus]);

  const loadSavedPreset = useCallback(async () => {
    const currentValues = valuesRef.current;
    const name = cleanPresetName(currentValues.loadPresetName);

    if (!name) {
      setPresetStatus("Add a preset name to load");
      return;
    }

    try {
      setPresetStatus(`Loading ${name}...`);
      const response = await fetch(WATER_PRESET_API);

      if (!response.ok) {
        throw new Error(`Load failed with ${response.status}`);
      }

      const data = await response.json();
      const savedPreset = data?.presets?.[name];

      if (!savedPreset) {
        setPresetStatus(`No saved preset named ${name}`);
        return;
      }

      if (savedPreset.preset && savedPreset.preset !== currentValues.preset) {
        skipNextPresetApplyRef.current = true;
        window.setTimeout(() => {
          skipNextPresetApplyRef.current = false;
        }, 0);
      }

      const savedPanelValues = { ...savedPreset };
      delete savedPanelValues.waterPosition;
      delete savedPanelValues.waterRotation;
      delete savedPanelValues.waterScale;

      setRef.current?.({
        ...savedPanelValues,
        ...toPositionSliderValues(
          savedPreset,
          initialTransformRef.current?.position,
        ),
        ...toRotationSliderValues(
          savedPreset,
          initialTransformRef.current?.rotation,
        ),
        ...toScaleSliderValues(
          savedPreset,
          initialTransformRef.current?.scale,
        ),
        savePresetName: name,
        loadPresetName: name,
        presetFileStatus: `Loaded ${name}`,
      });
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : "Load failed");
    }
  }, [setPresetStatus]);

  const [values, set] = useControls(
    "WaterPro",
    () =>
      makePanelSchema({ ...defaults, preset }, initialTransformRef.current, {
        saveCurrentPreset,
        loadSavedPreset,
      }),
    { collapsed: true, order: 1 },
    [defaults, loadSavedPreset, preset, saveCurrentPreset],
  );
  const previousPresetRef = useRef(values.preset);
  const normalizedValues = useMemo(
    () =>
      normalizePanelValues(
        values,
        initialTransformRef.current.position,
        initialTransformRef.current.rotation,
        initialTransformRef.current.scale,
      ),
    [values],
  );
  valuesRef.current = normalizedValues;
  setRef.current = set;

  useEffect(() => {
    if (values.preset === previousPresetRef.current) {
      return;
    }

    if (skipNextPresetApplyRef.current) {
      previousPresetRef.current = values.preset;
      skipNextPresetApplyRef.current = false;
      return;
    }

    previousPresetRef.current = values.preset;
    set(getPresetControlValues(values.preset));
  }, [set, values.preset]);

  return normalizedValues;
}
