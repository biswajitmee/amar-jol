"use client";

import type { ISheet } from "@theatre/core";
import HeroBottleStage from "./HeroBottleStage";
import type { HeroBottleSettings } from "./HeroBottleTypes";
import HeroWaterStage from "./HeroWaterStage";

type HeroStageSceneProps = {
  settings: HeroBottleSettings;
  theatreSheet: ISheet;
};

export default function HeroStageScene({
  settings,
  theatreSheet,
}: HeroStageSceneProps) {
  return (
    <>
      <HeroWaterStage theatreSheet={theatreSheet} />
      <HeroBottleStage settings={settings} theatreSheet={theatreSheet} />
    </>
  );
}
