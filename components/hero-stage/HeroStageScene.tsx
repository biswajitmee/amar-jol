"use client";

import type { ISheet } from "@theatre/core";
import AurenBottleStage from "./AurenBottleStage";
import HeroBottleStage from "./HeroBottleStage";
import type { HeroBottleSettings } from "./HeroBottleTypes";
import HeroWaterStage from "./HeroWaterStage";
import SkyImageBackground from "@/src/waterpro/environment/SkyImageBackground.jsx";

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
      <SkyImageBackground />
      <HeroWaterStage theatreSheet={theatreSheet} />
      <HeroBottleStage settings={settings} theatreSheet={theatreSheet} />
      <AurenBottleStage theatreSheet={theatreSheet} />
    </>
  );
}
