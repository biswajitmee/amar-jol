"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
} from "three";
import foamMaskShader from "../shaders/foamMask.frag";
import rippleUpdateShader from "../shaders/rippleUpdate.frag";
import { waterPointToUv } from "./impactSystem";

const MAX_IMPACTS = 8;
const MAX_FOAM_IMPACTS = 12;

const passVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const emptyImpact = new Vector4(-10, -10, 0, 0.0001);
const emptyFoamParams = new Vector4(0, 0, 0.001, 0);

function makeTarget(width, height) {
  const target = new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });

  target.texture.generateMipmaps = false;

  return target;
}

function toResolution(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 128;
  }

  return Math.max(32, Math.min(512, Math.round(numeric)));
}

function toTargetSize(baseResolution, waterWidth, waterDepth) {
  const safeWidth = Math.max(waterWidth, 0.001);
  const safeDepth = Math.max(waterDepth, 0.001);

  if (safeWidth >= safeDepth) {
    return {
      width: baseResolution,
      height: Math.max(32, Math.round(baseResolution * (safeDepth / safeWidth))),
    };
  }

  return {
    width: Math.max(32, Math.round(baseResolution * (safeWidth / safeDepth))),
    height: baseResolution,
  };
}

function normalizeImpact(input, bounds, defaultRadius) {
  const hasUv = Number.isFinite(input.u) && Number.isFinite(input.v);
  const point = {
    x: input.x ?? input.worldX ?? 0,
    z: input.z ?? input.worldZ ?? 0,
  };
  const uv = hasUv ? { u: input.u, v: input.v, inside: true } : waterPointToUv(point, bounds);

  if (!uv.inside) {
    return null;
  }

  const radius = input.radius ?? defaultRadius;
  const worldRadius = input.radiusIsUv
    ? radius * Math.max(bounds.width ?? 1, bounds.depth ?? 1)
    : radius;

  return new Vector4(
    uv.u,
    uv.v,
    input.strength ?? 0.25,
    Math.max(0.01, worldRadius),
  );
}

function normalizeFoamImpact(input, bounds, defaultRadius, now) {
  const hasUv = Number.isFinite(input.u) && Number.isFinite(input.v);
  const point = {
    x: input.x ?? input.worldX ?? 0,
    z: input.z ?? input.worldZ ?? 0,
  };
  const uv = hasUv ? { u: input.u, v: input.v, inside: true } : waterPointToUv(point, bounds);

  if (!uv.inside) {
    return null;
  }

  const strength = Math.max(0, input.strength ?? 0.25);
  const radius = Math.max(0.01, input.foamRadius ?? input.radius ?? defaultRadius);
  const lifetime = Math.max(0.1, input.foamLifetime ?? 1.65);
  const opacity = Math.max(0, input.foamOpacity ?? strength * 1.15);
  const expansion = Math.max(0, input.foamExpansion ?? radius * 0.85);
  const startTime = Number.isFinite(input.time) && input.time > 0 ? input.time : now;

  return {
    startTime,
    lifetime,
    strength,
    data: new Vector4(uv.u, uv.v, radius, startTime),
    params: new Vector4(strength, opacity, lifetime, expansion),
  };
}

function clearTarget(gl, target) {
  gl.setRenderTarget(target);
  gl.clear(true, false, false);
}

function clearAllTargets(gl, targets) {
  const previousTarget = gl.getRenderTarget();
  const previousColor = gl.getClearColor(new Color());
  const previousAlpha = gl.getClearAlpha();

  gl.setClearColor(0x000000, 0);
  targets.forEach((target) => clearTarget(gl, target));
  gl.setClearColor(previousColor, previousAlpha);
  gl.setRenderTarget(previousTarget);
}

export function useRippleFBO({
  simulation,
  width = 4,
  depth = 2.4,
  size = 128,
  damping = 0.985,
  defaultRadius = 0.16,
  foamDecay = 0.965,
  enabled = true,
}) {
  const { gl } = useThree();
  const resolution = toResolution(size);
  const targetSize = toTargetSize(resolution, width, depth);
  const previousRippleRef = useRef(null);
  const currentRippleRef = useRef(null);
  const writeRippleRef = useRef(null);
  const readFoamRef = useRef(null);
  const writeFoamRef = useRef(null);
  const pendingImpactsRef = useRef([]);
  const activeFoamImpactsRef = useRef([]);
  const latestSettingsRef = useRef({
    width,
    depth,
    damping,
    defaultRadius,
    foamDecay,
  });
  latestSettingsRef.current = {
    width,
    depth,
    damping,
    defaultRadius,
    foamDecay,
  };

  const fboState = useMemo(() => {
    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry);
    const emptyImpacts = Array.from(
      { length: MAX_IMPACTS },
      () => new Vector4(-10, -10, 0, 0.0001),
    );
    const emptyFoamImpacts = Array.from(
      { length: MAX_FOAM_IMPACTS },
      () => new Vector4(-10, -10, 0, 0.0001),
    );
    const emptyFoamParamList = Array.from(
      { length: MAX_FOAM_IMPACTS },
      () => new Vector4(0, 0, 0.001, 0),
    );

    scene.add(mesh);

    const rippleMaterial = new ShaderMaterial({
      uniforms: {
        uCurrent: { value: null },
        uPrevious: { value: null },
        uTexel: { value: new Vector2(1 / targetSize.width, 1 / targetSize.height) },
        uWaterSize: { value: new Vector2(width, depth) },
        uImpacts: { value: emptyImpacts },
        uImpactCount: { value: 0 },
        uDamping: { value: damping },
      },
      vertexShader: passVertexShader,
      fragmentShader: rippleUpdateShader,
      depthWrite: false,
      depthTest: false,
    });

    const foamMaterial = new ShaderMaterial({
      uniforms: {
        uPrevious: { value: null },
        uImpacts: { value: emptyFoamImpacts },
        uImpactParams: { value: emptyFoamParamList },
        uImpactCount: { value: 0 },
        uWaterSize: { value: new Vector2(width, depth) },
        uTime: { value: 0 },
        uDelta: { value: 1 / 60 },
        uFoamDecay: { value: foamDecay },
      },
      vertexShader: passVertexShader,
      fragmentShader: foamMaskShader,
      depthWrite: false,
      depthTest: false,
    });

    previousRippleRef.current = makeTarget(targetSize.width, targetSize.height);
    currentRippleRef.current = makeTarget(targetSize.width, targetSize.height);
    writeRippleRef.current = makeTarget(targetSize.width, targetSize.height);
    readFoamRef.current = makeTarget(targetSize.width, targetSize.height);
    writeFoamRef.current = makeTarget(targetSize.width, targetSize.height);

    return {
      scene,
      camera,
      mesh,
      geometry,
      rippleMaterial,
      foamMaterial,
      texelSize: new Vector2(1 / targetSize.width, 1 / targetSize.height),
    };
  }, [depth, foamDecay, resolution, targetSize.height, targetSize.width, width]);

  useEffect(() => {
    clearAllTargets(gl, [
      previousRippleRef.current,
      currentRippleRef.current,
      writeRippleRef.current,
      readFoamRef.current,
      writeFoamRef.current,
    ]);
  }, [fboState, gl]);

  useFrame((state, delta) => {
    if (!enabled) {
      return;
    }

    const settings = latestSettingsRef.current;
    const now = simulation?.time ?? state.clock.elapsedTime;
    const bounds = { width: settings.width, depth: settings.depth };
    const simulationImpacts = simulation?.consumeImpacts?.() ?? [];
    const queuedImpacts = pendingImpactsRef.current.splice(0, pendingImpactsRef.current.length);
    const impactSources = [...simulationImpacts, ...queuedImpacts];
    const impacts = impactSources
      .map((impact) => normalizeImpact(impact, bounds, settings.defaultRadius))
      .filter(Boolean)
      .slice(0, MAX_IMPACTS);
    const foamSignals = simulation?.consumeFoam?.() ?? [];
    const foamSources = [
      ...impactSources,
      ...foamSignals.filter((signal) => signal.kind !== "trail"),
    ];
    const previousTarget = gl.getRenderTarget();

    if (foamSources.length) {
      activeFoamImpactsRef.current.push(
        ...foamSources
          .map((impact) => normalizeFoamImpact(impact, bounds, settings.defaultRadius, now))
          .filter(Boolean),
      );
    }

    activeFoamImpactsRef.current = activeFoamImpactsRef.current
      .filter((impact) => now - impact.startTime <= impact.lifetime)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, MAX_FOAM_IMPACTS);

    for (let i = 0; i < MAX_IMPACTS; i++) {
      fboState.rippleMaterial.uniforms.uImpacts.value[i].copy(
        impacts[i] ?? emptyImpact,
      );
    }

    fboState.mesh.material = fboState.rippleMaterial;
    fboState.rippleMaterial.uniforms.uCurrent.value = currentRippleRef.current.texture;
    fboState.rippleMaterial.uniforms.uPrevious.value = previousRippleRef.current.texture;
    fboState.rippleMaterial.uniforms.uDamping.value = settings.damping;
    fboState.rippleMaterial.uniforms.uWaterSize.value.set(settings.width, settings.depth);
    fboState.rippleMaterial.uniforms.uImpactCount.value = impacts.length;
    gl.setRenderTarget(writeRippleRef.current);
    gl.render(fboState.scene, fboState.camera);

    [previousRippleRef.current, currentRippleRef.current, writeRippleRef.current] = [
      currentRippleRef.current,
      writeRippleRef.current,
      previousRippleRef.current,
    ];

    fboState.mesh.material = fboState.foamMaterial;
    fboState.foamMaterial.uniforms.uPrevious.value = readFoamRef.current.texture;
    for (let i = 0; i < MAX_FOAM_IMPACTS; i++) {
      const activeFoam = activeFoamImpactsRef.current[i];
      fboState.foamMaterial.uniforms.uImpacts.value[i].copy(
        activeFoam?.data ?? emptyImpact,
      );
      fboState.foamMaterial.uniforms.uImpactParams.value[i].copy(
        activeFoam?.params ?? emptyFoamParams,
      );
    }
    fboState.foamMaterial.uniforms.uWaterSize.value.set(settings.width, settings.depth);
    fboState.foamMaterial.uniforms.uTime.value = now;
    fboState.foamMaterial.uniforms.uDelta.value = Math.min(delta, 1 / 20);
    fboState.foamMaterial.uniforms.uFoamDecay.value = settings.foamDecay;
    fboState.foamMaterial.uniforms.uImpactCount.value = activeFoamImpactsRef.current.length;
    gl.setRenderTarget(writeFoamRef.current);
    gl.render(fboState.scene, fboState.camera);

    [readFoamRef.current, writeFoamRef.current] = [
      writeFoamRef.current,
      readFoamRef.current,
    ];

    gl.setRenderTarget(previousTarget);
  });

  useEffect(() => {
    return () => {
      fboState.geometry.dispose();
      fboState.rippleMaterial.dispose();
      fboState.foamMaterial.dispose();
      previousRippleRef.current?.dispose();
      currentRippleRef.current?.dispose();
      writeRippleRef.current?.dispose();
      readFoamRef.current?.dispose();
      writeFoamRef.current?.dispose();
    };
  }, [fboState]);

  return useMemo(
    () => ({
      get rippleTexture() {
        return currentRippleRef.current?.texture ?? null;
      },
      get foamTexture() {
        return readFoamRef.current?.texture ?? null;
      },
      get texelSize() {
        return fboState.texelSize;
      },
      addImpact(worldX, worldZ, strength = 0.25, radius = defaultRadius) {
        const impact = {
          worldX,
          worldZ,
          strength,
          radius,
        };
        const settings = latestSettingsRef.current;
        const normalized = normalizeImpact(
          impact,
          { width: settings.width, depth: settings.depth },
          settings.defaultRadius,
        );

        if (!normalized) {
          return false;
        }

        pendingImpactsRef.current.push(impact);
        return true;
      },
    }),
    [defaultRadius, fboState.texelSize],
  );
}
