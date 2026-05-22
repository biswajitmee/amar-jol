"use client";

import { types, type ISheet } from "@theatre/core";
import { useEffect, useMemo, useState } from "react";
import HeroSkincareBottle from "./HeroSkincareBottle";
import type { HeroBottleSettings } from "./HeroBottleTypes";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type BottleTheatreValues = {
  showBottle: boolean;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: number;
  opacity: number;
};

type HeroBottleStageProps = {
  settings: HeroBottleSettings;
  theatreSheet: ISheet;
};

const bottleTheatreConfig = {
  showBottle: types.boolean(true),
  position: {
    x: types.number(0, { range: [-8, 8] }),
    y: types.number(1.08, { range: [-0.6, 4] }),
    z: types.number(-3.8, { range: [-24, 12] }),
  },
  rotation: {
    x: types.number(0, { range: [-90, 90] }),
    y: types.number(0, { range: [-180, 180] }),
    z: types.number(0, { range: [-90, 90] }),
  },
  scale: types.number(1.08, { range: [0.35, 2.4] }),
  opacity: types.number(0.72, { range: [0.2, 1] }),
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreBottle(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Hero Bottle";
  let bottleObject = theatreObjects.get(objectKey);

  if (!bottleObject) {
    bottleObject = theatreSheet.object("Hero Bottle", bottleTheatreConfig);
    theatreObjects.set(objectKey, bottleObject);
  }

  return bottleObject;
}

function toBottleInitialValue(settings: HeroBottleSettings) {
  return {
    showBottle: settings.showBottle,
    position: {
      x: settings.bottleX,
      y: settings.bottleY,
      z: settings.bottleZ,
    },
    rotation: {
      x: settings.bottleRotationX ?? 0,
      y: settings.bottleRotationY ?? 0,
      z: settings.bottleRotationZ ?? 0,
    },
    scale: settings.bottleScale,
    opacity: settings.bottleOpacity,
  };
}

function toBottleSettings(
  settings: HeroBottleSettings,
  values: BottleTheatreValues,
): HeroBottleSettings {
  return {
    ...settings,
    showBottle: values.showBottle,
    bottleX: values.position.x,
    bottleY: values.position.y,
    bottleZ: values.position.z,
    bottleScale: values.scale,
    bottleOpacity: values.opacity,
    bottleRotationX: values.rotation.x,
    bottleRotationY: values.rotation.y,
    bottleRotationZ: values.rotation.z,
  };
}

export default function HeroBottleStage({
  settings,
  theatreSheet,
}: HeroBottleStageProps) {
  const bottleObject = useMemo(
    () => getTheatreBottle(theatreSheet),
    [theatreSheet],
  );
  const [theatreValues, setTheatreValues] = useState<BottleTheatreValues>(
    () => bottleObject.value as BottleTheatreValues,
  );

  useEffect(() => {
    bottleObject.initialValue = toBottleInitialValue(settings);
  }, [
    bottleObject,
    settings.bottleOpacity,
    settings.bottleRotationX,
    settings.bottleRotationY,
    settings.bottleRotationZ,
    settings.bottleScale,
    settings.bottleX,
    settings.bottleY,
    settings.bottleZ,
    settings.showBottle,
  ]);

  useEffect(() => {
    const unsubscribe = bottleObject.onValuesChange((values: BottleTheatreValues) => {
      setTheatreValues(values as BottleTheatreValues);
    });

    return unsubscribe;
  }, [bottleObject]);

  return (
    <HeroSkincareBottle
      settings={toBottleSettings(settings, theatreValues)}
    />
  );
}
