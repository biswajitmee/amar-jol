"use client";

import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import {
  Box3,
  MathUtils,
  Object3D,
  Vector3,
  type Group,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const LUMIERE_BOTTLE_MODEL_URL = "/api/models/lumiere-de-la-mer-bottle";
const TARGET_MODEL_HEIGHT = 2.6;

type Vector3Tuple = [number, number, number];

type LumiereBottleModelProps = {
  visible: boolean;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: number;
};

type PreparedModel = {
  offset: Vector3;
  scale: number;
  scene: Group;
};

function prepareModel(scene: Group): PreparedModel {
  const clone = scene.clone(true);
  const bounds = new Box3().setFromObject(clone);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = size.y > 0 ? TARGET_MODEL_HEIGHT / size.y : 1;
  const offset = new Vector3(-center.x, -bounds.min.y, -center.z);

  clone.traverse((child: Object3D) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  return {
    offset,
    scale,
    scene: clone,
  };
}

export default function LumiereBottleModel({
  visible,
  position,
  rotation,
  scale,
}: LumiereBottleModelProps) {
  const gltf = useLoader(GLTFLoader, LUMIERE_BOTTLE_MODEL_URL);
  const preparedModel = useMemo(
    () => prepareModel(gltf.scene),
    [gltf.scene],
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
      renderOrder={42}
    >
      <primitive
        object={preparedModel.scene}
        position={preparedModel.offset}
        dispose={null}
      />
    </group>
  );
}

useLoader.preload(GLTFLoader, LUMIERE_BOTTLE_MODEL_URL);
