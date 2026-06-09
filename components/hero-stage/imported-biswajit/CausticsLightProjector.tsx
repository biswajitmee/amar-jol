"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Vec3Tuple = [number, number, number];
type RectTuple = [number, number];

type CausticsLightProjectorProps = {
  src: string;
  height?: number;
  target?: Vec3Tuple;
  angleDeg?: number;
  radius?: number;
  tile?: number;
  worldCell?: number;
  cookieSize?: number;
  intensity?: number;
  distance?: number;
  playbackRate?: number;
  fitRect?: RectTuple;
  maxTile?: number;
  updateFps?: number;
};

export default function CausticsLightProjector({
  src,
  height = 1000,
  target = [0, 0, 0],
  angleDeg,
  radius = 1000,
  tile = 1,
  worldCell,
  cookieSize = 2048,
  intensity = 88,
  distance = 4500,
  playbackRate = 4,
  fitRect,
  maxTile = 4,
  updateFps = 12,
}: CausticsLightProjectorProps) {
  const light = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastDrawTimeRef = useRef(0);
  const { gl } = useThree();

  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    video.playbackRate = playbackRate;
    videoRef.current = video;

    const play = () => {
      void video.play().catch(() => {
        // Keep the light mounted; browsers can delay autoplay until metadata is ready.
      });
    };

    video.addEventListener("loadedmetadata", play);
    video.load();
    play();

    return () => {
      video.removeEventListener("loadedmetadata", play);
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (videoRef.current === video) {
        videoRef.current = null;
      }
    };
  }, [playbackRate, src]);

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    const s = THREE.MathUtils.clamp(cookieSize | 0, 256, 4096);
    c.width = s;
    c.height = s;
    return c;
  }, [cookieSize]);

  const cookieTex = useMemo(() => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy?.() ?? 1;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, [canvas, gl]);

  const fittedRadius = useMemo(() => {
    if (!fitRect) return radius;
    const [width, rectHeight] = fitRect;
    return 0.5 * Math.hypot(width, rectHeight);
  }, [fitRect, radius]);

  const angle = useMemo(() => {
    if (angleDeg !== undefined) {
      return THREE.MathUtils.degToRad(Math.min(angleDeg, 89));
    }

    const nextAngle = Math.atan(
      Math.max(1, fittedRadius) / Math.max(1, height),
    );
    return Math.min(nextAngle, Math.PI / 2 - 0.05);
  }, [angleDeg, fittedRadius, height]);

  const computedTile = useMemo(() => {
    if (!worldCell || worldCell <= 0) return tile;
    const footprint = 2 * fittedRadius;
    return Math.min(Math.max(1, Math.round(footprint / worldCell)), maxTile);
  }, [fittedRadius, maxTile, tile, worldCell]);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastDrawTimeRef.current < 1 / Math.max(1, updateFps)) {
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    lastDrawTimeRef.current = now;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    const tileCount = Math.max(1, Math.floor(computedTile));
    const cellWidth = canvas.width / tileCount;
    const cellHeight = canvas.height / tileCount;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    for (let i = 0; i < tileCount; i += 1) {
      for (let j = 0; j < tileCount; j += 1) {
        ctx.drawImage(
          video,
          0,
          0,
          video.videoWidth || 1,
          video.videoHeight || 1,
          i * cellWidth,
          j * cellHeight,
          cellWidth,
          cellHeight,
        );
      }
    }

    cookieTex.needsUpdate = true;
  });

  useEffect(() => {
    if (!light.current || !targetRef.current) return;

    light.current.target = targetRef.current;
    targetRef.current.position.set(target[0], target[1], target[2]);
    targetRef.current.updateMatrixWorld();
  }, [target]);

  return (
    <>
      <spotLight
        ref={light}
        position={[target[0], height, target[2]]}
        map={cookieTex}
        intensity={intensity}
        distance={distance}
        angle={angle}
        penumbra={1}
        decay={0}
        color="white"
        castShadow={false}
      />
      <object3D ref={targetRef} />
    </>
  );
}
