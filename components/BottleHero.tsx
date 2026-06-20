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
  Suspense,
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
import HeroSceneLoader, {
  useHeroScenePreloader,
  useSceneLoaderGate,
} from "@/components/hero-stage/HeroSceneLoader";
import HeroLevaPresetPanel from "@/src/waterpro/debug/HeroLevaPresetPanel.jsx";
import CursorFluidEffect from "@/src/components/effects/CursorFluidEffect/CursorFluidEffect";
import theaterState from "@/app/api/theater-state/Water Hero Screen.theatre-project-state.json";

const PROJECT_ID = "Water Hero Screen";
const SHEET_ID = "Hero Camera";
const THEATRE_PERSISTENCE_KEY = "water-hero-screen";
const THEATRE_STATE_API = "/api/theater-state";
const DEFAULT_SCROLL_SEQUENCE_LENGTH = 4;
const CANVAS_SCROLL_TRACK_VH = 260;
const SCROLL_TRIGGER_ID = "water-hero-camera-scroll";
const isDevelopment = process.env.NODE_ENV === "development";
type TheatreState = typeof theaterState;

const navItems = ["Home", "About", "Ingredients", "Benefits", "Journal"];
const benefitCards = [
  {
    title: "Hydrate",
    copy: "Replenishes moisture and keeps skin plump and supple.",
    tone: "from-[#dce8ea] via-[#f6fbf7] to-[#b8cad1]",
  },
  {
    title: "Repair",
    copy: "Helps restore and strengthen the skin barrier.",
    tone: "from-[#f5c8ce] via-[#fff2ef] to-[#e58e9e]",
  },
  {
    title: "Glow",
    copy: "Revives natural radiance for healthy, luminous skin.",
    tone: "from-[#f8d989] via-[#fff7c9] to-[#c8953b]",
  },
];
const ingredientCards = [
  {
    title: "Orchid Extract",
    copy: "Rich in antioxidants to help protect and revitalize.",
    tone: "from-[#ea7fb0] via-[#ffd7e9] to-[#9d3373]",
  },
  {
    title: "Hyaluronic Acid",
    copy: "Deeply hydrates and helps maintain skin elasticity.",
    tone: "from-[#dce9f4] via-[#ffffff] to-[#8eb6d4]",
  },
  {
    title: "Sea Botanicals",
    copy: "Nourish and soothe for balanced, calm skin.",
    tone: "from-[#28b7c4] via-[#a7e5e4] to-[#145f7d]",
  },
  {
    title: "Peony Flower",
    copy: "Brightens and enhances natural luminosity.",
    tone: "from-[#f07da3] via-[#ffd4de] to-[#cf4f78]",
  },
];

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
  const projectConfig = state ? { state } : {};
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
          smooth: 2.4,
          smoothTouch: 0.22,
          effects: false,
          normalizeScroll: true,
        });

        const scrollTrigger = ScrollTrigger.create({
          id: SCROLL_TRIGGER_ID,
          start: 0,
          end: () => {
            const track = smoothContent.querySelector<HTMLElement>(
              "[data-canvas-scroll-track]",
            );

            return track ? track.offsetHeight - window.innerHeight : "max";
          },
          invalidateOnRefresh: true,
          onRefresh: (self) => setSequencePosition(self.progress),
          onUpdate: (self) => setSequencePosition(self.progress),
        });

        gsap.fromTo(
          "[data-hero-word]",
          { autoAlpha: 0, y: 42, filter: "blur(10px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.4,
            ease: "power3.out",
            stagger: 0.08,
          },
        );

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 46 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.95,
              ease: "power3.out",
              scrollTrigger: {
                trigger: element,
                start: "top 82%",
                once: true,
              },
            },
          );
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
      <CursorFluidEffect />
    </>
  );
}

function SceneReadyMarker({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return null;
}

function BrandMark() {
  return (
    <a href="#home" className="flex items-center gap-3" aria-label="Lumina home">
      <span className="relative grid size-6 place-items-center">
        <span className="absolute h-px w-6 bg-white/85" />
        <span className="absolute h-6 w-px bg-white/85" />
        <span className="absolute h-px w-6 rotate-45 bg-white/70" />
        <span className="absolute h-px w-6 -rotate-45 bg-white/70" />
      </span>
      <span className="font-display text-xl tracking-[0.22em] text-white">
        LUMINA
      </span>
    </a>
  );
}

function SiteNav({
  isMobileMenuOpen,
  onToggleMobileMenu,
}: {
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-5 py-5 text-white sm:px-8 lg:px-16">
      <div className="mx-auto flex max-w-[1640px] items-center justify-between">
        <div className="pointer-events-auto">
          <BrandMark />
        </div>
        <nav
          aria-label="Primary navigation"
          className="pointer-events-auto hidden items-center gap-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/82 lg:flex"
        >
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="transition hover:text-white"
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="pointer-events-auto flex items-center gap-3">
          <a
            href="#journal"
            className="hidden rounded-full border border-white/45 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition hover:border-white hover:bg-white/10 sm:inline-flex"
          >
            Cart (0)
          </a>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-white/35 bg-black/10 text-white backdrop-blur-md transition hover:border-white/70 hover:bg-white/12 lg:hidden"
            onClick={onToggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle menu"
          >
            <span className="flex w-5 flex-col gap-1.5">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-3/4 bg-current" />
              <span className="h-px w-full bg-current" />
            </span>
          </button>
        </div>
      </div>
      <div
        className={`pointer-events-auto mx-5 mt-4 overflow-hidden rounded-[8px] border border-white/15 bg-[#170f22]/88 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 lg:hidden ${
          isMobileMenuOpen
            ? "max-h-96 opacity-100"
            : "max-h-0 border-transparent opacity-0"
        }`}
      >
        <nav className="grid gap-1 p-3 text-sm uppercase tracking-[0.12em]">
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="rounded-[6px] px-4 py-3 text-white/82 transition hover:bg-white/10 hover:text-white"
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function HeroOverlay() {
  return (
    <section
      id="home"
      aria-label="Lumina skincare hero"
      className="relative flex min-h-screen items-center px-5 pt-24 sm:px-8 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(255,205,232,0.26),transparent_32%),linear-gradient(180deg,rgba(18,15,17,0.24),rgba(18,15,17,0)_46%,rgba(18,15,17,0.32))]" />
      <div className="relative mx-auto grid w-full max-w-[1640px] gap-8">
        <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-[1fr_auto_1fr]">
          <div className="max-w-sm self-end pb-4 lg:pb-12" data-reveal>
            <p className="font-display text-3xl leading-[0.96] text-[#fff5e8] sm:text-4xl">
              Elevated by Nature.
              <br />
              Perfected by Science.
            </p>
            <a
              href="#benefits"
              className="mt-9 inline-flex min-w-[230px] items-center justify-center gap-6 whitespace-nowrap rounded-full bg-[#ffd1c6] px-8 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#3e2a32] shadow-[0_18px_55px_rgba(255,125,150,0.22)] transition hover:bg-white"
            >
              Shop the collection
              <span aria-hidden>{"->"}</span>
            </a>
          </div>
          <h1 className="pointer-events-none grid grid-cols-2 gap-x-[12vw] text-center font-display text-[clamp(4.8rem,15vw,18rem)] leading-[0.75] text-[#fff3df]">
            <span data-hero-word>SKIN</span>
            <span data-hero-word>CARE</span>
          </h1>
          <div
            className="max-w-[330px] self-end pb-4 text-sm leading-6 text-white/82 lg:justify-self-end lg:pb-12"
            data-reveal
          >
            <p>
              A sensorial skincare experience that reveals radiant, healthy,
              glowing skin.
            </p>
            <a
              href="#about"
              className="mt-8 inline-flex rounded-full border border-white/45 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:border-white hover:bg-white/10"
            >
              Discover our story
            </a>
          </div>
        </div>
        <div className="mx-auto mt-4 flex flex-col items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
          <span className="grid h-10 w-6 place-items-start rounded-full border border-white/55 p-1.5">
            <span className="h-2 w-1 rounded-full bg-white/80" />
          </span>
          Scroll to explore
        </div>
      </div>
    </section>
  );
}

function UnderwaterOverlay() {
  const cards = [
    ["Intense Hydration", "Deeply nourishes and locks in moisture for lasting softness."],
    ["Skin Barrier Support", "Strengthens and protects for resilient, healthy skin."],
    ["Radiant Glow", "Enhances natural luminosity for a brighter, even glow."],
  ];

  return (
    <section
      id="about"
      aria-label="Underwater skincare benefits"
      className="relative grid min-h-[120vh] items-start px-5 pt-[12vh] sm:px-8 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,19,40,0)_0%,rgba(13,10,58,0.28)_28%,rgba(10,8,42,0.58)_100%)]" />
      <div className="relative mx-auto grid w-full max-w-[1500px] gap-12 lg:grid-cols-[0.9fr_1fr_0.9fr]">
        <div className="self-end pb-[16vh]" data-reveal>
          <h2 className="font-display text-4xl leading-[0.98] text-white sm:text-5xl">
            Deep Hydration.
            <br />
            Visible Transformation.
          </h2>
          <p className="mt-6 max-w-xs text-sm leading-6 text-white/86">
            Our advanced formulas work below the surface to restore, replenish
            and revive from within.
          </p>
          <a
            href="#benefits"
            className="mt-8 inline-flex items-center gap-5 border-b border-white/55 pb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white"
          >
            Explore benefits <span aria-hidden>{"->"}</span>
          </a>
        </div>
        <div className="self-start text-center" data-reveal>
          <p className="text-2xl font-semibold uppercase tracking-[0.04em] text-white">
            Dive into radiance
          </p>
          <p className="mt-2 text-sm text-white/82">
            Where purity meets deep hydration.
          </p>
        </div>
        <div className="grid gap-5 self-center pb-[12vh]">
          {cards.map(([title, copy]) => (
            <article
              key={title}
              className="rounded-[8px] border border-white/18 bg-white/[0.08] p-6 shadow-[0_24px_80px_rgba(28,15,76,0.28)] backdrop-blur-md"
              data-reveal
            >
              <h3 className="font-display text-xl text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/78">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="relative overflow-hidden bg-[#fff2dc] px-5 py-20 text-[#32252b] sm:px-8 lg:px-16 lg:py-24"
    >
      <div className="pointer-events-none absolute -left-28 bottom-0 size-72 rounded-full border border-[#d3bfa3]/45 bg-white/35" />
      <div className="pointer-events-none absolute -right-24 top-8 h-[86%] w-44 rounded-full border border-[#d8c2a2]/55" />
      <div className="relative mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[0.72fr_2fr]">
        <div data-reveal>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6d5b58]">
            * Benefits
          </p>
          <h2 className="mt-5 font-display text-5xl leading-[0.94] sm:text-6xl">
            Nourish.
            <br />
            Renew.
            <br />
            Glow.
          </h2>
          <p className="mt-7 max-w-xs text-sm leading-6 text-[#5f5151]">
            Every drop is a step towards skin that feels balanced, renewed and
            beautifully alive.
          </p>
          <a
            href="#ingredients"
            className="mt-8 inline-flex items-center gap-5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#493b3e]"
          >
            Learn more <span aria-hidden>{"->"}</span>
          </a>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {benefitCards.map((card) => (
            <article
              key={card.title}
              className="grid justify-items-center border-[#d2bea3]/70 text-center md:border-l md:px-10"
              data-reveal
            >
              <div
                className={`grid size-36 place-items-center rounded-full border border-[#d3bfa3] bg-gradient-to-br ${card.tone} shadow-inner`}
              >
                <span className="size-20 rounded-full bg-white/35 blur-sm" />
              </div>
              <h3 className="mt-8 font-display text-3xl">{card.title}</h3>
              <p className="mt-3 max-w-[210px] text-sm leading-6 text-[#665657]">
                {card.copy}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function IngredientsSection() {
  return (
    <section
      id="ingredients"
      className="relative overflow-hidden bg-[#7d6ac6] px-5 py-20 text-white sm:px-8 lg:px-16 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,221,245,0.32),transparent_30%),radial-gradient(circle_at_78%_20%,rgba(126,243,234,0.18),transparent_28%),linear-gradient(180deg,rgba(23,15,55,0.08),rgba(23,15,55,0.3))]" />
      <div className="relative mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[0.8fr_2fr]">
        <div data-reveal>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/78">
            * Key Ingredients
          </p>
          <h2 className="mt-5 font-display text-4xl leading-[1] sm:text-5xl">
            Powered by Nature.
            <br />
            Refined by Science.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-6 text-white/82">
            Thoughtfully selected. Clinically proven. Naturally transformative.
          </p>
          <a
            href="#journal"
            className="mt-8 inline-flex items-center gap-5 border-b border-white/50 pb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white"
          >
            Explore ingredients <span aria-hidden>{"->"}</span>
          </a>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {ingredientCards.map((card) => (
            <article key={card.title} className="text-center" data-reveal>
              <div className="mx-auto grid size-36 place-items-center rounded-full border border-dashed border-white/45 p-3">
                <div
                  className={`size-full rounded-full bg-gradient-to-br ${card.tone} shadow-[inset_0_0_35px_rgba(255,255,255,0.5)]`}
                />
              </div>
              <h3 className="mt-5 font-display text-2xl">{card.title}</h3>
              <p className="mx-auto mt-3 max-w-[210px] text-sm leading-6 text-white/78">
                {card.copy}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function JournalFooter() {
  return (
    <section
      id="journal"
      className="bg-[#120b22] px-5 pb-8 pt-10 text-white sm:px-8 lg:px-16"
    >
      <div
        className="mx-auto grid max-w-[1500px] gap-10 rounded-[8px] border border-white/14 bg-white/[0.035] p-7 shadow-[0_32px_120px_rgba(0,0,0,0.25)] md:grid-cols-[0.7fr_1.1fr_1.3fr] lg:p-10"
        data-reveal
      >
        <div className="grid place-items-center">
          <div className="grid size-48 place-items-center rounded-full border border-[#c275d6]/55 bg-[radial-gradient(circle,rgba(255,107,202,0.52),rgba(34,13,60,0.86)_62%)]">
            <div className="size-28 rounded-full bg-[#ffd1c6]/70 shadow-[0_0_55px_rgba(255,109,215,0.65)]" />
          </div>
        </div>
        <div className="self-center">
          <h2 className="font-display text-4xl leading-[1.02] sm:text-5xl">
            Rituals that elevate.
            <br />
            Results that glow.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-6 text-white/74">
            Indulge in a sensorial ritual that transforms your skin and your
            senses. Because your glow is our promise.
          </p>
        </div>
        <div className="grid content-center gap-8">
          <div className="grid gap-5 sm:grid-cols-3">
            {["Clean & Conscious", "Dermatologist Tested", "Sustainable Beauty"].map(
              (item) => (
                <div key={item}>
                  <p className="text-sm font-semibold text-white">{item}</p>
                  <p className="mt-2 text-xs leading-5 text-white/64">
                    Thoughtful care, tested formulas and responsible choices.
                  </p>
                </div>
              ),
            )}
          </div>
          <a
            href="#home"
            className="inline-flex w-full max-w-sm items-center justify-center gap-6 justify-self-start whitespace-nowrap rounded-full bg-[#ffd1c6] px-8 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#3e2a32] transition hover:bg-white"
          >
            Join the glow journey <span aria-hidden>{"->"}</span>
          </a>
        </div>
      </div>
      <footer className="mx-auto mt-9 flex max-w-[1500px] flex-col gap-6 text-xs uppercase tracking-[0.1em] text-white/55 md:flex-row md:items-center md:justify-between">
        <BrandMark />
        <span>© 2026 Lumina Skincare. All rights reserved.</span>
        <div className="flex flex-wrap gap-7">
          <a href="#home">Privacy Policy</a>
          <a href="#home">Terms of Service</a>
          <a href="#home">Instagram</a>
        </div>
      </footer>
    </section>
  );
}

function LuminaUiSections() {
  return (
    <>
      <div
        data-canvas-scroll-track
        style={{ minHeight: `${CANVAS_SCROLL_TRACK_VH}vh` }}
      >
        <HeroOverlay />
        <UnderwaterOverlay />
      </div>
      <div className="relative z-20 shadow-[0_-35px_120px_rgba(255,242,220,0.22)]">
        <BenefitsSection />
        <IngredientsSection />
        <JournalFooter />
      </div>
    </>
  );
}

export default function BottleHero() {
  useTheatreStudio();
  const [productionTheatreState, setProductionTheatreState] =
    useState<TheatreState | null>(null);
  const [isTheatreStateReady, setIsTheatreStateReady] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const preloadState = useHeroScenePreloader();
  const loaderGate = useSceneLoaderGate({
    preloadDone: preloadState.done,
    sceneReady: isSceneReady,
  });
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const theatreRuntime = isTheatreStateReady
    ? getTheatreRuntime(productionTheatreState ?? theaterState)
    : null;
  const isLoaderVisible = !loaderGate.complete;
  const loaderProgress = loaderGate.complete
    ? 100
    : Math.min(
        99,
        preloadState.progress * 0.62 +
          loaderGate.r3fProgress * 0.28 +
          (isSceneReady ? 10 : 0),
      );

  const handleSceneReady = useCallback(() => {
    setIsSceneReady(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadTheatreState() {
      try {
        const studioPromise = isDevelopment
          ? getTheatreStudio()
          : Promise.resolve(null);
        const response = await fetch(THEATRE_STATE_API, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Theatre state load failed with ${response.status}`);
        }

        const state = (await response.json()) as TheatreState;
        await studioPromise;

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
      <SiteNav
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((value) => !value)}
      />
      {theatreRuntime ? (
        <>
          <div className="z-0 fixed inset-0">
            <Canvas
              className="absolute inset-0"
              dpr={[1, 1.25]}
              camera={{
                position: [0, 1.92, 8.6],
                rotation: [MathUtils.degToRad(8.5), 0, 0],
                fov: 45,
              }}
              gl={{
                antialias: false,
                failIfMajorPerformanceCaveat: false,
                powerPreference: "high-performance",
                preserveDrawingBuffer: false,
              }}
              shadows
            >
              <Suspense fallback={null}>
                <Scene theatreSheet={theatreRuntime.sheet} />
                <SceneReadyMarker onReady={handleSceneReady} />
              </Suspense>
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
          <LuminaUiSections />
        </div>
      </div>
      {isDevelopment && theatreRuntime ? (
        <TheatreStatePanel project={theatreRuntime.project} />
      ) : null}
      <Leva collapsed hidden={!isDevelopment} />
      <HeroSceneLoader visible={isLoaderVisible} progress={loaderProgress} />
    </main>
  );
}
