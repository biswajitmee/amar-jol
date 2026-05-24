"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { getProject, types, type ISheet } from "@theatre/core";
import { Leva } from "leva";
import { useEffect } from "react";
import {
  ACESFilmicToneMapping,
  Camera,
  Color,
  FogExp2,
  MathUtils,
  PerspectiveCamera,
  SRGBColorSpace,
} from "three";
import HeroLightingRig from "@/components/hero-stage/HeroLightingRig";
import HeroStageWorld from "@/components/hero-stage/HeroStageWorld";
import HeroLevaPresetPanel from "@/src/waterpro/debug/HeroLevaPresetPanel.jsx";
import theaterState from "@/theaterstate.json";

const project = getProject("Water Hero Screen", {
  state: theaterState,
});
const sheet = project.sheet("Hero Camera");

type CameraValues = {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  fov: number;
};

const cameraConfig = {
  position: {
    x: types.number(0),
    y: types.number(1.92),
    z: types.number(8.6),
  },
  rotation: {
    x: types.number(8.5),
    y: types.number(0),
    z: types.number(0),
  },
  fov: types.number(45, { range: [24, 80] }),
};
const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroTheatreObjects?: Map<string, any>;
};
const theatreObjects =
  theatreCacheGlobal.__waterHeroTheatreObjects ??
  new Map<string, any>();
theatreCacheGlobal.__waterHeroTheatreObjects = theatreObjects;

function getTheatreCamera(theatreSheet: ISheet) {
  const objectKey = "Water Hero Screen/Hero Camera/Camera";
  let theatreCamera = theatreObjects.get(objectKey);

  if (!theatreCamera) {
    theatreCamera = theatreSheet.object("Camera", cameraConfig);
    theatreObjects.set(objectKey, theatreCamera);
  }

  return theatreCamera;
}

function applyCameraValues(camera: Camera, values: CameraValues) {
  camera.position.set(values.position.x, values.position.y, values.position.z);
  camera.rotation.set(
    MathUtils.degToRad(values.rotation.x),
    MathUtils.degToRad(values.rotation.y),
    MathUtils.degToRad(values.rotation.z),
    "XYZ",
  );

  if (camera instanceof PerspectiveCamera) {
    camera.fov = values.fov;
    camera.updateProjectionMatrix();
  }
}

function useTheatreStudio() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let cancelled = false;

    void import("@theatre/studio").then(({ default: studio }) => {
      if (!cancelled) {
        studio.initialize({
          persistenceKey: "water-hero-screen",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);
}

function TheatreCameraRig({ theatreSheet }: { theatreSheet: ISheet }) {
  const { camera } = useThree();

  useEffect(() => {
    const theatreCamera = getTheatreCamera(theatreSheet);

    applyCameraValues(camera, theatreCamera.value as CameraValues);
    const unsubscribe = theatreCamera.onValuesChange((values: CameraValues) => {
      applyCameraValues(camera, values as CameraValues);
    });

    return unsubscribe;
  }, [camera, theatreSheet]);

  return null;
}

function RendererMood() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const previousFog = scene.fog;

    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.18;
    gl.setClearColor("#EAD0DB", 1);
    scene.fog = new FogExp2(new Color("#EAD0DB"), 0.00028);

    return () => {
      scene.fog = previousFog;
    };
  }, [gl, scene]);

  return null;
}

function Scene() {
  return (
    <>
      <RendererMood />
      <HeroLightingRig />
      <TheatreCameraRig theatreSheet={sheet} />
      <HeroStageWorld theatreSheet={sheet} />
      {process.env.NODE_ENV === "development" ? <HeroLevaPresetPanel /> : null}
    </>
  );
}

export default function BottleHero() {
  useTheatreStudio();

  return (
    <main className="relative bg-[#120f11] w-screen h-screen min-h-dvh overflow-hidden text-white">
      <Canvas
        className="absolute inset-0"
        camera={{
          position: [0, 1.92, 8.6],
          rotation: [MathUtils.degToRad(8.5), 0, 0],
          fov: 45,
        }}
        gl={{ preserveDrawingBuffer: true }}
        shadows
      >
        <Scene />
      </Canvas>
      {process.env.NODE_ENV === "development" ? <Leva collapsed /> : null}
    </main>
  );
}
