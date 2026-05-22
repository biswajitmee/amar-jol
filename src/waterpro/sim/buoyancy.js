import { MathUtils, Vector3 } from "three";
import { getWaterHeightAt, getWaterNormalAt } from "./useWaveSampler";

const tempNormal = new Vector3();

function getBaseWaterHeight(sampler, x, z, time, params) {
  if (typeof sampler?.getWaterHeightAt === "function") {
    return sampler.getWaterHeightAt(x, z, time, params);
  }

  return getWaterHeightAt(x, z, time, params);
}

export function sampleWaterHeight({
  sampler,
  simulation,
  x,
  z,
  time = 0,
  params = {},
  includeRipples = true,
}) {
  const baseHeight = getBaseWaterHeight(sampler, x, z, time, params);
  const rippleHeight =
    includeRipples && typeof simulation?.getRippleHeightAt === "function"
      ? simulation.getRippleHeightAt(x, z, time)
      : 0;

  return baseHeight + rippleHeight;
}

export function sampleWaterNormal({
  sampler,
  simulation,
  x,
  z,
  time = 0,
  params = {},
  sampleStep = 0.045,
  includeRipples = true,
}) {
  if (!includeRipples && typeof sampler?.getWaterNormalAt === "function") {
    return sampler.getWaterNormalAt(x, z, time, params);
  }

  if (!includeRipples && typeof sampler?.getNormalAt === "function") {
    return sampler.getNormalAt(x, z, time, params);
  }

  if (!includeRipples && !sampler) {
    return getWaterNormalAt(x, z, time, params);
  }

  const left = sampleWaterHeight({
    sampler,
    simulation,
    x: x - sampleStep,
    z,
    time,
    params,
    includeRipples,
  });
  const right = sampleWaterHeight({
    sampler,
    simulation,
    x: x + sampleStep,
    z,
    time,
    params,
    includeRipples,
  });
  const back = sampleWaterHeight({
    sampler,
    simulation,
    x,
    z: z - sampleStep,
    time,
    params,
    includeRipples,
  });
  const front = sampleWaterHeight({
    sampler,
    simulation,
    x,
    z: z + sampleStep,
    time,
    params,
    includeRipples,
  });

  return new Vector3(left - right, sampleStep * 2, back - front).normalize();
}

export function sampleBuoyancyPoints({
  position,
  rotationY = 0,
  sampler,
  simulation,
  time = 0,
  params = {},
  sampleRadius = 0.16,
  includeRipples = true,
}) {
  const radius = Math.max(0.001, sampleRadius);
  const forwardX = Math.sin(rotationY);
  const forwardZ = Math.cos(rotationY);
  const rightX = Math.cos(rotationY);
  const rightZ = -Math.sin(rotationY);
  const sampleDefs = [
    ["center", 0, 0],
    ["front", forwardX * radius, forwardZ * radius],
    ["back", -forwardX * radius, -forwardZ * radius],
    ["left", -rightX * radius, -rightZ * radius],
    ["right", rightX * radius, rightZ * radius],
  ];
  const samples = sampleDefs.map(([name, offsetX, offsetZ]) => {
    const x = position.x + offsetX;
    const z = position.z + offsetZ;
    const waterHeight = sampleWaterHeight({
      sampler,
      simulation,
      x,
      z,
      time,
      params,
      includeRipples,
    });

    return {
      name,
      x,
      z,
      offsetX,
      offsetZ,
      waterHeight,
    };
  });
  const byName = samples.reduce((lookup, sample) => {
    lookup[sample.name] = sample;
    return lookup;
  }, {});
  const averageHeight =
    samples.reduce((total, sample) => total + sample.waterHeight, 0) / samples.length;

  tempNormal
    .set(
      byName.left.waterHeight - byName.right.waterHeight,
      radius * 2,
      byName.back.waterHeight - byName.front.waterHeight,
    )
    .normalize();

  return {
    samples,
    byName,
    averageHeight,
    centerHeight: byName.center.waterHeight,
    normal: tempNormal.clone(),
    pitch: tempNormal.z,
    roll: -tempNormal.x,
  };
}

export function updateBuoyantBody({
  object,
  position = object?.position,
  rotation = object?.rotation,
  velocity,
  sampler,
  simulation,
  time = 0,
  delta = 1 / 60,
  params = {},
  mass = 1,
  buoyancy = 1,
  waterDrag = 0.82,
  floatOffset = 0.02,
  tiltStrength = 0.8,
  sampleRadius = 0.16,
  canSink = false,
  sinkAfter = Infinity,
  sinkSpeed = 0.08,
  age = 0,
  gravity = 0.42,
  verticalDamping = 0.9,
  tiltDamping = 8,
  includeRipples = true,
  applyRotation = true,
}) {
  if (!position || !velocity) {
    return null;
  }

  const safeMass = Math.max(0.001, mass);
  const rotationY = rotation?.y ?? 0;
  const samples = sampleBuoyancyPoints({
    position,
    rotationY,
    sampler,
    simulation,
    time,
    params,
    sampleRadius,
    includeRipples,
  });
  const isSinking = canSink && age >= sinkAfter;
  const sinkDepth = isSinking ? (age - sinkAfter) * sinkSpeed : 0;
  const targetY = samples.averageHeight + floatOffset - sinkDepth;
  const displacement = targetY - position.y;
  const gravityForce = -Math.max(0, gravity) * safeMass;
  const buoyancyForce = displacement * Math.max(0, buoyancy) * 18;
  const dragForce = -velocity.y * Math.max(0, waterDrag) * 6;
  const acceleration = (gravityForce + buoyancyForce + dragForce) / safeMass;

  velocity.y += acceleration * delta;
  if (isSinking) {
    velocity.y -= sinkSpeed * delta;
  }
  velocity.y *= Math.pow(MathUtils.clamp(verticalDamping, 0.01, 0.999), delta * 60);
  position.y += velocity.y * delta;

  if (!isSinking) {
    position.y = MathUtils.damp(position.y, targetY, 1.4, delta);
  }

  if (applyRotation && rotation) {
    const targetPitch = samples.pitch * tiltStrength;
    const targetRoll = samples.roll * tiltStrength;
    rotation.x = MathUtils.damp(rotation.x, targetPitch, tiltDamping, delta);
    rotation.z = MathUtils.damp(rotation.z, targetRoll, tiltDamping, delta);
  }

  return {
    ...samples,
    targetY,
    displacement,
    isSinking,
    velocityY: velocity.y,
  };
}

export function computeBuoyancy(input) {
  const result = updateBuoyantBody({
    ...input,
    mass: input.mass ?? 1,
    buoyancy: input.buoyancy ?? input.stiffness ?? 1,
    waterDrag: input.waterDrag ?? 0.7,
    verticalDamping: input.damping ?? 0.86,
    sampleRadius: input.sampleRadius ?? 0.045,
    floatOffset: input.floatOffset ?? 0.02,
    applyRotation: false,
  });

  return {
    waterHeight: result?.centerHeight ?? 0,
    displacement: result?.displacement ?? 0,
  };
}

export function computeSurfaceRotation({
  sampler,
  simulation,
  x,
  z,
  time,
  intensity = 0.65,
  params = {},
}) {
  const normal = sampleWaterNormal({
    sampler,
    simulation,
    x,
    z,
    time,
    params,
  });

  return {
    x: normal.z * intensity,
    y: 0,
    z: -normal.x * intensity,
  };
}

export function integrateUnderwaterDrift({
  position,
  velocity,
  time,
  delta,
  driftStrength = 0.18,
  sinkSpeed = 0.12,
  seed = 1,
}) {
  velocity.x += Math.sin(time * 0.8 + seed * 4.1) * driftStrength * delta;
  velocity.z += Math.cos(time * 0.62 + seed * 5.7) * driftStrength * delta;
  velocity.y -= sinkSpeed * delta;
  velocity.multiplyScalar(Math.pow(0.96, delta * 60));
  position.addScaledVector(velocity, delta);
}
