"use client";

import { types, type ISheet } from "@theatre/core";
import { Suspense, useEffect, useMemo, useState } from "react";
import AurenBottleModel from "./AurenBottleModel";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type AurenBottleTheatreValues = {
  showModel: boolean;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: number;
};

type AurenBottleStageProps = {
  theatreSheet: ISheet;
};

const aurenBottleTheatreConfig = {
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

function getTheatreAurenBottle(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Auren Bottle";
  let aurenBottleObject = theatreObjects.get(objectKey);

  if (!aurenBottleObject) {
    aurenBottleObject = theatreSheet.object(
      "Auren Bottle",
      aurenBottleTheatreConfig,
    );
    theatreObjects.set(objectKey, aurenBottleObject);
  }

  return aurenBottleObject;
}

function toVectorArray(value: Vector3Values): [number, number, number] {
  return [value.x, value.y, value.z];
}

export default function AurenBottleStage({
  theatreSheet,
}: AurenBottleStageProps) {
  const aurenBottleObject = useMemo(
    () => getTheatreAurenBottle(theatreSheet),
    [theatreSheet],
  );
  const [theatreValues, setTheatreValues] =
    useState<AurenBottleTheatreValues>(
      () => aurenBottleObject.value as AurenBottleTheatreValues,
    );

  useEffect(() => {
    const unsubscribe = aurenBottleObject.onValuesChange(
      (values: AurenBottleTheatreValues) => {
        setTheatreValues(values as AurenBottleTheatreValues);
      },
    );

    return unsubscribe;
  }, [aurenBottleObject]);

  return (
    <Suspense fallback={null}>
      <AurenBottleModel
        visible={theatreValues.showModel}
        position={toVectorArray(theatreValues.position)}
        rotation={toVectorArray(theatreValues.rotation)}
        scale={theatreValues.scale}
      />
    </Suspense>
  );
}
