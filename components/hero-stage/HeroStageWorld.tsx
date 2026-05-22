"use client";

import type { ISheet } from "@theatre/core";
import { useHeroBottleControls } from "./HeroBottleControls";
import HeroStageScene from "./HeroStageScene";

type HeroStageWorldProps = {
  theatreSheet: ISheet;
};

export default function HeroStageWorld({ theatreSheet }: HeroStageWorldProps) {
  const settings = useHeroBottleControls();

  return <HeroStageScene settings={settings} theatreSheet={theatreSheet} />;
}
