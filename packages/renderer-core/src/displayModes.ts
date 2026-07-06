import type { DisplayMode } from "@skyceil/shared";

export type RenderProfile = {
  mode: DisplayMode;
  bloomStrength: number;
  gridOpacity: number;
  gridRings: number;
  gridRadials: number;
  markerScale: number;
  trailOpacity: number;
  trailSeconds: number;
  labelVisibility: "none" | "selected" | "all";
  lerpFactor: number;
  backgroundStarCount: number;
};

export const renderProfiles: Record<DisplayMode, RenderProfile> = {
  radar: {
    mode: "radar",
    bloomStrength: 0.9,
    gridOpacity: 0.32,
    gridRings: 7,
    gridRadials: 24,
    markerScale: 0.82,
    trailOpacity: 0.62,
    trailSeconds: 45,
    labelVisibility: "all",
    lerpFactor: 0.22,
    backgroundStarCount: 240,
  },
  cinematic: {
    mode: "cinematic",
    bloomStrength: 1.35,
    gridOpacity: 0.12,
    gridRings: 4,
    gridRadials: 12,
    markerScale: 1.05,
    trailOpacity: 0.82,
    trailSeconds: 120,
    labelVisibility: "selected",
    lerpFactor: 0.13,
    backgroundStarCount: 520,
  },
  immersive: {
    mode: "immersive",
    bloomStrength: 1.15,
    gridOpacity: 0.2,
    gridRings: 6,
    gridRadials: 18,
    markerScale: 0.96,
    trailOpacity: 0.72,
    trailSeconds: 90,
    labelVisibility: "selected",
    lerpFactor: 0.17,
    backgroundStarCount: 420,
  },
};
