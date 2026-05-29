"use client";

import { types, type ISheet } from "@theatre/core";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MathUtils } from "three";
import HelixPetalFlow from "@/src/waterpro/objects/HelixPetalFlow.jsx";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type HelixPetalFlowTheatreValues = {
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
};

type HelixPetalFlowStageProps = {
  theatreSheet: ISheet;
};

const helixPetalFlowTheatreConfig = {
  position: {
    x: types.number(0, { range: [-4, 4] }),
    y: types.number(2.22, { range: [-1, 5] }),
    z: types.number(-3.8, { range: [-8, 2] }),
  },
  rotation: {
    x: types.number(0, { range: [-180, 180] }),
    y: types.number(0, { range: [-180, 180] }),
    z: types.number(0, { range: [-180, 180] }),
  },
  scale: {
    x: types.number(1, { range: [0.1, 4] }),
    y: types.number(1, { range: [0.1, 4] }),
    z: types.number(1, { range: [0.1, 4] }),
  },
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreHelixPetalFlow(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Helix Petal Flow";
  let helixPetalFlowObject = theatreObjects.get(objectKey);

  if (!helixPetalFlowObject) {
    helixPetalFlowObject = theatreSheet.object(
      "Helix Petal Flow",
      helixPetalFlowTheatreConfig,
    );
    theatreObjects.set(objectKey, helixPetalFlowObject);
  }

  return helixPetalFlowObject;
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

export default function HelixPetalFlowStage({
  theatreSheet,
}: HelixPetalFlowStageProps) {
  const helixPetalFlowObject = useMemo(
    () => getTheatreHelixPetalFlow(theatreSheet),
    [theatreSheet],
  );
  const [theatreValues, setTheatreValues] =
    useState<HelixPetalFlowTheatreValues>(
      () => helixPetalFlowObject.value as HelixPetalFlowTheatreValues,
    );

  useEffect(() => {
    const unsubscribe = helixPetalFlowObject.onValuesChange(
      (values: HelixPetalFlowTheatreValues) => {
        setTheatreValues(values as HelixPetalFlowTheatreValues);
      },
    );

    return unsubscribe;
  }, [helixPetalFlowObject]);

  return (
    <group
      position={vectorToArray(theatreValues.position)}
      rotation={rotationToRadians(theatreValues.rotation)}
      scale={vectorToArray(theatreValues.scale)}
      renderOrder={40}
    >
      <Suspense fallback={null}>
        <HelixPetalFlow />
      </Suspense>
    </group>
  );
}
