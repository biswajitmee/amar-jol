"use client";

import { useCallback, useEffect, useRef } from "react";
import { button, folder, useControls } from "leva";

export const DEFAULT_WATER_PRO_PRESET = "organimoSoft";

const WATER_PRESET_API = "/api/waterpro-presets";
const LEVA_PRESET_VALUE_KEYS = [
  "preset",
  "waterPosition",
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
  "underwaterEnabled",
  "underwaterFogColor",
  "underwaterFogDensity",
  "causticsStrength",
  "showRippleTexture",
  "showFoamTexture",
  "showBuoyancySamplePoints",
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

function toScalarScale(value, fallback = 1) {
  if (typeof value === "number") {
    return value;
  }

  if (value?.x !== undefined) {
    return value.x;
  }

  return value?.[0] ?? fallback;
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
        waterPosition: {
          value: transformDefaults.position,
          label: "Position",
          step: 0.01,
        },
        waterScale: {
          value: transformDefaults.scale,
          label: "Scale",
          min: 0.2,
          max: 3,
          step: 0.01,
        },
        waterSize: {
          value: transformDefaults.size,
          label: "Plane size",
          min: 0.05,
          max: 16,
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
          max: 1.6,
          step: 0.01,
        },
        waveSpeed: {
          value: presetValues.waveSpeed,
          label: "Wave speed",
          min: 0,
          max: 2.4,
          step: 0.01,
        },
        waveScale: {
          value: presetValues.waveScale,
          label: "Wave scale",
          min: 0.35,
          max: 2.4,
          step: 0.01,
        },
        reflectionStrength: {
          value: presetValues.reflectionStrength,
          label: "Reflection",
          min: 0,
          max: 1.4,
          step: 0.01,
        },
        fresnelPower: {
          value: presetValues.fresnelPower,
          label: "Fresnel",
          min: 0.8,
          max: 6,
          step: 0.05,
        },
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
      scale: toScalarScale(transform.scale, 1),
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

      setRef.current?.({
        ...savedPreset,
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
  valuesRef.current = values;
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

  return values;
}
