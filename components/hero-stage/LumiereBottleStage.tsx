"use client";

import { types, type ISheet } from "@theatre/core";
import { Suspense, useEffect, useMemo, useState } from "react";
import LumiereBottleModel from "./LumiereBottleModel";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type LumiereBottleTheatreValues = {
  showModel: boolean;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: number;
};

type LumiereBottleStageProps = {
  theatreSheet: ISheet;
};

const lumiereBottleTheatreConfig = {
  showModel: types.boolean(true),
  position: {
    x: types.number(0),
    y: types.number(1),
    z: types.number(-3.8),
  },
  rotation: {
    x: types.number(0),
    y: types.number(0),
    z: types.number(0),
  },
  scale: types.number(1),
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreLumiereBottle(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Lumiere de la Mer Bottle";
  let lumiereBottleObject = theatreObjects.get(objectKey);

  if (!lumiereBottleObject) {
    lumiereBottleObject = theatreSheet.object(
      "Lumiere de la Mer Bottle",
      lumiereBottleTheatreConfig,
    );
    theatreObjects.set(objectKey, lumiereBottleObject);
  }

  return lumiereBottleObject;
}

function toVectorArray(value: Vector3Values): [number, number, number] {
  return [value.x, value.y, value.z];
}

export default function LumiereBottleStage({
  theatreSheet,
}: LumiereBottleStageProps) {
  const lumiereBottleObject = useMemo(
    () => getTheatreLumiereBottle(theatreSheet),
    [theatreSheet],
  );
  const [theatreValues, setTheatreValues] =
    useState<LumiereBottleTheatreValues>(
      () => lumiereBottleObject.value as LumiereBottleTheatreValues,
    );

  useEffect(() => {
    const unsubscribe = lumiereBottleObject.onValuesChange(
      (values: LumiereBottleTheatreValues) => {
        setTheatreValues(values as LumiereBottleTheatreValues);
      },
    );

    return unsubscribe;
  }, [lumiereBottleObject]);

  return (
    <Suspense fallback={null}>
      <LumiereBottleModel
        visible={theatreValues.showModel}
        position={toVectorArray(theatreValues.position)}
        rotation={toVectorArray(theatreValues.rotation)}
        scale={theatreValues.scale}
      />
    </Suspense>
  );
}
