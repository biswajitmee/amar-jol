export function waterPointToUv(point, bounds) {
  const width = Math.max(bounds.width ?? 1, 0.001);
  const depth = Math.max(bounds.depth ?? 1, 0.001);
  const u = point.x / width + 0.5;
  const v = point.z / depth + 0.5;

  return {
    u,
    v,
    inside: u >= 0 && u <= 1 && v >= 0 && v <= 1,
  };
}

export function createImpactSystem(initialBounds = {}) {
  let bounds = {
    width: initialBounds.width ?? 4,
    depth: initialBounds.depth ?? 2.4,
  };
  const impacts = [];
  let impactId = 0;

  return {
    setBounds(nextBounds) {
      bounds = {
        width: nextBounds.width ?? bounds.width,
        depth: nextBounds.depth ?? bounds.depth,
      };
    },
    emitImpact(input) {
      const uv = input.uv ?? waterPointToUv(input, bounds);

      if (!uv.inside) {
        return false;
      }

      const strength = Math.max(0, input.strength ?? 0.35);
      const radius = Math.max(0.005, input.radius ?? 0.06);

      impacts.push({
        id: impactId++,
        u: uv.u,
        v: uv.v,
        x: input.x ?? input.worldX ?? 0,
        z: input.z ?? input.worldZ ?? 0,
        worldX: input.x ?? input.worldX ?? 0,
        worldZ: input.z ?? input.worldZ ?? 0,
        time: input.time ?? 0,
        strength,
        radius,
        foamOpacity: Math.max(0, input.foamOpacity ?? strength * 1.15),
        foamRadius: Math.max(0.005, input.foamRadius ?? radius * 1.2),
        foamLifetime: Math.max(0.1, input.foamLifetime ?? 1.65),
        foamExpansion: Math.max(0, input.foamExpansion ?? radius * 0.85),
      });
      return true;
    },
    consumeImpacts() {
      const next = impacts.splice(0, impacts.length);
      return next;
    },
  };
}
