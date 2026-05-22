"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { createFoamTrailSystem } from "./foamTrailSystem";
import { createImpactSystem } from "./impactSystem";
import { useWaveSampler } from "./useWaveSampler";

export function useWaterSimulation(settings) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const sampler = useWaveSampler(settings);
  const impactSystem = useMemo(
    () => createImpactSystem({ width: settings.width, depth: settings.depth }),
    [],
  );
  const foamTrailSystem = useMemo(
    () => createFoamTrailSystem({ width: settings.width, depth: settings.depth }),
    [],
  );
  const timeRef = useRef(0);
  const rippleEventsRef = useRef([]);

  useFrame(({ clock }) => {
    timeRef.current = clock.elapsedTime;
    impactSystem.setBounds(settingsRef.current);
    foamTrailSystem.setBounds(settingsRef.current);
    rippleEventsRef.current = rippleEventsRef.current.filter(
      (event) => timeRef.current - event.time < 3.2,
    );
  });

  return useMemo(
    () => ({
      sampler,
      get time() {
        return timeRef.current;
      },
      emitImpact(input) {
        const impact = {
          time: timeRef.current,
          ...input,
        };
        const emitted = impactSystem.emitImpact(impact);

        if (emitted) {
          rippleEventsRef.current.push({
            x: impact.x ?? impact.worldX ?? 0,
            z: impact.z ?? impact.worldZ ?? 0,
            time: impact.time,
            strength: Math.max(0, impact.strength ?? 0.25),
            radius: Math.max(0.01, impact.radius ?? settingsRef.current.rippleRadius ?? 0.16),
          });
        }

        return emitted;
      },
      consumeImpacts() {
        return impactSystem.consumeImpacts();
      },
      emitFoam(input) {
        return foamTrailSystem.emitTrail({
          time: timeRef.current,
          ...input,
        });
      },
      consumeFoam() {
        return foamTrailSystem.consumeTrails();
      },
      getRippleHeightAt(x, z, time = timeRef.current) {
        const rippleStrength = settingsRef.current.rippleStrength ?? 0.55;
        const rippleSpeed = settingsRef.current.rippleBuoyancySpeed ?? 0.46;

        return rippleEventsRef.current.reduce((height, event) => {
          const age = time - event.time;

          if (age < 0 || age > 3.2) {
            return height;
          }

          const distance = Math.hypot(x - event.x, z - event.z);
          const ringRadius = event.radius + age * rippleSpeed;
          const width = Math.max(0.045, event.radius * 0.75 + age * 0.018);
          const distanceToRing = distance - ringRadius;
          const envelope = Math.exp(-(distanceToRing * distanceToRing) / (width * width));
          const fade = Math.exp(-age * 1.65);
          const oscillation = Math.cos(distanceToRing * 24 - age * 4.5);

          return height + event.strength * rippleStrength * 0.045 * envelope * fade * oscillation;
        }, 0);
      },
    }),
    [foamTrailSystem, impactSystem, sampler],
  );
}
