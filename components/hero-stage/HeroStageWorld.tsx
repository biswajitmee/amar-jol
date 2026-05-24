"use client";

import type { ISheet } from "@theatre/core";
import { isProductionDeployment } from "@/src/waterpro/debug/deploymentLevaPresets";
import {
  getDeploymentHeroBottleSettings,
  useHeroBottleControls,
} from "./HeroBottleControls";
import HeroStageScene from "./HeroStageScene";

type HeroStageWorldProps = {
  theatreSheet: ISheet;
};

export default function HeroStageWorld({ theatreSheet }: HeroStageWorldProps) {
  if (isProductionDeployment()) {
    return (
      <HeroStageScene
        settings={getDeploymentHeroBottleSettings()}
        theatreSheet={theatreSheet}
      />
    );
  }

  return <HeroStageWorldWithControls theatreSheet={theatreSheet} />;
}

function HeroStageWorldWithControls({ theatreSheet }: HeroStageWorldProps) {
  const settings = useHeroBottleControls();

  return <HeroStageScene settings={settings} theatreSheet={theatreSheet} />;
}
