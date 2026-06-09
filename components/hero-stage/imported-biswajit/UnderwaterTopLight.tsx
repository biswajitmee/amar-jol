"use client";

import { folder, useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  getDeploymentHeroLevaValue,
  isProductionDeployment,
} from "@/src/waterpro/debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "@/src/waterpro/debug/heroLevaPresetRegistry";

const UNDERWATER_TOP_LIGHT_SCOPE = "underwaterTopLight";
const UNDERWATER_TOP_LIGHT_PRESET_KEYS = [
  "enabled",
  "color",
  "strength",
  "radius",
  "length",
  "depth",
  "softness",
] as const;

type UnderwaterTopLightValues = {
  enabled: boolean;
  color: string;
  strength: number;
  radius: number;
  length: number;
  depth: number;
  softness: number;
};

function getDefaultValues(): UnderwaterTopLightValues {
  return {
    enabled: getDeploymentHeroLevaValue(
      UNDERWATER_TOP_LIGHT_SCOPE,
      "enabled",
      true,
    ),
    color: getDeploymentHeroLevaValue(
      UNDERWATER_TOP_LIGHT_SCOPE,
      "color",
      "#9fcfff",
    ),
    strength: getDeploymentHeroLevaValue(
      UNDERWATER_TOP_LIGHT_SCOPE,
      "strength",
      9,
    ),
    radius: getDeploymentHeroLevaValue(
      UNDERWATER_TOP_LIGHT_SCOPE,
      "radius",
      1.5,
    ),
    length: getDeploymentHeroLevaValue(
      UNDERWATER_TOP_LIGHT_SCOPE,
      "length",
      42,
    ),
    depth: getDeploymentHeroLevaValue(
      UNDERWATER_TOP_LIGHT_SCOPE,
      "depth",
      16,
    ),
    softness: getDeploymentHeroLevaValue(
      UNDERWATER_TOP_LIGHT_SCOPE,
      "softness",
      0.82,
    ),
  };
}

function UnderwaterTopLightScene({
  values,
}: {
  values: UnderwaterTopLightValues;
}) {
  const offsets = useMemo(
    () =>
      [
        [0, 0, 0, 0.56],
        [1, 0, 0, 0.11],
        [-1, 0, 0, 0.11],
        [0, 0, 1, 0.11],
        [0, 0, -1, 0.11],
      ] as const,
    [],
  );

  if (!values.enabled) {
    return null;
  }

  const sourceRadius = THREE.MathUtils.clamp(values.radius, 0, 24);
  const reach = Math.max(0, values.length + values.depth);
  const decay = 1;

  return (
    <>
      {offsets.map(([x, y, z, weight], index) => (
        <pointLight
          key={index}
          position={[
            x * sourceRadius,
            y * sourceRadius,
            z * sourceRadius,
          ]}
          color={values.color}
          intensity={values.strength * weight}
          distance={reach}
          decay={decay}
          castShadow={false}
        />
      ))}
    </>
  );
}

function UnderwaterTopLightControls() {
  const [values, setValues] = useControls(
    "Imported Underwater Top Light",
    () => ({
      Light: folder(
        {
          enabled: {
            value: true,
            label: "Enabled",
          },
          color: {
            value: "#9fcfff",
            label: "Color",
          },
          strength: {
            value: 9,
            min: 0,
            max: 8000,
            step: 0.01,
            label: "Strength",
          },
          radius: {
            value: 1.5,
            min: 0,
            max: 24,
            step: 0.1,
            label: "Radius",
          },
          length: {
            value: 42,
            min: 0,
            max: 580,
            step: 0.1,
            label: "Length",
          },
          depth: {
            value: 16,
            min: 0,
            max: 820,
            step: 0.1,
            label: "Depth",
          },
          softness: {
            value: 0.82,
            min: 0,
            max: 1,
            step: 0.01,
            label: "Softness",
          },
        },
        { collapsed: false },
      ),
    }),
    { collapsed: false, order: 5 },
    [],
  ) as unknown as [
    UnderwaterTopLightValues,
    (values: Partial<UnderwaterTopLightValues>) => void,
  ];
  const valuesRef = useRef<UnderwaterTopLightValues>(values);
  valuesRef.current = values;

  useEffect(() => {
    return registerHeroLevaPresetScope(UNDERWATER_TOP_LIGHT_SCOPE, {
      getValues: () =>
        pickPresetValues(valuesRef.current, UNDERWATER_TOP_LIGHT_PRESET_KEYS),
      applyValues: setValues as (values: Record<string, unknown>) => void,
    });
  }, [setValues]);

  return <UnderwaterTopLightScene values={values} />;
}

export default function UnderwaterTopLight() {
  if (isProductionDeployment()) {
    return <UnderwaterTopLightScene values={getDefaultValues()} />;
  }

  return <UnderwaterTopLightControls />;
}
