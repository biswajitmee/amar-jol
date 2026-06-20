"use client";

import { types, type ISheet } from "@theatre/core";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MathUtils } from "three";
import HalfRoll from "./HalfRoll";
import TextWheel from "./TextWheel";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type HalfRollTheatreValues = {
  visible: boolean;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
  yOffset: number;
  radius: number;
  reverse: boolean;
};

type TextWheelTheatreValues = {
  visible: boolean;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
  yOffset: number;
  radius: number;
  fontSize: number;
  reverse: boolean;
};

type GalleryWheelStageProps = {
  theatreSheet: ISheet;
};

const galleryWheelImages = [
  "/horizontal-gallery/photography/catagory1/image1.jpg",
  "/horizontal-gallery/photography/catagory2/image1.jpg",
  "/horizontal-gallery/photography/catagory3/image1.jpg",
  "/horizontal-gallery/photography/catagory4/image1.jpg",
  "/horizontal-gallery/photography/catagory5/image1.jpg",
  "/horizontal-gallery/photography/catagory6/image1.jpg",
  "/horizontal-gallery/photography/catagory7/image1.jpg",
  "/horizontal-gallery/photography/catagory8/image1.jpg",
];

const textWheelWords = "RGB * Pixel * Lab * ".repeat(4).split(" ");

const halfRollTheatreConfig = {
  visible: types.boolean(true),
  position: {
    x: types.number(0),
    y: types.number(-4.2),
    z: types.number(5),
  },
  rotation: {
    x: types.number(0),
    y: types.number(0),
    z: types.number(0),
  },
  scale: {
    x: types.number(0.45),
    y: types.number(0.45),
    z: types.number(0.45),
  },
  yOffset: types.number(0, { range: [-20, 20] }),
  radius: types.number(18, { range: [2, 60] }),
  reverse: types.boolean(false),
};

const textWheelTheatreConfig = {
  visible: types.boolean(true),
  position: {
    x: types.number(0),
    y: types.number(-5.55),
    z: types.number(5),
  },
  rotation: {
    x: types.number(0),
    y: types.number(0),
    z: types.number(0),
  },
  scale: {
    x: types.number(0.45),
    y: types.number(0.45),
    z: types.number(0.45),
  },
  yOffset: types.number(0, { range: [-20, 20] }),
  radius: types.number(20, { range: [2, 80] }),
  fontSize: types.number(2.2, { range: [0.1, 10] }),
  reverse: types.boolean(false),
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreObject(
  theatreSheet: ISheet,
  objectName: string,
  config: any,
) {
  const objectKey = `Water Hero Screen/Hero Camera/${objectName}`;
  let theatreObject = theatreObjects.get(objectKey);

  if (!theatreObject) {
    theatreObject = theatreSheet.object(objectName, config);
    theatreObjects.set(objectKey, theatreObject);
  }

  return theatreObject;
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

export default function GalleryWheelStage({
  theatreSheet,
}: GalleryWheelStageProps) {
  const halfRollObject = useMemo(
    () => getTheatreObject(theatreSheet, "Half Roll", halfRollTheatreConfig),
    [theatreSheet],
  );
  const textWheelObject = useMemo(
    () => getTheatreObject(theatreSheet, "Text Wheel", textWheelTheatreConfig),
    [theatreSheet],
  );
  const [halfRollValues, setHalfRollValues] =
    useState<HalfRollTheatreValues>(
      () => halfRollObject.value as HalfRollTheatreValues,
    );
  const [textWheelValues, setTextWheelValues] =
    useState<TextWheelTheatreValues>(
      () => textWheelObject.value as TextWheelTheatreValues,
    );

  useEffect(() => {
    const unsubscribe = halfRollObject.onValuesChange(
      (values: HalfRollTheatreValues) => {
        setHalfRollValues(values as HalfRollTheatreValues);
      },
    );

    return unsubscribe;
  }, [halfRollObject]);

  useEffect(() => {
    const unsubscribe = textWheelObject.onValuesChange(
      (values: TextWheelTheatreValues) => {
        setTextWheelValues(values as TextWheelTheatreValues);
      },
    );

    return unsubscribe;
  }, [textWheelObject]);

  return (
    <Suspense fallback={null}>
      <group
        position={vectorToArray(halfRollValues.position)}
        rotation={rotationToRadians(halfRollValues.rotation)}
        scale={vectorToArray(halfRollValues.scale)}
        visible={halfRollValues.visible}
      >
        <HalfRoll
          images={galleryWheelImages}
          radius={halfRollValues.radius}
          reverse={halfRollValues.reverse}
          yOffset={halfRollValues.yOffset}
        />
      </group>
      <group
        position={vectorToArray(textWheelValues.position)}
        rotation={rotationToRadians(textWheelValues.rotation)}
        scale={vectorToArray(textWheelValues.scale)}
        visible={textWheelValues.visible}
      >
        <TextWheel
          fontSize={textWheelValues.fontSize}
          radius={textWheelValues.radius}
          reverse={textWheelValues.reverse}
          texts={textWheelWords}
          yOffset={textWheelValues.yOffset}
        />
      </group>
    </Suspense>
  );
}
