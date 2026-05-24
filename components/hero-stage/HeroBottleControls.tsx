"use client";

import { useControls } from "leva";
import { useEffect, useRef } from "react";
import { getDeploymentHeroLevaValue } from "@/src/waterpro/debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "@/src/waterpro/debug/heroLevaPresetRegistry";
import type { HeroBottleSettings } from "./HeroBottleTypes";

const HERO_BOTTLE_PRESET_KEYS = [
  "showBottle",
  "bottleX",
  "bottleY",
  "bottleZ",
  "bottleScale",
  "bottleOpacity",
] as const;

export function useHeroBottleControls() {
  const [bottle, setBottle] = useControls(
    "Hero Bottle",
    () => ({
      showBottle: getDeploymentHeroLevaValue("heroBottle", "showBottle", true),
      bottleX: {
        value: getDeploymentHeroLevaValue("heroBottle", "bottleX", 0),
        min: -8,
        max: 8,
        step: 0.01,
      },
      bottleY: {
        value: getDeploymentHeroLevaValue("heroBottle", "bottleY", 1.08),
        min: -0.6,
        max: 4,
        step: 0.01,
      },
      bottleZ: {
        value: getDeploymentHeroLevaValue("heroBottle", "bottleZ", -3.8),
        min: -24,
        max: 12,
        step: 0.01,
      },
      bottleScale: {
        value: getDeploymentHeroLevaValue("heroBottle", "bottleScale", 1.08),
        min: 0.35,
        max: 2.4,
        step: 0.01,
      },
      bottleOpacity: {
        value: getDeploymentHeroLevaValue("heroBottle", "bottleOpacity", 0.72),
        min: 0.2,
        max: 1,
        step: 0.01,
      },
    }),
    { collapsed: false, order: 0 },
    [],
  ) as unknown as [
    HeroBottleSettings,
    (values: Partial<HeroBottleSettings>) => void,
  ];
  const valuesRef = useRef<HeroBottleSettings>(bottle);
  valuesRef.current = bottle;

  useEffect(() => {
    return registerHeroLevaPresetScope("heroBottle", {
      getValues: () =>
        pickPresetValues(valuesRef.current, HERO_BOTTLE_PRESET_KEYS),
      applyValues: setBottle as (values: Record<string, unknown>) => void,
    });
  }, [setBottle]);

  return bottle as HeroBottleSettings;
}

export function getDeploymentHeroBottleSettings(): HeroBottleSettings {
  return {
    showBottle: getDeploymentHeroLevaValue("heroBottle", "showBottle", true),
    bottleX: getDeploymentHeroLevaValue("heroBottle", "bottleX", 0),
    bottleY: getDeploymentHeroLevaValue("heroBottle", "bottleY", 1.08),
    bottleZ: getDeploymentHeroLevaValue("heroBottle", "bottleZ", -3.8),
    bottleScale: getDeploymentHeroLevaValue("heroBottle", "bottleScale", 1.08),
    bottleOpacity: getDeploymentHeroLevaValue(
      "heroBottle",
      "bottleOpacity",
      0.72,
    ),
  };
}
