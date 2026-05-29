"use client";

import { Canvas, useThree } from "@react-three/fiber";
import {
  getProject,
  types,
  val,
  type IProject,
  type ISheet,
} from "@theatre/core";
import { button, folder, Leva, useControls } from "leva";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
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

const PROJECT_ID = "Water Hero Screen";
const SHEET_ID = "Hero Camera";
const THEATRE_PERSISTENCE_KEY = "water-hero-screen";
const THEATRE_STATE_API = "/api/theater-state";
const DEFAULT_SCROLL_SEQUENCE_LENGTH = 4;
const SCROLL_SECTION_COUNT = 6;
const SCROLL_TRIGGER_ID = "water-hero-camera-scroll";
const isDevelopment = process.env.NODE_ENV === "development";
type TheatreState = typeof theaterState;

const theatreCacheGlobal = globalThis as typeof globalThis & {
  __waterHeroProject?: IProject;
  __waterHeroSheet?: ISheet;
  __waterHeroTheatreObjects?: Map<string, any>;
  __waterHeroStudioPromise?: Promise<
    (typeof import("@theatre/studio"))["default"] | null
  >;
};

function getTheatreStudio() {
  if (!isDevelopment) {
    return Promise.resolve(null);
  }

  theatreCacheGlobal.__waterHeroStudioPromise ??= import(
    "@theatre/studio"
  ).then(({ default: studio }) => {
    studio.initialize({
      persistenceKey: THEATRE_PERSISTENCE_KEY,
    });

    return studio;
  });

  return theatreCacheGlobal.__waterHeroStudioPromise;
}

if (isDevelopment && typeof window !== "undefined") {
  void getTheatreStudio();
}

function getTheatreRuntime(state?: TheatreState) {
  const projectConfig = isDevelopment || !state ? {} : { state };
  const project =
    theatreCacheGlobal.__waterHeroProject ??
    getProject(PROJECT_ID, projectConfig);
  theatreCacheGlobal.__waterHeroProject = project;

  const sheet = theatreCacheGlobal.__waterHeroSheet ?? project.sheet(SHEET_ID);
  theatreCacheGlobal.__waterHeroSheet = sheet;

  return { project, sheet };
}

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
    void getTheatreStudio();
  }, []);
}

function getScrollSequenceLength(theatreSheet: ISheet) {
  try {
    const sequenceLength = val(theatreSheet.sequence.pointer.length);

    return typeof sequenceLength === "number" &&
      Number.isFinite(sequenceLength) &&
      sequenceLength > 0
      ? sequenceLength
      : DEFAULT_SCROLL_SEQUENCE_LENGTH;
  } catch {
    return DEFAULT_SCROLL_SEQUENCE_LENGTH;
  }
}

function TheatreScrollSmoother({
  theatreSheet,
  wrapperRef,
  contentRef,
}: {
  theatreSheet: ISheet;
  wrapperRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;

    if (!wrapper || !content) {
      return undefined;
    }

    const smoothWrapper: HTMLDivElement = wrapper;
    const smoothContent: HTMLDivElement = content;
    let cancelled = false;
    let gsapContext: { revert: () => void } | undefined;
    let cleanup = () => {};

    const setSequencePosition = (progress: number) => {
      const sequenceLength = getScrollSequenceLength(theatreSheet);
      theatreSheet.sequence.position =
        MathUtils.clamp(progress, 0, 1) * sequenceLength;
    };

    async function setupSmoothScroll() {
      const [{ gsap }, { ScrollTrigger }, { ScrollSmoother }] =
        await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("gsap/ScrollSmoother"),
        ]);
      await theatreSheet.project.ready;

      if (cancelled) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
      ScrollTrigger.getById(SCROLL_TRIGGER_ID)?.kill();
      ScrollSmoother.get()?.kill();

      gsapContext = gsap.context(() => {
        const smoother = ScrollSmoother.create({
          wrapper: smoothWrapper,
          content: smoothContent,
          smooth: 2.0,
          smoothTouch: 0.16,
          effects: false,
          normalizeScroll: true,
        });

        const scrollTrigger = ScrollTrigger.create({
          id: SCROLL_TRIGGER_ID,
          start: 0,
          end: "max",
          invalidateOnRefresh: true,
          onRefresh: (self) => setSequencePosition(self.progress),
          onUpdate: (self) => setSequencePosition(self.progress),
        });

        cleanup = () => {
          scrollTrigger.kill();
          smoother.kill();
        };

        ScrollTrigger.refresh();
        setSequencePosition(scrollTrigger.progress);
      }, smoothWrapper);
    }

    void setupSmoothScroll();

    return () => {
      cancelled = true;
      cleanup();
      gsapContext?.revert();
    };
  }, [contentRef, theatreSheet, wrapperRef]);

  return null;
}

function TheatreStatePanel({ project }: { project: IProject }) {
  const setRef = useRef<
    ((values: { theatreStateStatus: string }) => void) | null
  >(null);

  const setStatus = useCallback((message: string) => {
    setRef.current?.({
      theatreStateStatus: message,
    });
  }, []);

  const saveTheatreState = useCallback(async () => {
    try {
      setStatus("Saving theaterstate.json...");
      const studio = await getTheatreStudio();

      if (!studio) {
        setStatus("Studio is only available in development");
        return;
      }

      await project.ready;
      const state = studio.createContentOfSaveFile(PROJECT_ID);
      const response = await fetch(THEATRE_STATE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        throw new Error(`Save failed with ${response.status}`);
      }

      setStatus("Saved theaterstate.json");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    }
  }, [project, setStatus]);

  const [, set] = useControls(
    "Theatre State",
    () => ({
      "Disk Export": folder(
        {
          saveTheatreState: button(saveTheatreState),
          theatreStateStatus: {
            value: "Ready",
            label: "Status",
            editable: false,
          },
        },
        { collapsed: false },
      ),
    }),
    { collapsed: true, order: 3 },
    [saveTheatreState],
  );

  setRef.current = set as (values: { theatreStateStatus: string }) => void;

  return null;
}

function TheatreCameraRig({ theatreSheet }: { theatreSheet: ISheet }) {
  const { camera } = useThree();

  useEffect(() => {
    const theatreCamera = getTheatreCamera(theatreSheet);
    let isActive = true;
    let unsubscribe = () => {};

    void theatreSheet.project.ready.then(() => {
      if (!isActive) {
        return;
      }

      applyCameraValues(camera, theatreCamera.value as CameraValues);
      unsubscribe = theatreCamera.onValuesChange((values: CameraValues) => {
        applyCameraValues(camera, values as CameraValues);
      });
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
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

function Scene({ theatreSheet }: { theatreSheet: ISheet }) {
  return (
    <>
      <RendererMood />
      <HeroLightingRig />
      <TheatreCameraRig theatreSheet={theatreSheet} />
      <HeroStageWorld theatreSheet={theatreSheet} />
      {process.env.NODE_ENV === "development" ? <HeroLevaPresetPanel /> : null}
    </>
  );
}

export default function BottleHero() {
  useTheatreStudio();
  const [productionTheatreState, setProductionTheatreState] =
    useState<TheatreState | null>(null);
  const [isTheatreStateReady, setIsTheatreStateReady] =
    useState(isDevelopment);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const theatreRuntime = isTheatreStateReady
    ? getTheatreRuntime(
        isDevelopment ? undefined : productionTheatreState ?? theaterState,
      )
    : null;

  useEffect(() => {
    if (isDevelopment) {
      return undefined;
    }

    let isActive = true;

    async function loadTheatreState() {
      try {
        const response = await fetch(THEATRE_STATE_API, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Theatre state load failed with ${response.status}`);
        }

        const state = (await response.json()) as TheatreState;

        if (isActive) {
          setProductionTheatreState(state);
        }
      } catch (error) {
        console.error("Failed to load theaterstate.json", error);

        if (isActive) {
          setProductionTheatreState(theaterState);
        }
      } finally {
        if (isActive) {
          setIsTheatreStateReady(true);
        }
      }
    }

    void loadTheatreState();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="relative bg-[#120f11] w-full min-h-dvh overflow-x-hidden text-white">
      {theatreRuntime ? (
        <>
          <div className="z-0 fixed inset-0">
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
              <Scene theatreSheet={theatreRuntime.sheet} />
            </Canvas>
          </div>
          <TheatreScrollSmoother
            theatreSheet={theatreRuntime.sheet}
            wrapperRef={scrollWrapperRef}
            contentRef={scrollContentRef}
          />
        </>
      ) : null}
      <div
        id="smooth-wrapper"
        ref={scrollWrapperRef}
        className="z-10 relative w-full min-h-dvh"
      >
        <div id="smooth-content" ref={scrollContentRef} className="w-full">
          {Array.from({ length: SCROLL_SECTION_COUNT }, (_, index) => (
            <section
              key={index}
              aria-label={`Scroll camera section ${index + 1}`}
              className="w-full min-h-screen"
            />
          ))}
        </div>
      </div>
      {isDevelopment && theatreRuntime ? (
        <TheatreStatePanel project={theatreRuntime.project} />
      ) : null}
      {isDevelopment ? <Leva collapsed /> : null}
    </main>
  );
}
