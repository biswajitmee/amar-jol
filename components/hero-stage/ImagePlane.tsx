"use client";

import { types, type ISheet } from "@theatre/core";
import { useEffect, useMemo, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { MathUtils, SRGBColorSpace, TextureLoader } from "three";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type ImagePlaneTheatreValues = {
  visible: boolean;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
  opacity: number;
};

type ImagePlaneProps = {
  url: string;
  theatreSheet: ISheet;
};

const imagePlaneTheatreConfig = {
  visible: types.boolean(true),
  position: {
    x: types.number(0),
    y: types.number(0.8),
    z: types.number(-8),
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
  opacity: types.number(1, { range: [0, 1] }),
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreImagePlane(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Image Plane";
  let imagePlaneObject = theatreObjects.get(objectKey);

  if (!imagePlaneObject) {
    imagePlaneObject = theatreSheet.object(
      "Image Plane",
      imagePlaneTheatreConfig,
    );
    theatreObjects.set(objectKey, imagePlaneObject);
  }

  return imagePlaneObject;
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

export default function ImagePlane({
  url,
  theatreSheet,
}: ImagePlaneProps) {
  const texture = useLoader(TextureLoader, url);
  const imagePlaneObject = useMemo(
    () => getTheatreImagePlane(theatreSheet),
    [theatreSheet],
  );

  const [theatreValues, setTheatreValues] = useState<ImagePlaneTheatreValues>(
    () => imagePlaneObject.value as ImagePlaneTheatreValues,
  );

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => {
    const unsubscribe = imagePlaneObject.onValuesChange(
      (values: ImagePlaneTheatreValues) => {
        setTheatreValues(values as ImagePlaneTheatreValues);
      },
    );

    return unsubscribe;
  }, [imagePlaneObject]);

  return (
    <mesh
      position={vectorToArray(theatreValues.position)}
      rotation={rotationToRadians(theatreValues.rotation)}
      scale={vectorToArray(theatreValues.scale)}
      visible={theatreValues.visible}
      renderOrder={5}
    >
      <planeGeometry args={[3500, 1600, 1, 1]} />

      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        premultipliedAlpha={false}
        fog={false}
        depthWrite={false}
        opacity={theatreValues.opacity}
      />
    </mesh>
  );
}
