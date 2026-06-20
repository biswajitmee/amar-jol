"use client";

import type { ISheet } from "@theatre/core";
import HeroBottleStage from "./HeroBottleStage";
import HelixaBubblePathStage from "./HelixaBubblePathStage";
import HelixPetalFlowStage from "./HelixPetalFlowStage";
import type { HeroBottleSettings } from "./HeroBottleTypes";
import HeroWaterStage from "./HeroWaterStage";
import ImportedBiswajitStage from "./ImportedBiswajitStage";
import LumiereBottleStage from "./LumiereBottleStage";
import SketchModelsStage from "./SketchModelsStage";
import GalleryWheelStage from "./GalleryWheelStage";
// import ImagePlane from "./ImagePlane";

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
      <HelixPetalFlowStage theatreSheet={theatreSheet} />
      <HelixaBubblePathStage theatreSheet={theatreSheet} />
      <SketchModelsStage theatreSheet={theatreSheet} />
      <ImportedBiswajitStage theatreSheet={theatreSheet} />
      <GalleryWheelStage theatreSheet={theatreSheet} />
      {/* <ImagePlane url="/door.png" theatreSheet={theatreSheet} /> */}


    </>
  );
}
