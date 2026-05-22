"use client";

import { types, type ISheet } from "@theatre/core";
import { useEffect, useRef } from "react";
import { Group, MathUtils } from "three";
import WaterPro from "@/src/waterpro/WaterPro.jsx";
import HeroSkincareBottle from "./HeroSkincareBottle";
import type { HeroBottleSettings } from "./HeroBottleTypes";

type TheatreStageValues = {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  scale: number;
};

const stageTheatreConfig = {
  position: {
    x: types.number(0, { range: [-12, 12] }),
    y: types.number(1.08, { range: [-4, 6] }),
    z: types.number(-16.4, { range: [-36, 4] }),
  },
  rotation: {
    x: types.number(0, { range: [-18, 18] }),
    y: types.number(0, { range: [-35, 35] }),
    z: types.number(0, { range: [-10, 10] }),
  },
  scale: types.number(1, { range: [0.4, 2.2] }),
};
const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ??
  new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreStage(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Hero Water Volume";
  let stageObject = theatreObjects.get(objectKey);

  if (!stageObject) {
    stageObject = theatreSheet.object("Hero Water Volume", stageTheatreConfig);
    theatreObjects.set(objectKey, stageObject);
  }

  return stageObject;
}

function applyStageTransform(group: Group, values: TheatreStageValues) {
  group.position.set(values.position.x, values.position.y, values.position.z);
  group.rotation.set(
    MathUtils.degToRad(values.rotation.x),
    MathUtils.degToRad(values.rotation.y),
    MathUtils.degToRad(values.rotation.z),
  );
  group.scale.setScalar(values.scale);
}

type HeroStageSceneProps = {
  settings: HeroBottleSettings;
  theatreSheet: ISheet;
};

export default function HeroStageScene({
  settings,
  theatreSheet,
}: HeroStageSceneProps) {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    const stageObject = getTheatreStage(theatreSheet);

    if (groupRef.current) {
      applyStageTransform(
        groupRef.current,
        stageObject.value as TheatreStageValues,
      );
    }

    const unsubscribe = stageObject.onValuesChange((values: TheatreStageValues) => {
      if (groupRef.current) {
        applyStageTransform(groupRef.current, values as TheatreStageValues);
      }
    });

    return unsubscribe;
  }, [theatreSheet]);

  return (
    <group ref={groupRef}>
      <WaterPro position={[0, 0.06, 12.6]} />
      <HeroSkincareBottle settings={settings} />
    </group>
  );
}
