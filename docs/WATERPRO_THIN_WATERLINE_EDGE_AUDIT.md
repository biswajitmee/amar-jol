# WaterPro Thin Waterline Edge Audit

Date: 2026-05-24

## Files Inspected

- `src/waterpro/WaterPro.jsx`
- `src/waterpro/shaders/waterPro.vertex.glsl`
- `src/waterpro/shaders/waterPro.fragment.glsl`
- `src/waterpro/sim/useWaterSimulation.js`
- `src/waterpro/sim/useWaveSampler.js`
- `src/waterpro/sim/useRippleFBO.js`
- `src/waterpro/UnderwaterFX.jsx`
- `src/waterpro/reflection/PlanarReflectionCapture.jsx`
- `src/waterpro/reflection/usePlanarReflectionCapture.js`
- `components/hero-stage/HeroWaterStage.tsx`
- `components/BottleHero.tsx`
- `src/waterpro/debug/WaterDebugPanel.jsx`
- `src/waterpro/debug/heroLevaPresets.json`
- `src/waterpro/debug/waterLevaPresets.json`

## Current Water Renderer

The water surface is rendered in `src/waterpro/WaterPro.jsx` by a single `<mesh>` using:

- `planeGeometry` with `[settings.width, settings.depth, settings.segments, settings.segments]`
- a custom `ShaderMaterial`
- vertex shader: `src/waterpro/shaders/waterPro.vertex.glsl`
- fragment shader: `src/waterpro/shaders/waterPro.fragment.glsl`

The water mesh is stored as `waterMeshRef` and passed into `PlanarReflectionCapture`.

## Source Of The Visible Edge

There is no current edge band, waterline strip, side wall, or separator mesh for the front water boundary.

The visible moving boundary is the actual displaced border of the current WaterPro plane. The vertex shader maps the original plane geometry from local `position.xy` into a displaced water-space position:

- local x: `surfacePosition.x + displacement.x`
- local y: `displacement.y + rippleDisplacement`
- local z: `surfacePosition.y + displacement.z`

The lower/pink/open area visible below the boundary is exposed scene clear/background beyond the current water/underwater coverage. It is not produced by an existing underwater separator plane. This should be treated as a separate composition/coverage issue for a later pass, not solved by making the waterline thick.

## Existing Edge/Wall Systems

No existing edge-specific component was found.

Related systems that should remain untouched:

- Water surface shader color/alpha/reflection behavior
- Gerstner wave parameters
- Ripple FBO and impact system
- Foam texture and foam controls
- Underwater fog, particles, and caustics
- Planar reflection texture capture and water reflection sampling
- Bottle/sky/camera/lighting/Theatre setup

## Reusable Motion Sources

The safest motion source is the same data already driving the current WaterPro shader:

- `settings.waveStrength`
- `settings.waveSpeed`
- `settings.waveScale`
- current hard-coded wave layers in `waterPro.vertex.glsl`
- `rippleFBO.rippleTexture`
- `rippleFBO.texelSize`
- `settings.rippleStrength`

The CPU sampler in `src/waterpro/sim/useWaveSampler.js` matches Gerstner height, but it does not expose the full horizontal Gerstner displacement used by the shader. For exact visual attachment, the new band should use a dedicated vertex shader that mirrors the current water vertex displacement and samples the same ripple texture. This keeps the band synchronized with the water without changing the existing water shader.

## Safest Files To Add Or Modify

Add:

- `src/waterpro/edge/WaterlineEdgeBand.jsx`
- `src/waterpro/edge/waterlineEdge.vert.glsl`
- `src/waterpro/edge/waterlineEdge.frag.glsl`

Modify minimally:

- `src/waterpro/WaterPro.jsx` to mount the companion edge band and pass existing settings/ripple texture
- `src/waterpro/reflection/PlanarReflectionCapture.jsx` to accept an additional hidden object ref
- `src/waterpro/debug/heroLevaPresetRegistry.ts`, `src/waterpro/debug/deploymentLevaPresets.ts`, and `app/api/hero-leva-presets/route.ts` only if the new Leva controls should persist into deployment like the existing non-WaterPro Leva presets

## Proposed Implementation Method

Create a separate transparent edge ribbon rendered as a child of the existing WaterPro group. It will:

- render only along the camera-near water edge
- use the same WaterPro transform by living under the same group
- compute the edge side from camera distance to the two water bounds
- use the same Gerstner math and ripple texture as the current water vertex shader
- offset upward by a tiny amount to avoid z-fighting
- use a dedicated transparent shader with feathered vertical alpha
- render with low opacity, dark teal lower absorption, and a tiny warm highlight
- stay hidden during the planar reflection capture so the reflection texture does not include a duplicate stripe

The implementation will not modify the current water surface shader, water geometry, wave parameters, ripple/foam/underwater behavior, sky, bottle, lighting, camera, or current reflection shader logic.
