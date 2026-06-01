"use client";

import { types, type ISheet } from "@theatre/core";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MathUtils } from "three";
import HelixaBubblePath from "@/src/waterpro/objects/HelixaBubblePath.jsx";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type HelixaBubblePathTheatreValues = {
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
};

type HelixaBubblePathStageProps = {
  theatreSheet: ISheet;
};

const helixaBubblePathTheatreConfig = {
  position: {
    x: types.number(0),
    y: types.number(1.92),
    z: types.number(-3.8),
  },
  rotation: {
    x: types.number(0),
    y: types.number(0),
    z: types.number(0),
  },
  scale: {
    x: types.number(1),
    y: types.number(1),
    z: types.number(1),
  },
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreHelixaBubblePath(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Helixa Bubble Path";
  let helixaBubblePathObject = theatreObjects.get(objectKey);

  if (!helixaBubblePathObject) {
    helixaBubblePathObject = theatreSheet.object(
      "Helixa Bubble Path",
      helixaBubblePathTheatreConfig,
    );
    theatreObjects.set(objectKey, helixaBubblePathObject);
  }

  return helixaBubblePathObject;
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

export default function HelixaBubblePathStage({
  theatreSheet,
}: HelixaBubblePathStageProps) {
  const helixaBubblePathObject = useMemo(
    () => getTheatreHelixaBubblePath(theatreSheet),
    [theatreSheet],
  );
  const [theatreValues, setTheatreValues] =
    useState<HelixaBubblePathTheatreValues>(
      () => helixaBubblePathObject.value as HelixaBubblePathTheatreValues,
    );

  useEffect(() => {
    const unsubscribe = helixaBubblePathObject.onValuesChange(
      (values: HelixaBubblePathTheatreValues) => {
        setTheatreValues(values as HelixaBubblePathTheatreValues);
      },
    );

    return unsubscribe;
  }, [helixaBubblePathObject]);

  return (
    <group
      position={vectorToArray(theatreValues.position)}
      rotation={rotationToRadians(theatreValues.rotation)}
      scale={vectorToArray(theatreValues.scale)}
      renderOrder={78}
    >
      <Suspense fallback={null}>
        <HelixaBubblePath />
      </Suspense>
    </group>
  );
}
