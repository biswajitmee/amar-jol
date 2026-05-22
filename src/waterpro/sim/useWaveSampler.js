"use client";

import { useMemo, useRef } from "react";
import { Vector3 } from "three";

const TAU = Math.PI * 2;
const DEFAULT_WAVES = [
  [1, 0.18, 0.082, 2.7, 0],
  [0.32, 1, 0.056, 1.85, 1.7],
  [-0.72, 0.56, 0.038, 1.16, 3.4],
  [-0.18, -1, 0.025, 0.72, 5.1],
];

function normalize2(x, z) {
  const length = Math.hypot(x, z) || 1;
  return [x / length, z / length];
}

function normalizedParams(params = {}) {
  return {
    waves: params.waves ?? DEFAULT_WAVES,
    waveStrength: params.uWaveStrength ?? params.waveStrength ?? 1,
    waveSpeed: params.uWaveSpeed ?? params.waveSpeed ?? 1,
    waveScale: params.uWaveScale ?? params.waveScale ?? 1,
    normalSampleStep: params.normalSampleStep ?? 0.045,
  };
}

function gerstnerHeight(x, z, time, wave, params) {
  const [dx, dz] = normalize2(wave[0], wave[1]);
  const steepness = wave[2];
  const wavelength = Math.max(wave[3] * params.waveScale, 0.001);
  const phaseOffset = wave[4] ?? 0;
  const k = TAU / wavelength;
  const speed = Math.sqrt(9.8 / k) * params.waveSpeed;
  const phase = k * (dx * x + dz * z) - speed * time + phaseOffset;

  return Math.sin(phase) * (steepness / k) * params.waveStrength;
}

export function getWaterHeightAt(x, z, time = 0, params = {}) {
  const normalized = normalizedParams(params);

  return normalized.waves.reduce(
    (height, wave) => height + gerstnerHeight(x, z, time, wave, normalized),
    0,
  );
}

export function getWaterNormalAt(x, z, time = 0, params = {}) {
  const normalized = normalizedParams(params);
  const step = normalized.normalSampleStep;
  const left = getWaterHeightAt(x - step, z, time, normalized);
  const right = getWaterHeightAt(x + step, z, time, normalized);
  const back = getWaterHeightAt(x, z - step, time, normalized);
  const front = getWaterHeightAt(x, z + step, time, normalized);

  return new Vector3(left - right, step * 2, back - front).normalize();
}

export function sampleGerstnerHeight(x, z, time, settings) {
  return getWaterHeightAt(x, z, time, settings);
}

export function useWaveSampler(settings) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  return useMemo(
    () => ({
      getWaterHeightAt(x, z, time = 0) {
        return getWaterHeightAt(x, z, time, settingsRef.current);
      },
      getWaterNormalAt(x, z, time = 0) {
        return getWaterNormalAt(x, z, time, settingsRef.current);
      },
      getNormalAt(x, z, time = 0) {
        return getWaterNormalAt(x, z, time, settingsRef.current);
      },
    }),
    [],
  );
}
