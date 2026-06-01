"use client";

import { types, type ISheet } from "@theatre/core";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MathUtils } from "three";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type UnderwaterGodRaysTheatreValues = {
  position: Vector3Values;
  rotation: Vector3Values;
};

export type UnderwaterGodRaysTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
};

type UnderwaterGodRaysStageProps = {
  theatreSheet: ISheet;
  children: (transform: UnderwaterGodRaysTransform) => ReactNode;
};

const underwaterGodRaysTheatreConfig = {
  position: {
    x: types.number(0.8, { range: [-100, 100] }),
    y: types.number(0.03, { range: [-100, 100] }),
    z: types.number(1.24, { range: [-100, 100] }),
  },
  rotation: {
    x: types.number(0, { range: [-180, 180] }),
    y: types.number(0, { range: [-180, 180] }),
    z: types.number(-5, { range: [-180, 180] }),
  },
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreUnderwaterGodRays(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Underwater God Rays";
  let godRaysObject = theatreObjects.get(objectKey);

  if (!godRaysObject) {
    godRaysObject = theatreSheet.object(
      "Underwater God Rays",
      underwaterGodRaysTheatreConfig,
    );
    theatreObjects.set(objectKey, godRaysObject);
  }

  return godRaysObject;
}

function vectorToArray(value: Vector3Values): [number, number, number] {
  return [value.x, value.y, value.z];
}

function rotationToRadians(value: Vector3Values): [number, number, number] {
  return [
    MathUtils.degToRad(value.x),
    MathUtils.degToRad(value.y),
    MathUtils.degToRad(value.z),
  ];
}

export default function UnderwaterGodRaysStage({
  theatreSheet,
  children,
}: UnderwaterGodRaysStageProps) {
  const godRaysObject = useMemo(
    () => getTheatreUnderwaterGodRays(theatreSheet),
    [theatreSheet],
  );
  const [theatreValues, setTheatreValues] =
    useState<UnderwaterGodRaysTheatreValues>(
      () => godRaysObject.value as UnderwaterGodRaysTheatreValues,
    );

  useEffect(() => {
    const unsubscribe = godRaysObject.onValuesChange(
      (values: UnderwaterGodRaysTheatreValues) => {
        setTheatreValues(values as UnderwaterGodRaysTheatreValues);
      },
    );

    return unsubscribe;
  }, [godRaysObject]);

  return (
    <>
      {children({
        position: vectorToArray(theatreValues.position),
        rotation: rotationToRadians(theatreValues.rotation),
      })}
    </>
  );
}
