import { waterPointToUv } from "./impactSystem";

export function createFoamTrailSystem(initialBounds = {}) {
  let bounds = {
    width: initialBounds.width ?? 4,
    depth: initialBounds.depth ?? 2.4,
  };
  const trails = [];

  return {
    setBounds(nextBounds) {
      bounds = {
        width: nextBounds.width ?? bounds.width,
        depth: nextBounds.depth ?? bounds.depth,
      };
    },
    emitTrail(input) {
      const uv = input.uv ?? waterPointToUv(input, bounds);

      if (!uv.inside) {
        return false;
      }

      trails.push({
        u: uv.u,
        v: uv.v,
        x: input.x ?? input.worldX ?? 0,
        z: input.z ?? input.worldZ ?? 0,
        worldX: input.x ?? input.worldX ?? 0,
        worldZ: input.z ?? input.worldZ ?? 0,
        time: input.time ?? 0,
        kind: input.kind ?? "trail",
        strength: Math.max(0, input.strength ?? 0.28),
        radius: Math.max(0.006, input.radius ?? 0.045),
        foamOpacity: Math.max(0, input.foamOpacity ?? input.strength ?? 0.28),
        foamRadius: Math.max(0.006, input.foamRadius ?? input.radius ?? 0.045),
        foamLifetime: Math.max(0.1, input.foamLifetime ?? 0.65),
        foamExpansion: Math.max(0, input.foamExpansion ?? 0.02),
      });
      return true;
    },
    consumeTrails() {
      return trails.splice(0, trails.length);
    },
  };
}
