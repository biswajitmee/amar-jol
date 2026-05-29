"use client";

import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import {
  Box3,
  MathUtils,
  Mesh,
  Object3D,
  Vector3,
  type Group,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Vector3Tuple = [number, number, number];

type SketchModelProps = {
  modelUrl: string;
  visible: boolean;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: number;
  targetHeight: number;
  renderOrder: number;
};

type PreparedModel = {
  offset: Vector3;
  scale: number;
  scene: Group;
};

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh === true;
}

function prepareModel(
  sourceScene: Group,
  targetHeight: number,
  renderOrder: number,
): PreparedModel {
  const scene = sourceScene.clone(true);
  const bounds = new Box3().setFromObject(scene);

  scene.traverse((child: Object3D) => {
    if (!isMesh(child)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
    child.renderOrder = renderOrder;
  });

  if (bounds.isEmpty()) {
    return {
      offset: new Vector3(),
      scale: 1,
      scene,
    };
  }

  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const modelScale = size.y > 0 ? targetHeight / size.y : 1;

  return {
    offset: new Vector3(-center.x, -bounds.min.y, -center.z),
    scale: modelScale,
    scene,
  };
}

export default function SketchModel({
  modelUrl,
  visible,
  position,
  rotation,
  scale,
  targetHeight,
  renderOrder,
}: SketchModelProps) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const preparedModel = useMemo(
    () => prepareModel(gltf.scene, targetHeight, renderOrder),
    [gltf.scene, renderOrder, targetHeight],
  );
  const finalScale = preparedModel.scale * scale;

  if (!visible) {
    return null;
  }

  return (
    <group
      position={position}
      rotation={[
        MathUtils.degToRad(rotation[0]),
        MathUtils.degToRad(rotation[1]),
        MathUtils.degToRad(rotation[2]),
      ]}
      scale={[finalScale, finalScale, finalScale]}
      renderOrder={renderOrder}
    >
      <group position={preparedModel.offset}>
        <primitive object={preparedModel.scene} dispose={null} />
      </group>
    </group>
  );
}

export function preloadSketchModel(modelUrl: string) {
  useLoader.preload(GLTFLoader, modelUrl);
}
