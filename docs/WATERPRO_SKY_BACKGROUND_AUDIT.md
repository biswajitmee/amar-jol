# WaterPro Sky Background And Light Controls Audit

Date: 2026-05-24

## Current Scene Ownership

- App entry: `app/page.tsx` dynamically imports `components/BottleHero.tsx`.
- Canvas and root scene: `components/BottleHero.tsx`.
- Theatre camera rig: `components/BottleHero.tsx`, using the existing `Water Hero Screen / Hero Camera / Camera` Theatre object.
- Hero world wrapper: `components/hero-stage/HeroStageWorld.tsx`.
- Hero scene composition: `components/hero-stage/HeroStageScene.tsx`.
- Current render order in the hero scene: `HeroWaterStage`, `HeroBottleStage`, then `AurenBottleStage`.

## Current Water Component

- Water stage: `components/hero-stage/HeroWaterStage.tsx`.
- Main water implementation: `src/waterpro/WaterPro.jsx`.
- Water shader files: `src/waterpro/shaders/waterPro.vertex.glsl` and `src/waterpro/shaders/waterPro.fragment.glsl`.
- Ripple and foam simulation: `src/waterpro/sim/*`.
- Underwater system: `src/waterpro/UnderwaterFX.jsx`.
- Water Leva/debug controls: `src/waterpro/debug/WaterDebugPanel.jsx`.

This pass should not modify the water component, water shaders, wave displacement, ripple simulation, foam, underwater system, water presets, or water debug controls.

## Current Bottle Components

- Procedural bottle controls: `components/hero-stage/HeroBottleControls.tsx`.
- Procedural bottle stage: `components/hero-stage/HeroBottleStage.tsx`.
- Procedural bottle mesh/materials: `components/hero-stage/HeroSkincareBottle.tsx`.
- GLB bottle stage: `components/hero-stage/AurenBottleStage.tsx`.
- GLB bottle model: `components/hero-stage/AurenBottleModel.tsx`.
- GLB model source: `model/auren-bottle-2.glb`, served by `app/api/models/auren-bottle-2/route.ts`.

This pass should not modify bottle transforms, materials, model loading, or Theatre object setup.

## Current Reflection Setup

- Planar reflection capture component: `src/waterpro/reflection/PlanarReflectionCapture.jsx`.
- Planar reflection hook: `src/waterpro/reflection/usePlanarReflectionCapture.js`.
- `WaterPro` passes the existing water mesh and material refs into `PlanarReflectionCapture`.
- The reflection pass renders the existing scene through a mirrored virtual camera and hides only the water mesh and reflection debug preview.
- Because the sky can be a normal scene mesh, it should render into the existing reflection target without any water shader changes.

This pass should not modify the planar reflection capture, reflection uniforms, reflection blend, or reflection debug controls.

## Current Light Setup

Current lights live directly in `components/BottleHero.tsx`:

- Ambient light: warm soft color, fixed intensity.
- Directional light: warm key/sun light, fixed position and intensity.
- Two point lights: warm side/fill accents.

There is no dedicated Leva lighting hook yet. The safest integration is to move only these light values behind a new Leva-powered lighting rig component while preserving the same default values.

## Current Leva Setup

- The Leva root is mounted in `components/BottleHero.tsx`.
- Bottle controls use `useControls("Hero Bottle", ...)` in `components/hero-stage/HeroBottleControls.tsx`.
- Water controls use `useControls("WaterPro", ...)` in `src/waterpro/debug/WaterDebugPanel.jsx`.

The new controls should be isolated in new folders:

- `Sky Background`
- `Hero Lighting`

## Existing Environment Or Background

- `components/BottleHero.tsx` currently attaches a flat scene background color: `#f1c9af`.
- `RendererMood` also sets renderer clear color and fog to soft pink values.
- There is no existing environment map, HDRI, skydome, image backdrop, or scene-background texture.

The flat background is the source of the current empty peach sky. Replacing the attached background color with an image-backed scene mesh is the least invasive visual fix.

## Proposed Sky Image Method

Use a large, unlit, image-textured curved backdrop mesh:

- New component: `src/waterpro/environment/SkyImageBackground.jsx`.
- Default texture path prop: `skyTexturePath`.
- Default asset path: `/waterpro/sky-blue-clouds-large.png`.
- Geometry: a lightweight curved vertical card, not a full procedural sky.
- Material: `meshBasicMaterial` with an image texture, opacity, brightness tint, no depth write, and no lighting dependency.
- Texture color space: `SRGBColorSpace`.
- Texture sampling: clamp wrapping, linear filtering, anisotropy where supported.
- Placement: far behind the bottle and water horizon, large enough that frame edges are not visible.
- Reflection compatibility: because the backdrop is a real mesh in the R3F scene, the existing planar reflection pass should capture it naturally.

This is safer than assigning `scene.background` because it gives horizon position, scale, opacity, rotation, and curvature controls while staying inside the existing reflection pipeline.

## Proposed Sky Control Integration

Add a small hook or inline Leva setup for the new component:

- Folder: `Sky Background`.
- Controls: `enabled`, `skyTexturePath`, `positionX`, `positionY`, `positionZ`, `scaleX`, `scaleY`, `rotationY`, `curvature`, `opacity`, `horizonOffset`, `brightness`, and `tint`.
- Scope: controls affect only `SkyImageBackground`.
- Best insertion point: `components/hero-stage/HeroStageScene.tsx`, before water and bottles, so the backdrop exists behind the scene without reparenting water or bottle objects.

## Proposed Light Control Integration

Add a small controlled lighting rig:

- Suggested file: `components/hero-stage/HeroLightingRig.tsx`.
- Hook: `useControls("Hero Lighting", ...)`.
- Preserve existing default values from `components/BottleHero.tsx`.
- Replace only the fixed light JSX in `BottleHero.tsx` with this rig.
- Controls:
  - Sun / Key Light: enabled, color, intensity, positionX, positionY, positionZ.
  - Fill Light: enabled, color, intensity, positionX, positionY, positionZ.
  - Ambient / Soft Light: enabled, color, intensity.
  - Optional values: `horizonGlowIntensity`, `warmTintStrength`, kept as non-invasive helper values for the light colors/intensities only.

## Files To Modify

- `components/BottleHero.tsx`
  - Replace fixed lights with a controlled rig.
  - Remove or neutralize only the flat attached background color so the image backdrop is visible.
- `components/hero-stage/HeroStageScene.tsx`
  - Mount `SkyImageBackground` before water and bottles.
- `components/hero-stage/HeroLightingRig.tsx`
  - New isolated lighting controls and lights.
- `src/waterpro/environment/SkyImageBackground.jsx`
  - New isolated sky image backdrop component and Leva controls.
- `public/waterpro/sky-blue-clouds-large.png`
  - Default image-based blue sky texture with real cloud detail for water reflection capture.

## Files To Keep Untouched

- `src/waterpro/WaterPro.jsx`
- `src/waterpro/shaders/waterPro.vertex.glsl`
- `src/waterpro/shaders/waterPro.fragment.glsl`
- `src/waterpro/sim/*`
- `src/waterpro/UnderwaterFX.jsx`
- `src/waterpro/reflection/PlanarReflectionCapture.jsx`
- `src/waterpro/reflection/usePlanarReflectionCapture.js`
- `src/waterpro/debug/WaterDebugPanel.jsx`
- `src/waterpro/debug/waterLevaPresets.json`
- `components/hero-stage/HeroWaterStage.tsx`
- `components/hero-stage/HeroBottleControls.tsx`
- `components/hero-stage/HeroBottleStage.tsx`
- `components/hero-stage/HeroSkincareBottle.tsx`
- `components/hero-stage/AurenBottleStage.tsx`
- `components/hero-stage/AurenBottleModel.tsx`
- `theaterstate.json`

## Compatibility Notes

- The sky component should use `frustumCulled={false}` to avoid accidental clipping while tuning.
- The sky material should use `depthWrite={false}` and a low render order so it behaves as a background.
- The sky mesh should not sit on or cut through the water plane. Horizon placement should be controlled visually through `positionY`, `positionZ`, `scaleY`, and `horizonOffset`.
- No water material or mesh changes are required for this task.

## Verification Plan

1. Run a production build or type check equivalent available in this Next project.
2. Run the dev server.
3. Open the hero page and browser console.
4. Confirm the sky appears behind the bottle and water horizon.
5. Confirm the `Sky Background` Leva folder changes sky position, scale, opacity, curvature, brightness, tint, and texture path.
6. Confirm the `Hero Lighting` Leva folder changes sun/key, fill, and ambient values.
7. Confirm water waves, ripples, foam, underwater, reflection controls, and bottle/Theatre setup were not modified.
8. Capture default, sky-position variation, lighting variation, and final beauty screenshots.
