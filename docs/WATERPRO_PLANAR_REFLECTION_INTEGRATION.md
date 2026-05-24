# WaterPro Planar Reflection Integration Audit

Date: 2026-05-23
Branch: `waterpro-planar-reflection`

## Safety Checkpoint

- Git repo: yes.
- Starting branch: `main`.
- Created branch: `waterpro-planar-reflection`.
- Commit: not created. The working tree already contained uncommitted user work before this audit, including modified hero/water files and untracked bottle/model API files. Those changes were left untouched and uncommitted.
- Files changed by this audit: this document only.

## Current Water Ownership

Main WaterPro component:

- `src/waterpro/WaterPro.jsx`

Water mount path:

- `app/page.tsx` dynamically imports `components/BottleHero.tsx`.
- `components/BottleHero.tsx` renders the R3F `Canvas` and `Scene`.
- `components/hero-stage/HeroStageWorld.tsx` creates bottle Leva settings.
- `components/hero-stage/HeroStageScene.tsx` mounts `HeroWaterStage`, `HeroBottleStage`, and `AurenBottleStage`.
- `components/hero-stage/HeroWaterStage.tsx` owns Theatre water controls and renders `WaterPro`.

Water refs:

- `src/waterpro/WaterPro.jsx:264` has `materialRef`.
- `src/waterpro/WaterPro.jsx:265` has `groupRef`.
- `src/waterpro/WaterPro.jsx:365` applies `groupRef` to the water parent group.
- `src/waterpro/WaterPro.jsx:366` renders the actual water `<mesh>`, but there is currently no dedicated water mesh ref.
- `src/waterpro/WaterPro.jsx:368-371` attaches the existing `ShaderMaterial` through `materialRef`.

Water geometry and material:

- Geometry: `src/waterpro/WaterPro.jsx:366-367`, a plane using `[settings.width, settings.depth, settings.segments, settings.segments]`.
- Material: `src/waterpro/WaterPro.jsx:305-317`, a custom `ShaderMaterial`.
- Material flags: `transparent: true`, `depthWrite: false`, `depthTest: true`, `side: DoubleSide`, `toneMapped: false`.

Shader files:

- Vertex shader: `src/waterpro/shaders/waterPro.vertex.glsl`
- Fragment shader: `src/waterpro/shaders/waterPro.fragment.glsl`

Current WaterPro uniforms:

- `uTime`
- `uWaterColor`
- `uDeepColor`
- `uUnderwaterColor`
- `uUnderwaterMix`
- `uWaveStrength`
- `uWaveSpeed`
- `uWaveScale`
- `uSunDirection`
- `uOpacity`
- `uFresnelPower`
- `uReflectionStrength`
- `uRippleStrength`
- `uRippleTexel`
- `uFoamColor`
- `uFoamStrength`
- `uFoamDecay`
- `uRippleTexture`
- `uFoamTexture`

Preset and editor files:

- `src/waterpro/debug/WaterDebugPanel.jsx` defines `WATER_PRO_PRESETS`, the Leva `WaterPro` panel, save/load keys, and the Reflection slider.
- `components/hero-stage/HeroWaterStage.tsx` duplicates the water preset values for Theatre controls and passes `theatreSettings` into `WaterPro`.
- `src/waterpro/debug/waterLevaPresets.json` stores saved panel presets.
- `app/api/waterpro-presets/route.ts` reads/writes `waterLevaPresets.json`.
- `theaterstate.json` currently contains camera state only, not water or bottle overrides.

## Reflection Search Results

Current reflection-related matches:

- `reflection` appears only as `reflectionStrength`, shader color math, presets, and editor controls.
- `WebGLRenderTarget` appears only in `src/waterpro/sim/useRippleFBO.js` for ripple and foam simulation targets.
- `envMap` appears only as `envMapIntensity={1.7}` on the procedural bottle cap material in `components/hero-stage/HeroSkincareBottle.tsx`.
- `Fresnel` appears only as the label/control and `uFresnelPower` shader uniform.
- `uReflection` appears only as `uReflectionStrength`.

No matches were found for:

- `Reflector`
- `reflector`
- `useFBO`
- `renderTarget`
- `virtualCamera`
- `textureMatrix`
- `mirrorCamera`
- `cubeCamera`
- `tReflection`
- `onBeforeRender`

Conclusion: live planar bottle reflection does not exist now. There is no reflection render target, no virtual/mirrored camera, no texture projection matrix, and no `tReflection`/scene reflection sampler in the water shader.

## What The Current Reflection Slider Controls

The current Reflection slider is not connected to a live scene reflection texture.

It controls `reflectionStrength`, which flows through:

- `src/waterpro/debug/WaterDebugPanel.jsx:403-409`, Leva label `Reflection`.
- `components/hero-stage/HeroWaterStage.tsx:303-305`, Theatre control.
- `components/hero-stage/HeroWaterStage.tsx:404`, passed to WaterPro settings.
- `src/waterpro/WaterPro.jsx:293`, assigned to `uReflectionStrength`.
- `src/waterpro/WaterPro.jsx:334`, updated per frame.
- `src/waterpro/shaders/waterPro.fragment.glsl:100-105`, where it scales a warm hard-coded `reflectionColor`, Fresnel mix, and sparkle highlights.

So the slider currently controls Fresnel/highlight intensity only. It is not sampling the scene or bottle.

## Current Bottle Ownership

Scene mount:

- `components/hero-stage/HeroStageScene.tsx:20-22` renders water first, then `HeroBottleStage`, then `AurenBottleStage`.

Procedural bottle:

- `components/hero-stage/HeroBottleControls.tsx` defines Leva controls for the procedural bottle.
- `components/hero-stage/HeroBottleStage.tsx` defines Theatre controls for the procedural bottle and renders `HeroSkincareBottle`.
- `components/hero-stage/HeroSkincareBottle.tsx` renders the procedural bottle group and meshes.
- Parent group ref: `components/hero-stage/HeroSkincareBottle.tsx:85`.
- Parent group: `components/hero-stage/HeroSkincareBottle.tsx:120`.
- Animated transform: `components/hero-stage/HeroSkincareBottle.tsx:94-113`.

GLB Auren bottle:

- `components/hero-stage/AurenBottleStage.tsx` defines Theatre controls for the GLB bottle and renders `AurenBottleModel`.
- `components/hero-stage/AurenBottleModel.tsx` loads `/api/models/auren-bottle-2`.
- Model route: `app/api/models/auren-bottle-2/route.ts`.
- Model file: `model/auren-bottle-2.glb`.
- Parent group: `components/hero-stage/AurenBottleModel.tsx:70-85`.
- GLB scene primitive: `components/hero-stage/AurenBottleModel.tsx:80-84`.
- The model traversal sets `castShadow` and `receiveShadow` on all children in `components/hero-stage/AurenBottleModel.tsx:40-43`.

Both bottle systems should remain visible during any future reflection render pass unless the product direction chooses one bottle source.

## Canvas, Camera, And Renderer

Canvas ownership:

- `components/BottleHero.tsx:169-180` owns the R3F `Canvas`.
- Canvas camera prop: `components/BottleHero.tsx:171-175`, position `[0, 1.92, 8.6]`, rotation `[8.5deg, 0, 0]`, fov `45`.
- Canvas GL prop: `components/BottleHero.tsx:176`, `preserveDrawingBuffer: true`.
- Canvas shadows: `components/BottleHero.tsx:177`, `shadows`.
- DPR: no explicit `dpr` prop is configured.

Active camera ownership:

- `components/BottleHero.tsx:108-123` has `TheatreCameraRig`.
- `TheatreCameraRig` uses the default R3F camera from `useThree()` and mutates it from Theatre values.
- `components/BottleHero.tsx:71-84` applies Theatre position, rotation, and fov.
- `theaterstate.json` currently stores Camera static overrides only.

Renderer setup:

- `components/BottleHero.tsx:125-143` has `RendererMood`.
- `gl.outputColorSpace = SRGBColorSpace`.
- `gl.toneMapping = ACESFilmicToneMapping`.
- `gl.toneMappingExposure = 0.18`.
- `gl.setClearColor("#EAD0DB", 1)`.
- `scene.fog = new FogExp2(new Color("#EAD0DB"), 0.00028)`.
- Scene background color is attached at `components/BottleHero.tsx:148`.

Lighting:

- Ambient light: `components/BottleHero.tsx:150`.
- Directional light: `components/BottleHero.tsx:151-155`.
- Point lights: `components/BottleHero.tsx:156-157`.
- No light currently has an explicit `castShadow` prop.

## Underwater, Ripple, Foam, And Buoyancy

Underwater:

- `src/waterpro/UnderwaterFX.jsx`
- Mounted from `src/waterpro/WaterPro.jsx:383-393`.
- Reads the active camera from `useThree()` at `src/waterpro/UnderwaterFX.jsx:68`.
- Updates `uUnderwaterMix` and `uUnderwaterColor` at `src/waterpro/UnderwaterFX.jsx:221-222`.
- Adds underwater particles at `src/waterpro/UnderwaterFX.jsx:243-253`.
- Adds caustics mesh at `src/waterpro/UnderwaterFX.jsx:255-267`.
- Mutates scene fog and tone exposure while underwater.

Ripples and foam:

- `src/waterpro/sim/useRippleFBO.js` creates ripple and foam `WebGLRenderTarget`s.
- It renders internal offscreen simulation passes with an orthographic camera and fullscreen mesh.
- Its textures are passed into WaterPro as `uRippleTexture` and `uFoamTexture`.
- Shader files: `src/waterpro/shaders/rippleUpdate.frag` and `src/waterpro/shaders/foamMask.frag`.

Simulation and buoyancy:

- `src/waterpro/sim/useWaterSimulation.js`
- `src/waterpro/sim/useWaveSampler.js`
- `src/waterpro/sim/buoyancy.js`
- `src/waterpro/sim/impactSystem.js`
- `src/waterpro/sim/foamTrailSystem.js`

Water objects:

- `src/waterpro/objects/FallingLeaf.jsx`
- `src/waterpro/objects/FloatingLeaf.jsx`
- `src/waterpro/objects/BuoyantObject.jsx`

## Minimum Future Additions And Edits

Add:

- `src/waterpro/reflection/PlanarReflectionCapture.jsx` or `src/waterpro/reflection/usePlanarReflectionCapture.js`

Modify:

- `src/waterpro/WaterPro.jsx`
- `src/waterpro/shaders/waterPro.vertex.glsl`
- `src/waterpro/shaders/waterPro.fragment.glsl`
- Optionally `components/hero-stage/HeroStageScene.tsx` or `components/hero-stage/HeroWaterStage.tsx` only if the capture component needs to live as a sibling outside WaterPro.

Avoid modifying unless proven necessary:

- `components/BottleHero.tsx`, because camera composition and renderer mood are approved.
- `components/hero-stage/HeroBottleStage.tsx`, `components/hero-stage/AurenBottleStage.tsx`, and bottle model/material files, because the bottle must remain visible in the reflection pass.
- Preset files and Theatre state, because existing values are approved.

## Proposed Implementation Architecture

Add a standalone `PlanarReflectionCapture` component or hook that:

- Uses `useThree()` to access the existing renderer, scene, size, and active camera.
- Allocates a `WebGLRenderTarget`, likely half or fixed resolution first for safety.
- Allocates a mirrored/virtual `PerspectiveCamera`.
- Computes the water plane from the existing water mesh or group world matrix.
- Mirrors the active camera across that plane without changing the real camera.
- Builds a projected texture matrix for sampling the reflection in the water shader.
- Renders the existing scene into the render target.
- During only that render pass, hides the water mesh and debug helpers that cause recursion.
- Keeps the procedural bottle and Auren GLB bottle visible.
- Restores visibility, XR state, shadow/camera/render-target state, viewport, scissor, clear color, and render target after the pass.
- Disposes the render target on unmount.

Pass data into the existing water shader:

- Add new uniforms only, such as `tPlanarReflection`, `uReflectionTextureMatrix`, `uPlanarReflectionEnabled`, and `uPlanarReflectionStrength`.
- Keep existing `uReflectionStrength` behavior unchanged.
- Keep current material, water geometry, vertex displacement, ripple FBO, foam logic, underwater logic, water transform, camera, bottle transforms, Theatre controls, and preset values unchanged.
- Add projected reflection coordinates as a varying from the vertex shader.
- Sample the reflection in the fragment shader only when enabled and when projected coordinates are valid.

Blend conservatively:

- Distort the reflection gently using existing normal data already computed from Gerstner waves, ripple gradients, micro noise, and `uRippleTexture`.
- Start with a very low multiplier independent from the approved `uReflectionStrength` look, then optionally let `uReflectionStrength` act as an upper bound only after visual approval.
- Preserve the current warm Fresnel/highlight path exactly so that disabling the reflection texture returns the same water appearance.
- Avoid changing alpha math, roughness-like highlight feel, foam, ripple displacement, underwater fog, caustics, or render order unless a verified bug demands it.

## Recursion And Debug Visibility Rules

During the future reflection render pass, hide only:

- The WaterPro water mesh, once a `waterMeshRef` exists.
- Water texture debug preview meshes, when `showRippleTexture` or `showFoamTexture` is enabled.
- Buoyancy/sample debug helper meshes if visible.
- Any future reflection debug preview plane, if added.

Do not hide:

- `HeroSkincareBottle`
- `AurenBottleModel`
- Lights
- Background/fog unless a test shows the reflection target needs a controlled clear
- Non-recursive water-related scene objects such as leaves, unless explicitly undesired in reflections

## Preserving Current Appearance

The future implementation should be visually no-op by default until the reflection texture is verified:

- Add uniforms with fallback values that sample a 1x1 black/transparent texture or disable the reflection branch.
- Keep `uReflectionStrength` and `uFresnelPower` semantics intact.
- Do not replace `ShaderMaterial`.
- Do not replace plane geometry or segment count.
- Do not move, rotate, scale, or reparent the water.
- Do not change `renderOrder`, transparency, depth flags, tone mapping flag, colors, opacity, wave/ripple/foam/underwater defaults, or Theatre/editor values.
- Gate new behavior with an explicit enable flag until the capture target is proven correct.

## Verification Plan Before Blending Into Water

Before connecting the reflection texture to the water appearance:

1. Add a temporary debug preview of the reflection render target outside the water material, ideally an unlit `meshBasicMaterial` plane or Leva-gated overlay.
2. Confirm the bottle appears in the render target while the water mesh is hidden.
3. Confirm the render target does not show recursive water/reflection feedback.
4. Confirm the virtual camera tracks the Theatre-controlled active camera.
5. Confirm the virtual camera mirrors across the actual transformed water plane, including the current WaterPro group position, rotation, and scale.
6. Confirm the target uses the existing renderer color management without changing the main render.
7. Confirm the main scene still has no compile/runtime errors.
8. Only then pass the texture and projection matrix into the water shader and enable very low-strength blending.

## Rollback Plan

Safe rollback options:

- Because this audit only adds `docs/WATERPRO_PLANAR_REFLECTION_INTEGRATION.md`, remove that file to roll back the audit itself.
- Future implementation should be isolated behind a single added reflection component/hook and additive shader uniforms, making rollback a small file removal plus removal of the new uniforms/varying references.
- The branch `waterpro-planar-reflection` contains the work. Switching back to `main` returns to the original branch without discarding uncommitted user work.
- Do not use `git reset --hard` or checkout paths over user changes.

