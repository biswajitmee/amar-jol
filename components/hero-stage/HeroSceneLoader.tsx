"use client";

import { useProgress } from "@react-three/drei";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import * as THREE from "three";

type PreloadAsset = {
  url: string;
  weight?: number;
};

type PreloadState = {
  done: boolean;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  errorCount: number;
};

type HeroSceneLoaderProps = {
  visible: boolean;
  progress: number;
};

const MIN_LOADER_MS = 1200;
const MAX_LOADER_MS = 9000;

const PRELOAD_ASSETS: PreloadAsset[] = [
  { url: "/api/theater-state", weight: 0.7 },
  { url: "/api/models/lumiere-de-la-mer-bottle", weight: 1.6 },
  { url: "/api/models/sketch/flower-candle", weight: 1.1 },
  { url: "/api/models/sketch/flower", weight: 1.1 },
  { url: "/api/models/sketch/flower-magic", weight: 1.1 },
  { url: "/api/models/sketch/glowing-flower", weight: 1.1 },
  { url: "/models/flower_petal_hero_wet.glb", weight: 1.2 },
  { url: "/imported-biswajit/fish-blender.glb", weight: 1.3 },
  { url: "/waterpro/sky-blue-clouds-large.png", weight: 0.8 },
  { url: "/imported-biswajit/sand.jpg", weight: 0.7 },
  { url: "/imported-biswajit/caustics.mp4", weight: 1.4 },
];

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

async function preloadAsset(
  asset: PreloadAsset,
  onProgress: (loaded: number, total: number | null) => void,
) {
  const response = await fetch(asset.url, {
    cache: "force-cache",
    priority: "high",
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`Preload failed: ${asset.url} (${response.status})`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? Number(contentLength) : null;

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress(buffer.byteLength, total ?? buffer.byteLength);
    return;
  }

  const reader = response.body.getReader();
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    loaded += value.byteLength;
    onProgress(loaded, total);
  }

  onProgress(loaded, total ?? loaded);
}

export function useHeroScenePreloader(): PreloadState {
  const [state, setState] = useState<PreloadState>({
    done: false,
    progress: 0,
    loadedBytes: 0,
    totalBytes: 0,
    errorCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const perAssetProgress = new Map<string, { loaded: number; total: number }>();
    const totalWeight = PRELOAD_ASSETS.reduce(
      (sum, asset) => sum + (asset.weight ?? 1),
      0,
    );

    const publish = (done = false, errorCount = 0) => {
      if (cancelled) {
        return;
      }

      let weightedProgress = 0;
      let loadedBytes = 0;
      let totalBytes = 0;

      for (const asset of PRELOAD_ASSETS) {
        const item = perAssetProgress.get(asset.url);
        const weight = asset.weight ?? 1;

        if (!item) {
          continue;
        }

        weightedProgress +=
          (item.total > 0 ? item.loaded / item.total : item.loaded > 0 ? 1 : 0) *
          weight;
        loadedBytes += item.loaded;
        totalBytes += item.total;
      }

      setState({
        done,
        progress: done ? 100 : clampProgress((weightedProgress / totalWeight) * 100),
        loadedBytes,
        totalBytes,
        errorCount,
      });
    };

    async function run() {
      let errorCount = 0;

      await Promise.all(
        PRELOAD_ASSETS.map(async (asset) => {
          try {
            await preloadAsset(asset, (loaded, total) => {
              perAssetProgress.set(asset.url, {
                loaded,
                total: total ?? loaded,
              });
              publish(false, errorCount);
            });
          } catch (error) {
            errorCount += 1;
            console.warn(error);
            perAssetProgress.set(asset.url, { loaded: 1, total: 1 });
            publish(false, errorCount);
          }
        }),
      );

      publish(true, errorCount);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useSceneLoaderGate({
  preloadDone,
  sceneReady,
}: {
  preloadDone: boolean;
  sceneReady: boolean;
}) {
  const { active, progress } = useProgress();
  const [minimumPassed, setMinimumPassed] = useState(false);
  const [maximumPassed, setMaximumPassed] = useState(false);

  useEffect(() => {
    const minimumTimeout = window.setTimeout(() => {
      setMinimumPassed(true);
    }, MIN_LOADER_MS);
    const maximumTimeout = window.setTimeout(() => {
      setMaximumPassed(true);
    }, MAX_LOADER_MS);

    return () => {
      window.clearTimeout(minimumTimeout);
      window.clearTimeout(maximumTimeout);
    };
  }, []);

  return {
    r3fProgress: progress,
    complete:
      (preloadDone &&
        sceneReady &&
        minimumPassed &&
        (!active || progress >= 99.5)) ||
      maximumPassed,
  };
}

export default function HeroSceneLoader({
  visible,
  progress,
}: HeroSceneLoaderProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const loaderProgress = clampProgress(displayProgress);
  const loaderStyle = {
    "--loader-progress": `${loaderProgress * 3.6}deg`,
  } as CSSProperties;

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      setDisplayProgress((current) =>
        THREE.MathUtils.lerp(current, progress, progress >= 100 ? 0.22 : 0.12),
      );
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [progress]);

  return (
    <div
      aria-hidden={!visible}
      className={[
        "fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#100413] transition-opacity duration-700",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(142,66,119,0.62),rgba(50,20,51,0.82)_38%,rgba(17,4,20,0.98)_78%),linear-gradient(110deg,rgba(35,7,23,0.96),rgba(66,24,69,0.88)_50%,rgba(17,5,22,0.98))]" />
      <div className="loader-stars absolute inset-0 opacity-60" />

      <div
        className="relative h-[min(72vw,560px)] w-[min(72vw,560px)] min-h-[300px] min-w-[300px]"
        style={loaderStyle}
      >
        <div className="absolute -inset-[72px] rounded-full border border-[#ffd1d6]/[0.055]" />
        <div className="absolute -inset-[42px] rounded-full border border-[#ffd1d6]/[0.08]" />
        <div className="absolute -inset-[18px] rounded-full border border-[#ffd1d6]/[0.12]" />
        <div className="loader-ring-progress absolute inset-0 rounded-full" />
        <div className="absolute inset-[5px] rounded-full border border-[#ffe0d9]/38 bg-[#f7d8ff]/[0.035] shadow-[0_0_70px_rgba(230,93,178,0.24),inset_0_0_54px_rgba(255,206,233,0.08)]" />
        <div className="loader-orbit absolute inset-0 rounded-full">
          <span className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffe7d7] shadow-[0_0_23px_8px_rgba(255,166,197,0.78)]" />
        </div>
        <div className="absolute inset-[20px] rounded-full border border-white/[0.055]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center text-[#ffe6df]">
          <div className="loader-star mb-10 h-12 w-12 opacity-90" />
          <div className="font-serif text-[clamp(44px,7.8vw,78px)] leading-none tracking-[0.26em] text-[#fff2eb] drop-shadow-[0_2px_14px_rgba(255,195,220,0.28)]">
            LUMIERE
          </div>
          <div className="mt-6 text-[clamp(11px,1.65vw,15px)] uppercase tracking-[0.42em] text-[#ffd2b2]/86">
            Water Hero Experience
          </div>
          <div className="my-9 flex w-[min(76%,330px)] items-center gap-4 text-[#ffd2c9]/62">
            <span className="h-px flex-1 bg-current opacity-35" />
            <span className="h-3 w-3 rotate-45 bg-[#ffd7cb] shadow-[0_0_16px_rgba(255,187,209,0.56)]" />
            <span className="h-px flex-1 bg-current opacity-35" />
          </div>
          <div className="text-[clamp(18px,3vw,25px)] text-[#ffe0d8]/88">
            Loading...
          </div>
          <div className="mt-5 font-serif text-[clamp(56px,9vw,88px)] leading-none text-[#ffe4d1] drop-shadow-[0_0_18px_rgba(255,198,211,0.2)]">
            {Math.min(100, Math.round(loaderProgress))}%
          </div>

          <div className="mt-9 h-[4px] w-[min(78%,350px)] overflow-visible bg-white/[0.08] shadow-[0_0_18px_rgba(255,174,214,0.14)]">
            <div
              className="loader-water relative h-full bg-[#ffd3d2] shadow-[0_0_20px_rgba(255,169,194,0.76)]"
              style={{ width: `${loaderProgress}%` }}
            />
          </div>
          <div className="mt-10 text-[11px] uppercase tracking-[0.42em] text-[#ffe3d1]/88">
            Preparing Your Journey
          </div>
        </div>
      </div>

      <style jsx>{`
        .loader-stars {
          background:
            radial-gradient(circle at 30% 18%, rgba(255, 211, 207, 0.68) 0 1px, transparent 2px),
            radial-gradient(circle at 82% 10%, rgba(255, 211, 207, 0.58) 0 1px, transparent 2px),
            radial-gradient(circle at 73% 37%, rgba(255, 211, 207, 0.36) 0 1px, transparent 2px),
            radial-gradient(circle at 38% 92%, rgba(255, 211, 207, 0.48) 0 1px, transparent 2px),
            radial-gradient(circle at 18% 72%, rgba(255, 211, 207, 0.34) 0 1px, transparent 2px);
        }

        .loader-ring-progress {
          background: conic-gradient(
            from -90deg,
            rgba(255, 225, 205, 0.94) 0deg,
            rgba(255, 145, 202, 0.88) var(--loader-progress),
            rgba(255, 214, 218, 0.16) var(--loader-progress),
            rgba(255, 214, 218, 0.16) 360deg
          );
          filter: drop-shadow(0 0 22px rgba(255, 123, 190, 0.5));
          mask: radial-gradient(
            circle,
            transparent calc(50% - 1.4px),
            #000 calc(50% - 1px),
            #000 calc(50% + 1.4px),
            transparent calc(50% + 2px)
          );
        }

        .loader-orbit {
          transform: rotate(var(--loader-progress));
          transition: transform 260ms ease-out;
        }

        .loader-water {
          background:
            radial-gradient(circle at 22% 36%, rgba(255, 255, 255, 0.95) 0 1px, transparent 2px),
            linear-gradient(90deg, rgba(255, 190, 206, 0.7), rgba(255, 146, 204, 0.96), rgba(255, 226, 217, 0.9));
          transition: width 320ms ease;
        }

        .loader-water::after {
          content: "";
          position: absolute;
          right: 0;
          top: 50%;
          height: 10px;
          width: 10px;
          transform: translate(50%, -50%);
          border-radius: 999px;
          background: #ffe7d7;
          box-shadow: 0 0 20px 7px rgba(255, 166, 197, 0.64);
        }

        .loader-star {
          background:
            linear-gradient(#ffdcd8, #ffdcd8) center / 1px 100% no-repeat,
            linear-gradient(90deg, #ffdcd8, #ffdcd8) center / 100% 1px no-repeat,
            linear-gradient(45deg, transparent 48%, #ffdcd8 49% 51%, transparent 52%) center / 100% 100% no-repeat,
            linear-gradient(-45deg, transparent 48%, #ffdcd8 49% 51%, transparent 52%) center / 100% 100% no-repeat;
          border-radius: 999px;
          position: relative;
        }

        .loader-star::after {
          content: "";
          position: absolute;
          inset: 17px;
          border: 1px solid rgba(255, 220, 216, 0.78);
          border-radius: 999px;
          box-shadow: 0 0 14px rgba(255, 190, 218, 0.52);
        }
      `}</style>
    </div>
  );
}
