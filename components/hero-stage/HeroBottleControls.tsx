"use client";

import { useControls } from "leva";
import type { HeroBottleSettings } from "./HeroBottleTypes";

export function useHeroBottleControls() {
  const bottle = useControls(
    "Hero Bottle",
    {
      showBottle: true,
      bottleX: { value: 0, min: -8, max: 8, step: 0.01 },
      bottleY: { value: 1.08, min: -0.6, max: 4, step: 0.01 },
      bottleZ: { value: -3.8, min: -24, max: 12, step: 0.01 },
      bottleScale: { value: 1.08, min: 0.35, max: 2.4, step: 0.01 },
      bottleOpacity: { value: 0.72, min: 0.2, max: 1, step: 0.01 },
    },
    { collapsed: false, order: 0 },
  );

  return bottle as HeroBottleSettings;
}
