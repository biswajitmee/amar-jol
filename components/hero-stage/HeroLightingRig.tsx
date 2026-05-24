"use client";

import { folder, useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import { Color, MathUtils } from "three";
import {
  getDeploymentHeroLevaValue,
  isProductionDeployment,
} from "@/src/waterpro/debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "@/src/waterpro/debug/heroLevaPresetRegistry";

const WARM_TINT = new Color("#ffd9b2");
const HERO_LIGHTING_PRESET_KEYS = [
  "sunEnabled",
  "sunColor",
  "sunIntensity",
  "sunPositionX",
  "sunPositionY",
  "sunPositionZ",
  "fillEnabled",
  "fillColor",
  "fillIntensity",
  "fillPositionX",
  "fillPositionY",
  "fillPositionZ",
  "ambientEnabled",
  "ambientColor",
  "ambientIntensity",
  "horizonGlowIntensity",
  "warmTintStrength",
] as const;

type HeroLightingValues = {
  sunEnabled: boolean;
  sunColor: string;
  sunIntensity: number;
  sunPositionX: number;
  sunPositionY: number;
  sunPositionZ: number;
  fillEnabled: boolean;
  fillColor: string;
  fillIntensity: number;
  fillPositionX: number;
  fillPositionY: number;
  fillPositionZ: number;
  ambientEnabled: boolean;
  ambientColor: string;
  ambientIntensity: number;
  horizonGlowIntensity: number;
  warmTintStrength: number;
};

function useWarmTint(color: string, strength: number) {
  return useMemo(() => {
    const tinted = new Color(color);
    tinted.lerp(WARM_TINT, MathUtils.clamp(strength, 0, 1));
    return tinted;
  }, [color, strength]);
}

function HeroLightingControls() {
  const [lighting, setLighting] = useControls(
    "Hero Lighting",
    () => ({
      "Sun / Key Light": folder(
        {
          sunEnabled: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "sunEnabled",
              true,
            ),
            label: "Enabled",
          },
          sunColor: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "sunColor",
              "#ffe1b8",
            ),
            label: "Color",
          },
          sunIntensity: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "sunIntensity",
              4.4,
            ),
            min: 0,
            max: 12,
            step: 0.01,
            label: "Intensity",
          },
          sunPositionX: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "sunPositionX",
              7.8,
            ),
            min: -24,
            max: 24,
            step: 0.01,
            label: "Position X",
          },
          sunPositionY: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "sunPositionY",
              6.2,
            ),
            min: -8,
            max: 24,
            step: 0.01,
            label: "Position Y",
          },
          sunPositionZ: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "sunPositionZ",
              4.8,
            ),
            min: -24,
            max: 24,
            step: 0.01,
            label: "Position Z",
          },
        },
        { collapsed: false },
      ),
      "Fill Light": folder(
        {
          fillEnabled: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "fillEnabled",
              true,
            ),
            label: "Enabled",
          },
          fillColor: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "fillColor",
              "#f3d0b4",
            ),
            label: "Color",
          },
          fillIntensity: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "fillIntensity",
              1.2,
            ),
            min: 0,
            max: 8,
            step: 0.01,
            label: "Intensity",
          },
          fillPositionX: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "fillPositionX",
              -6,
            ),
            min: -24,
            max: 24,
            step: 0.01,
            label: "Position X",
          },
          fillPositionY: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "fillPositionY",
              -2.2,
            ),
            min: -12,
            max: 18,
            step: 0.01,
            label: "Position Y",
          },
          fillPositionZ: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "fillPositionZ",
              -8,
            ),
            min: -32,
            max: 18,
            step: 0.01,
            label: "Position Z",
          },
        },
        { collapsed: false },
      ),
      "Ambient / Soft Light": folder(
        {
          ambientEnabled: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "ambientEnabled",
              true,
            ),
            label: "Enabled",
          },
          ambientColor: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "ambientColor",
              "#fff1dc",
            ),
            label: "Color",
          },
          ambientIntensity: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "ambientIntensity",
              1.08,
            ),
            min: 0,
            max: 5,
            step: 0.01,
            label: "Intensity",
          },
        },
        { collapsed: false },
      ),
      "Glow Helpers": folder(
        {
          horizonGlowIntensity: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "horizonGlowIntensity",
              2,
            ),
            min: 0,
            max: 8,
            step: 0.01,
            label: "Horizon glow",
          },
          warmTintStrength: {
            value: getDeploymentHeroLevaValue(
              "heroLighting",
              "warmTintStrength",
              0,
            ),
            min: 0,
            max: 1,
            step: 0.01,
            label: "Warm tint",
          },
        },
        { collapsed: true },
      ),
    }),
    { collapsed: false, order: 3 },
    [],
  ) as unknown as [
    HeroLightingValues,
    (values: Partial<HeroLightingValues>) => void,
  ];
  const valuesRef = useRef<HeroLightingValues>(lighting);
  valuesRef.current = lighting;

  useEffect(() => {
    return registerHeroLevaPresetScope("heroLighting", {
      getValues: () =>
        pickPresetValues(valuesRef.current, HERO_LIGHTING_PRESET_KEYS),
      applyValues: setLighting as (values: Record<string, unknown>) => void,
    });
  }, [setLighting]);

  return <HeroLightingScene lighting={lighting} />;
}

function getDeploymentHeroLightingValues(): HeroLightingValues {
  return {
    sunEnabled: getDeploymentHeroLevaValue("heroLighting", "sunEnabled", true),
    sunColor: getDeploymentHeroLevaValue(
      "heroLighting",
      "sunColor",
      "#ffe1b8",
    ),
    sunIntensity: getDeploymentHeroLevaValue(
      "heroLighting",
      "sunIntensity",
      4.4,
    ),
    sunPositionX: getDeploymentHeroLevaValue(
      "heroLighting",
      "sunPositionX",
      7.8,
    ),
    sunPositionY: getDeploymentHeroLevaValue(
      "heroLighting",
      "sunPositionY",
      6.2,
    ),
    sunPositionZ: getDeploymentHeroLevaValue(
      "heroLighting",
      "sunPositionZ",
      4.8,
    ),
    fillEnabled: getDeploymentHeroLevaValue(
      "heroLighting",
      "fillEnabled",
      true,
    ),
    fillColor: getDeploymentHeroLevaValue(
      "heroLighting",
      "fillColor",
      "#f3d0b4",
    ),
    fillIntensity: getDeploymentHeroLevaValue(
      "heroLighting",
      "fillIntensity",
      1.2,
    ),
    fillPositionX: getDeploymentHeroLevaValue(
      "heroLighting",
      "fillPositionX",
      -6,
    ),
    fillPositionY: getDeploymentHeroLevaValue(
      "heroLighting",
      "fillPositionY",
      -2.2,
    ),
    fillPositionZ: getDeploymentHeroLevaValue(
      "heroLighting",
      "fillPositionZ",
      -8,
    ),
    ambientEnabled: getDeploymentHeroLevaValue(
      "heroLighting",
      "ambientEnabled",
      true,
    ),
    ambientColor: getDeploymentHeroLevaValue(
      "heroLighting",
      "ambientColor",
      "#fff1dc",
    ),
    ambientIntensity: getDeploymentHeroLevaValue(
      "heroLighting",
      "ambientIntensity",
      1.08,
    ),
    horizonGlowIntensity: getDeploymentHeroLevaValue(
      "heroLighting",
      "horizonGlowIntensity",
      2,
    ),
    warmTintStrength: getDeploymentHeroLevaValue(
      "heroLighting",
      "warmTintStrength",
      0,
    ),
  };
}

function HeroLightingScene({ lighting }: { lighting: HeroLightingValues }) {
  const sunColor = useWarmTint(lighting.sunColor, lighting.warmTintStrength);
  const fillColor = useWarmTint(lighting.fillColor, lighting.warmTintStrength);
  const ambientColor = useWarmTint(
    lighting.ambientColor,
    lighting.warmTintStrength,
  );
  const horizonGlowColor = useWarmTint(
    "#ffd2a3",
    lighting.warmTintStrength,
  );

  return (
    <>
      {lighting.ambientEnabled ? (
        <ambientLight
          intensity={lighting.ambientIntensity}
          color={ambientColor}
        />
      ) : null}
      {lighting.sunEnabled ? (
        <directionalLight
          position={[
            lighting.sunPositionX,
            lighting.sunPositionY,
            lighting.sunPositionZ,
          ]}
          intensity={lighting.sunIntensity}
          color={sunColor}
        />
      ) : null}
      {lighting.fillEnabled ? (
        <pointLight
          position={[
            lighting.fillPositionX,
            lighting.fillPositionY,
            lighting.fillPositionZ,
          ]}
          intensity={lighting.fillIntensity}
          color={fillColor}
        />
      ) : null}
      {lighting.horizonGlowIntensity > 0 ? (
        <pointLight
          position={[8, 1.2, -7]}
          intensity={lighting.horizonGlowIntensity}
          color={horizonGlowColor}
        />
      ) : null}
    </>
  );
}

export default function HeroLightingRig() {
  if (isProductionDeployment()) {
    return <HeroLightingScene lighting={getDeploymentHeroLightingValues()} />;
  }

  return <HeroLightingControls />;
}
