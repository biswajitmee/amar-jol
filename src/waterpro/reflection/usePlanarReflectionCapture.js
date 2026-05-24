"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  LinearFilter,
  Matrix4,
  Plane,
  RGBAFormat,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from "three";

const DEFAULT_TARGET_SCALE = 0.5;
const MIN_TARGET_SCALE = 0.1;
const MAX_TARGET_SCALE = 1;
const MIN_TARGET_SIZE = 32;

function clampTargetScale(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_TARGET_SCALE;
  }

  return Math.min(MAX_TARGET_SCALE, Math.max(MIN_TARGET_SCALE, numeric));
}

function makeRenderTarget(width, height, gl) {
  const target = new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  });

  target.texture.name = "WaterPro.PlanarReflection";
  target.texture.generateMipmaps = false;
  target.texture.colorSpace = gl.outputColorSpace;

  return target;
}

function ensureVirtualCamera(camera, virtualCameraRef) {
  if (!virtualCameraRef.current || virtualCameraRef.current.type !== camera.type) {
    virtualCameraRef.current = camera.clone();
  }

  return virtualCameraRef.current;
}

function syncCameraBasics(sourceCamera, targetCamera) {
  targetCamera.near = sourceCamera.near;
  targetCamera.far = sourceCamera.far;
  targetCamera.layers.mask = sourceCamera.layers.mask;

  if (sourceCamera.isPerspectiveCamera && targetCamera.isPerspectiveCamera) {
    targetCamera.fov = sourceCamera.fov;
    targetCamera.aspect = sourceCamera.aspect;
    targetCamera.focus = sourceCamera.focus;
    targetCamera.zoom = sourceCamera.zoom;
    targetCamera.filmGauge = sourceCamera.filmGauge;
    targetCamera.filmOffset = sourceCamera.filmOffset;
  }

  if (sourceCamera.isOrthographicCamera && targetCamera.isOrthographicCamera) {
    targetCamera.left = sourceCamera.left;
    targetCamera.right = sourceCamera.right;
    targetCamera.top = sourceCamera.top;
    targetCamera.bottom = sourceCamera.bottom;
    targetCamera.zoom = sourceCamera.zoom;
  }
}

function hideObject(object, hiddenObjects) {
  if (!object || hiddenObjects.some((entry) => entry.object === object)) {
    return;
  }

  hiddenObjects.push({
    object,
    visible: object.visible,
  });
  object.visible = false;
}

function restoreHiddenObjects(hiddenObjects) {
  for (const entry of hiddenObjects) {
    entry.object.visible = entry.visible;
  }

  hiddenObjects.length = 0;
}

export function usePlanarReflectionCapture({
  waterMeshRef,
  enabled = true,
  targetScale = DEFAULT_TARGET_SCALE,
  clipBias = 0,
  hiddenObjectRefs = [],
  framePriority = -1,
} = {}) {
  const { camera, gl, scene, size } = useThree();
  const safeTargetScale = clampTargetScale(targetScale);
  const pixelRatio = typeof gl.getPixelRatio === "function" ? gl.getPixelRatio() : 1;
  const targetWidth = Math.max(
    MIN_TARGET_SIZE,
    Math.round(size.width * pixelRatio * safeTargetScale),
  );
  const targetHeight = Math.max(
    MIN_TARGET_SIZE,
    Math.round(size.height * pixelRatio * safeTargetScale),
  );
  const renderTarget = useMemo(
    () => makeRenderTarget(targetWidth, targetHeight, gl),
    [gl, targetHeight, targetWidth],
  );
  const reflectionTextureMatrix = useMemo(() => new Matrix4(), []);
  const virtualCameraRef = useRef(null);
  const reflectionEnabledRef = useRef(false);
  const helpers = useMemo(
    () => ({
      cameraWorldPosition: new Vector3(),
      clipPlane: new Vector4(),
      hiddenObjects: [],
      lookAtPosition: new Vector3(),
      normal: new Vector3(),
      plane: new Plane(),
      planePoint: new Vector3(),
      q: new Vector4(),
      rotationMatrix: new Matrix4(),
      scissor: new Vector4(),
      target: new Vector3(),
      view: new Vector3(),
      viewport: new Vector4(),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      renderTarget.dispose();
    };
  }, [renderTarget]);

  useFrame(() => {
    const waterMesh = waterMeshRef?.current;
    const virtualCamera = ensureVirtualCamera(camera, virtualCameraRef);

    reflectionEnabledRef.current = false;

    if (!enabled || !waterMesh || !renderTarget || !virtualCamera) {
      return;
    }

    waterMesh.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();

    helpers.planePoint.set(0, 0, 0).applyMatrix4(waterMesh.matrixWorld);
    helpers.normal.set(0, 1, 0).transformDirection(waterMesh.matrixWorld).normalize();
    helpers.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    helpers.view.subVectors(helpers.planePoint, helpers.cameraWorldPosition);

    if (helpers.view.dot(helpers.normal) > 0) {
      return;
    }

    syncCameraBasics(camera, virtualCamera);

    helpers.view.reflect(helpers.normal).negate();
    helpers.view.add(helpers.planePoint);

    helpers.rotationMatrix.extractRotation(camera.matrixWorld);
    helpers.lookAtPosition.set(0, 0, -1);
    helpers.lookAtPosition.applyMatrix4(helpers.rotationMatrix);
    helpers.lookAtPosition.add(helpers.cameraWorldPosition);

    helpers.target.subVectors(helpers.planePoint, helpers.lookAtPosition);
    helpers.target.reflect(helpers.normal).negate();
    helpers.target.add(helpers.planePoint);

    virtualCamera.position.copy(helpers.view);
    virtualCamera.up.set(0, 1, 0);
    virtualCamera.up.applyMatrix4(helpers.rotationMatrix);
    virtualCamera.up.reflect(helpers.normal);
    virtualCamera.lookAt(helpers.target);
    virtualCamera.updateMatrixWorld();
    virtualCamera.matrixWorldInverse.copy(virtualCamera.matrixWorld).invert();
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

    reflectionTextureMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1,
    );
    reflectionTextureMatrix.multiply(virtualCamera.projectionMatrix);
    reflectionTextureMatrix.multiply(virtualCamera.matrixWorldInverse);

    helpers.plane.setFromNormalAndCoplanarPoint(helpers.normal, helpers.planePoint);
    helpers.plane.applyMatrix4(virtualCamera.matrixWorldInverse);
    helpers.clipPlane.set(
      helpers.plane.normal.x,
      helpers.plane.normal.y,
      helpers.plane.normal.z,
      helpers.plane.constant,
    );

    const projection = virtualCamera.projectionMatrix;
    helpers.q.x = (Math.sign(helpers.clipPlane.x) + projection.elements[8]) / projection.elements[0];
    helpers.q.y = (Math.sign(helpers.clipPlane.y) + projection.elements[9]) / projection.elements[5];
    helpers.q.z = -1;
    helpers.q.w = (1 + projection.elements[10]) / projection.elements[14];
    helpers.clipPlane.multiplyScalar(2 / helpers.clipPlane.dot(helpers.q));

    projection.elements[2] = helpers.clipPlane.x;
    projection.elements[6] = helpers.clipPlane.y;
    projection.elements[10] = helpers.clipPlane.z + 1 - clipBias;
    projection.elements[14] = helpers.clipPlane.w;

    if (virtualCamera.projectionMatrixInverse) {
      virtualCamera.projectionMatrixInverse.copy(projection).invert();
    }

    const previousRenderTarget = gl.getRenderTarget();
    const previousXrEnabled = gl.xr.enabled;
    const previousShadowAutoUpdate = gl.shadowMap?.autoUpdate;
    const previousAutoClear = gl.autoClear;
    const previousViewport = gl.getViewport(helpers.viewport);
    const previousScissor = gl.getScissor(helpers.scissor);
    const previousScissorTest = gl.getScissorTest();

    hideObject(waterMesh, helpers.hiddenObjects);
    for (const objectRef of hiddenObjectRefs) {
      hideObject(objectRef?.current, helpers.hiddenObjects);
    }

    try {
      gl.xr.enabled = false;

      if (gl.shadowMap) {
        gl.shadowMap.autoUpdate = false;
      }

      gl.autoClear = true;
      gl.setRenderTarget(renderTarget);

      if (gl.state?.buffers?.depth?.setMask) {
        gl.state.buffers.depth.setMask(true);
      }

      gl.clear(true, true, true);
      gl.render(scene, virtualCamera);
      reflectionEnabledRef.current = true;
    } finally {
      restoreHiddenObjects(helpers.hiddenObjects);
      gl.setRenderTarget(previousRenderTarget);
      gl.xr.enabled = previousXrEnabled;

      if (gl.shadowMap && previousShadowAutoUpdate !== undefined) {
        gl.shadowMap.autoUpdate = previousShadowAutoUpdate;
      }

      gl.autoClear = previousAutoClear;
      gl.setViewport(previousViewport);
      gl.setScissor(previousScissor);
      gl.setScissorTest(previousScissorTest);
    }
  }, framePriority);

  return {
    reflectionCamera: virtualCameraRef,
    reflectionClipBias: clipBias,
    reflectionEnabled: enabled && Boolean(renderTarget),
    reflectionTargetScale: safeTargetScale,
    reflectionTargetSize: {
      width: targetWidth,
      height: targetHeight,
    },
    reflectionTexture: renderTarget.texture,
    reflectionTextureMatrix,
  };
}
