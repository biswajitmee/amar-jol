"use client";

import type { ISheet } from "@theatre/core";
import HeroBottleStage from "./HeroBottleStage";
import type { HeroBottleSettings } from "./HeroBottleTypes";
import HeroWaterStage from "./HeroWaterStage";
import LumiereBottleStage from "./LumiereBottleStage";
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
      <LumiereBottleStage theatreSheet={theatreSheet} />
    </>
  );
}
