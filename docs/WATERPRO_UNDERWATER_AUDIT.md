# WaterPro Underwater Visual Audit

Date: 2026-05-25

## Current Scene Ownership

- Main page: `app/page.tsx` dynamically loads `components/BottleHero.tsx`.
- Active Canvas: `components/BottleHero.tsx`.
- Active scene composition: `components/hero-stage/HeroStageScene.tsx`.
- Active camera: default R3F camera in `BottleHero.tsx`, driven by Theatre object `Water Hero Screen / Hero Camera / Camera`.
- No scroll driver or GSAP timeline is present in the current repo. Theatre is the only camera/editor animation owner found.

## Current Water And Edge

- Water owner: `components/hero-stage/HeroWaterStage.tsx`.
- Water component: `src/waterpro/WaterPro.jsx`.
- Water mesh ref: `waterMeshRef` in `WaterPro.jsx`.
- Water parent/group ref: `groupRef` in `WaterPro.jsx`.
- Water transform defaults: position `[0, 0.95, 2.2]`, rotation `[0, 0, 0]`, scale `[1, 1, 1]`, with Theatre/debug overrides applied by `HeroWaterStage`.
- Water size defaults: width `4.2`, depth `2.35`, vertical scale multiplier `1`.
- World/local surface reference: the water surface is the local `y = 0` plane plus Gerstner/ripple height, transformed by the WaterPro group.
- Wave sampler: `src/waterpro/sim/useWaveSampler.js`.
- Ripple-aware height sampler: `sampleWaterHeight` in `src/waterpro/sim/buoyancy.js`.
- Waterline edge component: `src/waterpro/edge/WaterlineEdgeBand.jsx`.
- The edge band is a visual companion on the camera-near water mesh boundary. It is not the underwater volume and should remain untouched.

## Current Reflection

- Reflection capture component: `src/waterpro/reflection/PlanarReflectionCapture.jsx`.
- Reflection capture hook: `src/waterpro/reflection/usePlanarReflectionCapture.js`.
- `PlanarReflectionCapture` already supports `hiddenObjectRefs`; `WaterPro.jsx` currently hides the waterline edge from the reflection pass.
- The current planar reflection shader uniforms and water shader sampling must remain untouched. New underwater visuals should not be excluded as one root by default. Only particles, bubbles, god rays, caustics helper geometry, and debug helpers should be hidden from the reflection capture. `UnderwaterBackdrop` and `UnderwaterVolume` must remain individually testable in reflection before any exclusion decision.

## Current Bottle

- Procedural bottle: `components/hero-stage/HeroSkincareBottle.tsx`, controlled through `HeroBottleStage.tsx`.
- GLB bottle: `components/hero-stage/LumiereBottleStage.tsx` and `LumiereBottleModel.tsx`.
- This underwater visual pass does not change bottle materials, transforms, Theatre controls, scroll timing, or bubble triggers from bottle motion.

## Pink/Open Lower Area Diagnosis

The missing lower region is exposed scene background/clear/fog beyond the existing water mesh coverage. It is not caused by the waterline edge, an existing underwater volume, or a bottle/camera transform issue.

The safe fix is additive: place a shader-based underwater backdrop and large underwater visual volume below the current water surface, using WaterPro's actual sampled surface height only as the depth reference. This fills the visible lower frame and future deep underwater views without changing the approved upper water.

## Implementation Safety

The underwater pass will:

- Add new modules under `src/waterpro/underwater/`.
- Keep `src/waterpro/UnderwaterFX.jsx` untouched for this first visual pass.
- Mount the new visual-only underwater system independently under the existing WaterPro group.
- Hide only underwater particles, bubbles, god rays, caustics helper geometry, and debug helpers from planar reflection capture.
- Add Leva controls under `Underwater World`.

The underwater pass will not modify:

- Existing water mesh geometry.
- `waterPro.vertex.glsl` or `waterPro.fragment.glsl`.
- Gerstner wave parameters, ripple FBO, foam system, or waterline edge shaders.
- Planar reflection shader behavior or reflection settings.
- Sky background, lighting, camera/Theatre setup, bottle look, or bottle transforms.
