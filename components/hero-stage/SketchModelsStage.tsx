"use client";

import { types, type ISheet } from "@theatre/core";
import { Suspense, useEffect, useMemo, useState } from "react";
import SketchModel, { preloadSketchModel } from "./SketchModel";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type SketchModelDefinition = {
  id: string;
  objectName: string;
  url: string;
  defaultPosition: Vector3Values;
  defaultRotation: Vector3Values;
  defaultScale: number;
  targetHeight: number;
  renderOrder: number;
};

type SketchModelTheatreValues = {
  showModel: boolean;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: number;
};

type SketchModelsStageProps = {
  theatreSheet: ISheet;
};

const sketchModels = [
  {
    id: "flower-candle",
    objectName: "Sketch Flower Candle",
    url: "/api/models/sketch/flower-candle",
    defaultPosition: { x: -3.3, y: 0, z: -10.5 },
    defaultRotation: { x: 0, y: -18, z: 0 },
    defaultScale: 1,
    targetHeight: 2.1,
    renderOrder: 56,
  },
  {
    id: "flower",
    objectName: "Sketch Flower",
    url: "/api/models/sketch/flower",
    defaultPosition: { x: -1.1, y: 0, z: -10.5 },
    defaultRotation: { x: 0, y: -6, z: 0 },
    defaultScale: 1,
    targetHeight: 2.1,
    renderOrder: 57,
  },
  {
    id: "flower-magic",
    objectName: "Sketch Flower Magic",
    url: "/api/models/sketch/flower-magic",
    defaultPosition: { x: 1.1, y: 0, z: -10.5 },
    defaultRotation: { x: 0, y: 8, z: 0 },
    defaultScale: 1,
    targetHeight: 2.1,
    renderOrder: 58,
  },
  {
    id: "glowing-flower",
    objectName: "Sketch Glowing Flower",
    url: "/api/models/sketch/glowing-flower",
    defaultPosition: { x: 3.3, y: 0, z: -10.5 },
    defaultRotation: { x: 0, y: 18, z: 0 },
    defaultScale: 1,
    targetHeight: 2.1,
    renderOrder: 59,
  },
] satisfies SketchModelDefinition[];

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function createSketchModelTheatreConfig(model: SketchModelDefinition) {
  return {
    showModel: types.boolean(true),
    position: {
      x: types.number(model.defaultPosition.x, { range: [-24, 24] }),
      y: types.number(model.defaultPosition.y, { range: [-24, 24] }),
      z: types.number(model.defaultPosition.z, { range: [-48, 12] }),
    },
    rotation: {
      x: types.number(model.defaultRotation.x, { range: [-360, 360] }),
      y: types.number(model.defaultRotation.y, { range: [-360, 360] }),
      z: types.number(model.defaultRotation.z, { range: [-360, 360] }),
    },
    scale: types.number(model.defaultScale, { range: [0.01, 30] }),
  };
}

function getTheatreSketchModel(
  theatreSheet: ISheet,
  model: SketchModelDefinition,
) {
  const objectKey = `Water Hero Screen/Hero Camera/${model.objectName}`;
  let sketchModelObject = theatreObjects.get(objectKey);

  if (!sketchModelObject) {
    sketchModelObject = theatreSheet.object(
      model.objectName,
      createSketchModelTheatreConfig(model),
    );
    theatreObjects.set(objectKey, sketchModelObject);
  }

  return sketchModelObject;
}

function vectorToArray(value: Vector3Values): [number, number, number] {
  return [value.x, value.y, value.z];
}

function SketchModelStage({
  model,
  theatreSheet,
}: {
  model: SketchModelDefinition;
  theatreSheet: ISheet;
}) {
  const sketchModelObject = useMemo(
    () => getTheatreSketchModel(theatreSheet, model),
    [model, theatreSheet],
  );
  const [theatreValues, setTheatreValues] =
    useState<SketchModelTheatreValues>(
      () => sketchModelObject.value as SketchModelTheatreValues,
    );

  useEffect(() => {
    const unsubscribe = sketchModelObject.onValuesChange(
      (values: SketchModelTheatreValues) => {
        setTheatreValues(values as SketchModelTheatreValues);
      },
    );

    return unsubscribe;
  }, [sketchModelObject]);

  return (
    <Suspense fallback={null}>
      <SketchModel
        modelUrl={model.url}
        visible={theatreValues.showModel}
        position={vectorToArray(theatreValues.position)}
        rotation={vectorToArray(theatreValues.rotation)}
        scale={theatreValues.scale}
        targetHeight={model.targetHeight}
        renderOrder={model.renderOrder}
      />
    </Suspense>
  );
}

export default function SketchModelsStage({
  theatreSheet,
}: SketchModelsStageProps) {
  return (
    <>
      {sketchModels.map((model) => (
        <SketchModelStage
          key={model.id}
          model={model}
          theatreSheet={theatreSheet}
        />
      ))}
    </>
  );
}

sketchModels.forEach((model) => preloadSketchModel(model.url));
