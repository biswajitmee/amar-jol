"use client";

import { types, type ISheet } from "@theatre/core";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import CausticsLightProjector from "./imported-biswajit/CausticsLightProjector";
import CloudFloating from "./imported-biswajit/CloudFloating";
import { Fish } from "./imported-biswajit/Fish";
import SandSurface from "./imported-biswajit/SandSurface";
import ShaderSingleBeam from "./imported-biswajit/ShaderSingleBeam";
import UnderwaterTopLight from "./imported-biswajit/UnderwaterTopLight";
import UnderwaterSleeve from "./imported-biswajit/UnderwaterSleeve";

type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

type TransformValues = {
  visible: boolean;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
};

type ImportedBiswajitStageProps = {
  theatreSheet: ISheet;
};

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ?? new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

const sandUrl = "/imported-biswajit/sand.jpg";
const videoUrl = "/imported-biswajit/caustics.mp4";

function vectorConfig(value: Vector3Values) {
  return {
    x: types.number(value.x),
    y: types.number(value.y),
    z: types.number(value.z),
  };
}

function transformConfig(defaults: TransformValues) {
  return {
    visible: types.boolean(defaults.visible),
    position: vectorConfig(defaults.position),
    rotation: vectorConfig(defaults.rotation),
    scale: vectorConfig(defaults.scale),
  };
}

function getTheatreTransform(
  theatreSheet: ISheet,
  theatreKey: string,
  defaults: TransformValues,
) {
  const objectName = `Imported ${theatreKey}`;
  const objectKey = `Water Hero Screen/Hero Camera/${objectName}`;
  let theatreObject = theatreObjects.get(objectKey);

  if (!theatreObject) {
    theatreObject = theatreSheet.object(
      objectName,
      transformConfig(defaults),
    );
    theatreObjects.set(objectKey, theatreObject);
  }

  return theatreObject;
}

function toArray(value: Vector3Values): [number, number, number] {
  return [value.x, value.y, value.z];
}

function rotationToRadians(value: Vector3Values): [number, number, number] {
  return [
    THREE.MathUtils.degToRad(value.x),
    THREE.MathUtils.degToRad(value.y),
    THREE.MathUtils.degToRad(value.z),
  ];
}

function useTheatreTransform(
  theatreSheet: ISheet,
  theatreKey: string,
  defaults: TransformValues,
) {
  const theatreObject = useMemo(
    () => getTheatreTransform(theatreSheet, theatreKey, defaults),
    [defaults, theatreKey, theatreSheet],
  );
  const [values, setValues] = useState<TransformValues>(
    () => theatreObject.value as TransformValues,
  );

  useEffect(() => {
    const unsubscribe = theatreObject.onValuesChange(
      (nextValues: TransformValues) => {
        setValues(nextValues as TransformValues);
      },
    );

    return unsubscribe;
  }, [theatreObject]);

  return values;
}

function EditableGroup({
  theatreSheet,
  theatreKey,
  defaults,
  children,
}: {
  theatreSheet: ISheet;
  theatreKey: string;
  defaults: TransformValues;
  children: ReactNode;
}) {
  const transform = useTheatreTransform(theatreSheet, theatreKey, defaults);
  const isVisible = transform.visible ?? defaults.visible;

  return (
    <group
      visible={isVisible}
      position={toArray(transform.position ?? defaults.position)}
      rotation={rotationToRadians(transform.rotation ?? defaults.rotation)}
      scale={toArray(transform.scale ?? defaults.scale)}
    >
      {isVisible ? children : null}
    </group>
  );
}

const defaults = {
  sandSurface: {
    visible: true,
    position: { x: 0, y: 0, z: -1 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  causticsLightProjector: {
    visible: true,
    position: { x: 0, y: 0, z: -1 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  fishMain: {
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  cloudFrontOfCamera: {
    visible: true,
    position: { x: 0, y: 0, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  cloudFront: {
    visible: true,
    position: { x: 0, y: 0, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  underwaterSleeve: {
    visible: false,
    position: { x: 0, y: 0, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  shaderSingleBeamC: {
    visible: true,
    position: { x: 0, y: 2.5, z: -8 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  underwaterTopLight: {
    visible: false,
    position: { x: 0, y: 24, z: -12 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
} satisfies Record<string, TransformValues>;

export default function ImportedBiswajitStage({
  theatreSheet,
}: ImportedBiswajitStageProps) {
  return (
    <>
      <EditableGroup
        theatreSheet={theatreSheet}
        theatreKey="SandSurface"
        defaults={defaults.sandSurface}
      >
        <SandSurface textureUrl={sandUrl} size={3000} />
      </EditableGroup>

      <EditableGroup
        theatreSheet={theatreSheet}
        theatreKey="CausticsLightProjector"
        defaults={defaults.causticsLightProjector}
      >
        <CausticsLightProjector
          src={videoUrl}
          target={[0, 0, 0]}
          fitRect={[1000, 200]}
          worldCell={180}
          cookieSize={512}
          intensity={28}
          playbackRate={2}
        />
      </EditableGroup>

      <EditableGroup
        theatreSheet={theatreSheet}
        theatreKey="FishMain"
        defaults={defaults.fishMain}
      >
        <Fish scale={100} />
      </EditableGroup>

      <EditableGroup
        theatreSheet={theatreSheet}
        theatreKey="Cloud-front-of-camera"
        defaults={defaults.cloudFrontOfCamera}
      >
        <CloudFloating
          jitterStabilize
          jitterLowpassAlpha={0.06}
          jitterCompStrength={1}
          numPlanes={12}
          opacity={0.52}
          color1="#ffffff"
          color2="#a292aa"
          speed={0.9}
          xSpread={150}
          ySpread={150}
          zSpread={50}
          sharedNoise={{
            worldScale: 0.0098,
            warpAmt: 0.55,
            ridgePower: 1.2,
            ridgeMix: 0.95,
            dir: [-1.0, 0.09],
            driftSpeed: 0.018,
            wobbleFreq: 0.05,
            wobbleMag: 0.12,
            dissolveScale: 3.8,
            dissolveSpeed: 0.03,
            dissolveWidth: 0.11,
          }}
        />
      </EditableGroup>

      <EditableGroup
        theatreSheet={theatreSheet}
        theatreKey="Cloud-front"
        defaults={defaults.cloudFront}
      >
        <CloudFloating
          numPlanes={20}
          opacity={0.5}
          xSpread={70}
          ySpread={70}
          zSpread={250}
          color1="#8d8093"
          color2="#ffffff"
          speed={5.9}
          sharedNoise={{
            worldScale: 50,
            warpAmt: 0.25,
            ridgePower: 0.1,
            ridgeMix: 0.1,
            dir: [-1.0, -0.9],
            driftSpeed: 0.018,
            wobbleFreq: 0.01,
            wobbleMag: 0.02,
            dissolveScale: 3.8,
            dissolveSpeed: 0.03,
            dissolveWidth: 0.11,
          }}
        />
      </EditableGroup>

      {/* <EditableGroup
        theatreSheet={theatreSheet}
        theatreKey="UnderwaterSleeve"
        defaults={defaults.underwaterSleeve}
      >
        <UnderwaterSleeve
          topY={40}
          depth={180}
          radius={120}
          onlyWhenUnderwater={false}
          opacity={0.36}
        />
      </EditableGroup> */}

      <EditableGroup
        theatreSheet={theatreSheet}
        theatreKey="ShaderSingleBeam_C"
        defaults={defaults.shaderSingleBeamC}
      >
        <ShaderSingleBeam
          size={[9, 5]}
          slices={4}
          gap={0.08}
          position={[0, 0, 0]}
          rotation={[0, 0, THREE.MathUtils.degToRad(8)]}
          intensity={0.55}
          seedOffset={50}
          renderOrderBase={20}
        />
      </EditableGroup>

      <EditableGroup
        theatreSheet={theatreSheet}
        theatreKey="Underwater Top Light"
        defaults={defaults.underwaterTopLight}
      >
        <UnderwaterTopLight />
      </EditableGroup>
    </>
  );
}
