"use client";

import { useFrame } from "@react-three/fiber";
import { button, folder, useControls } from "leva";
import { useCallback, useMemo, useRef, useState } from "react";
import BubbleEmitter from "./BubbleEmitter";
import UnderwaterBackdrop from "./UnderwaterBackdrop";
import UnderwaterCaustics from "./UnderwaterCaustics";
import UnderwaterParticles from "./UnderwaterParticles";
import UnderwaterRays from "./UnderwaterRays";
import UnderwaterVolume from "./UnderwaterVolume";
import { makeUnderwaterPreset } from "./underwaterPresets";
import { triggerBubblePreviewBurst } from "./underwaterRuntimeStore";
import useUnderwaterState from "./useUnderwaterState";

function makeControlSchema(defaults, onBubblePreview) {
  return {
    Atmosphere: folder(
      {
        enabled: {
          value: defaults.enabled,
          label: "Enabled",
        },
        forceUnderwaterPreview: {
          value: defaults.forceUnderwaterPreview,
          label: "Force preview",
        },
        shallowColor: {
          value: defaults.shallowColor,
          label: "Shallow color",
        },
        midDepthColor: {
          value: defaults.midDepthColor,
          label: "Mid color",
        },
        deepColor: {
          value: defaults.deepColor,
          label: "Deep color",
        },
        fogColor: {
          value: defaults.fogColor,
          label: "Fog color",
        },
        fogDensity: {
          value: defaults.fogDensity,
          min: 0.01,
          max: 2,
          step: 0.01,
          label: "Fog density",
        },
        depthGradientStrength: {
          value: defaults.depthGradientStrength,
          min: 0.1,
          max: 3,
          step: 0.01,
          label: "Depth gradient",
        },
        absorptionStrength: {
          value: defaults.absorptionStrength,
          min: 0,
          max: 1.5,
          step: 0.01,
          label: "Absorption",
        },
        crossingBlendDistance: {
          value: defaults.crossingBlendDistance,
          min: 0.02,
          max: 1.4,
          step: 0.01,
          label: "Crossing blend",
        },
        overallOpacity: {
          value: defaults.overallOpacity,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Backdrop opacity",
        },
        volumeOpacity: {
          value: defaults.volumeOpacity,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Volume opacity",
        },
      },
      { collapsed: false },
    ),
    "God Rays": folder(
      {
        raysEnabled: {
          value: defaults.raysEnabled,
          label: "Enabled",
        },
        rayColor: {
          value: defaults.rayColor,
          label: "Color",
        },
        rayIntensity: {
          value: defaults.rayIntensity,
          min: 0,
          max: 1.5,
          step: 0.01,
          label: "Intensity",
        },
        rayOpacity: {
          value: defaults.rayOpacity,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Opacity",
        },
        rayScale: {
          value: defaults.rayScale,
          min: 0.25,
          max: 4,
          step: 0.01,
          label: "Scale",
        },
        rayLength: {
          value: defaults.rayLength,
          min: 1,
          max: 16,
          step: 0.1,
          label: "Length",
        },
        raySpread: {
          value: defaults.raySpread,
          min: 0.2,
          max: 4,
          step: 0.01,
          label: "Spread",
        },
        raySpeed: {
          value: defaults.raySpeed,
          min: 0,
          max: 0.3,
          step: 0.001,
          label: "Speed",
        },
        rayOriginX: {
          value: defaults.rayOriginX,
          min: -8,
          max: 8,
          step: 0.01,
          label: "Origin X",
        },
        rayOriginY: {
          value: defaults.rayOriginY,
          min: -3,
          max: 3,
          step: 0.01,
          label: "Origin Y",
        },
        rayOriginZ: {
          value: defaults.rayOriginZ,
          min: -3,
          max: 3,
          step: 0.01,
          label: "Origin Z",
        },
        rayDirectionX: {
          value: defaults.rayDirectionX,
          min: -1,
          max: 1,
          step: 0.01,
          label: "Direction X",
        },
        rayDirectionY: {
          value: defaults.rayDirectionY,
          min: -1,
          max: 0,
          step: 0.01,
          label: "Direction Y",
        },
        rayDirectionZ: {
          value: defaults.rayDirectionZ,
          min: -1,
          max: 1,
          step: 0.01,
          label: "Direction Z",
        },
        rayDepthFade: {
          value: defaults.rayDepthFade,
          min: 0.05,
          max: 2.5,
          step: 0.01,
          label: "Depth fade",
        },
      },
      { collapsed: true },
    ),
    Caustics: folder(
      {
        causticsEnabled: {
          value: defaults.causticsEnabled,
          label: "Enabled",
        },
        causticsColor: {
          value: defaults.causticsColor,
          label: "Color",
        },
        causticsIntensity: {
          value: defaults.causticsIntensity,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Intensity",
        },
        causticsScale: {
          value: defaults.causticsScale,
          min: 0.5,
          max: 14,
          step: 0.1,
          label: "Scale",
        },
        causticsSpeed: {
          value: defaults.causticsSpeed,
          min: 0,
          max: 0.4,
          step: 0.001,
          label: "Speed",
        },
        causticsDistortion: {
          value: defaults.causticsDistortion,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Distortion",
        },
        causticsDepthFade: {
          value: defaults.causticsDepthFade,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Depth fade",
        },
      },
      { collapsed: true },
    ),
    Particles: folder(
      {
        particlesEnabled: {
          value: defaults.particlesEnabled,
          label: "Enabled",
        },
        particleCount: {
          value: defaults.particleCount,
          min: 0,
          max: 600,
          step: 1,
          label: "Count",
        },
        particleOpacity: {
          value: defaults.particleOpacity,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Opacity",
        },
        particleSize: {
          value: defaults.particleSize,
          min: 0.002,
          max: 0.12,
          step: 0.001,
          label: "Size",
        },
        particleDriftSpeed: {
          value: defaults.particleDriftSpeed,
          min: 0,
          max: 0.4,
          step: 0.001,
          label: "Drift speed",
        },
        particleDriftAmount: {
          value: defaults.particleDriftAmount,
          min: 0,
          max: 0.5,
          step: 0.001,
          label: "Drift amount",
        },
        particleAreaWidth: {
          value: defaults.particleAreaWidth,
          min: 1,
          max: 32,
          step: 0.1,
          label: "Area width",
        },
        particleAreaHeight: {
          value: defaults.particleAreaHeight,
          min: 1,
          max: 18,
          step: 0.1,
          label: "Area height",
        },
        particleAreaDepth: {
          value: defaults.particleAreaDepth,
          min: 1,
          max: 24,
          step: 0.1,
          label: "Area depth",
        },
        particleNearFade: {
          value: defaults.particleNearFade,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Near fade",
        },
        particleFarFade: {
          value: defaults.particleFarFade,
          min: 1,
          max: 24,
          step: 0.1,
          label: "Far fade",
        },
      },
      { collapsed: true },
    ),
    Bubbles: folder(
      {
        bubblesEnabled: {
          value: defaults.bubblesEnabled,
          label: "Enabled",
        },
        triggerPreviewBurst: button(onBubblePreview ?? triggerBubblePreviewBurst),
        bubbleCount: {
          value: defaults.bubbleCount,
          min: 1,
          max: 160,
          step: 1,
          label: "Bubble count",
        },
        bubbleSize: {
          value: defaults.bubbleSize,
          min: 0.004,
          max: 0.14,
          step: 0.001,
          label: "Bubble size",
        },
        bubbleRiseSpeed: {
          value: defaults.bubbleRiseSpeed,
          min: 0.02,
          max: 1.6,
          step: 0.01,
          label: "Rise speed",
        },
        bubbleOpacity: {
          value: defaults.bubbleOpacity,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Opacity",
        },
        bubbleWobble: {
          value: defaults.bubbleWobble,
          min: 0,
          max: 0.6,
          step: 0.01,
          label: "Wobble",
        },
        bubbleColor: {
          value: defaults.bubbleColor,
          label: "Color",
        },
      },
      { collapsed: true },
    ),
    Debug: folder(
      {
        showUnderwaterBounds: {
          value: defaults.showUnderwaterBounds,
          label: "Show bounds",
        },
        showWaterSurfaceReference: {
          value: defaults.showWaterSurfaceReference,
          label: "Show surface",
        },
        hideParticles: {
          value: defaults.hideParticles,
          label: "Hide particles",
        },
        hideRays: {
          value: defaults.hideRays,
          label: "Hide rays",
        },
        hideCaustics: {
          value: defaults.hideCaustics,
          label: "Hide caustics",
        },
        hideBubbles: {
          value: defaults.hideBubbles,
          label: "Hide bubbles",
        },
        freezeUnderwaterTime: {
          value: defaults.freezeUnderwaterTime,
          label: "Freeze time",
        },
      },
      { collapsed: true },
    ),
  };
}

function UnderwaterDebugHelpers({ controls, width, depth, reflectionRef }) {
  const setDebugRef = useCallback(
    (node) => {
      if (reflectionRef) {
        reflectionRef.current = node;
      }
    },
    [reflectionRef],
  );

  if (!controls.showUnderwaterBounds && !controls.showWaterSurfaceReference) {
    return null;
  }

  return (
    <group ref={setDebugRef} name="WaterPro.UnderwaterDebugHelpers">
      {controls.showWaterSurfaceReference ? (
        <mesh
          position={[0, 0.006, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={500}
          frustumCulled={false}
        >
          <planeGeometry args={[width, depth, 1, 1]} />
          <meshBasicMaterial
            color="#65fff0"
            wireframe
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {controls.showUnderwaterBounds ? (
        <mesh
          position={[0, -controls.particleAreaHeight * 0.5, 0]}
          renderOrder={501}
          frustumCulled={false}
        >
          <boxGeometry
            args={[
              controls.particleAreaWidth,
              controls.particleAreaHeight,
              controls.particleAreaDepth,
            ]}
          />
          <meshBasicMaterial
            color="#8fffea"
            wireframe
            transparent
            opacity={0.28}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function UnderwaterWorldScene({
  controls,
  rootRef,
  waterGroupRef,
  simulation,
  sampler,
  waterParams,
  width,
  depth,
  enabled = true,
  bubblePreviewToken = 0,
  reflectionRefs = null,
}) {
  const localRootRef = useRef(null);
  const setRootRef = useCallback(
    (node) => {
      localRootRef.current = node;

      if (rootRef) {
        rootRef.current = node;
      }
    },
    [rootRef],
  );
  const underwaterStateRef = useUnderwaterState({
    waterGroupRef,
    simulation,
    sampler,
    waterParams,
    width,
    depth,
    enabled: enabled && controls.enabled,
    crossingBlendDistance: controls.crossingBlendDistance,
    forceUnderwaterPreview: controls.forceUnderwaterPreview,
  });

  useFrame(() => {
    if (localRootRef.current) {
      localRootRef.current.visible = Boolean(enabled && controls.enabled);
    }
  });

  if (!enabled || !controls.enabled) {
    return null;
  }

  return (
    <group ref={setRootRef} name="WaterPro.UnderwaterWorld">
      <UnderwaterBackdrop
        controls={controls}
        underwaterStateRef={underwaterStateRef}
        waterGroupRef={waterGroupRef}
        width={width}
        depth={depth}
        enabled={enabled}
      />
      <UnderwaterVolume
        controls={controls}
        underwaterStateRef={underwaterStateRef}
        waterGroupRef={waterGroupRef}
        enabled={enabled}
      />
      <UnderwaterRays
        reflectionRef={reflectionRefs?.raysRef}
        controls={controls}
        underwaterStateRef={underwaterStateRef}
        waterGroupRef={waterGroupRef}
        width={width}
        depth={depth}
        enabled={enabled}
      />
      <UnderwaterCaustics
        reflectionRef={reflectionRefs?.causticsRef}
        controls={controls}
        underwaterStateRef={underwaterStateRef}
        width={width}
        depth={depth}
        enabled={enabled}
      />
      <UnderwaterParticles
        reflectionRef={reflectionRefs?.particlesRef}
        controls={controls}
        underwaterStateRef={underwaterStateRef}
        enabled={enabled}
      />
      <BubbleEmitter
        reflectionRef={reflectionRefs?.bubblesRef}
        controls={controls}
        waterGroupRef={waterGroupRef}
        width={width}
        depth={depth}
        enabled={enabled}
        previewBurstToken={bubblePreviewToken}
      />
      <UnderwaterDebugHelpers
        reflectionRef={reflectionRefs?.debugRef}
        controls={controls}
        width={width}
        depth={depth}
      />
    </group>
  );
}

function UnderwaterWorldWithControls(props) {
  const defaults = useMemo(() => makeUnderwaterPreset(), []);
  const [bubblePreviewToken, setBubblePreviewToken] = useState(0);
  const handleBubblePreview = useCallback(() => {
    triggerBubblePreviewBurst();
    setBubblePreviewToken((token) => token + 1);
  }, []);
  const [panelControls] = useControls(
    "Underwater World",
    () => makeControlSchema(defaults, handleBubblePreview),
    { collapsed: true, order: 6 },
    [defaults, handleBubblePreview],
  );
  const controls = useMemo(
    () => ({
      ...defaults,
      ...panelControls,
    }),
    [defaults, panelControls],
  );

  return (
    <UnderwaterWorldScene
      {...props}
      controls={controls}
      bubblePreviewToken={bubblePreviewToken}
    />
  );
}

export default function UnderwaterWorld({ debug = true, ...props }) {
  const controls = useMemo(() => makeUnderwaterPreset(), []);

  if (!debug) {
    return <UnderwaterWorldScene {...props} controls={controls} />;
  }

  return <UnderwaterWorldWithControls {...props} />;
}
