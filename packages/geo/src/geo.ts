import type { LatLon, ObserverLocation } from "@skyceil/shared";
import { EARTH_RADIUS_METERS } from "./constants.js";

export type GeoBoundingBox = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

export type SkyPosition = {
  azimuthDegrees: number;
  elevationDegrees: number;
  distanceMeters: number;
};

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function haversineDistanceMeters(
  origin: LatLon,
  destination: LatLon,
  earthRadiusMeters = EARTH_RADIUS_METERS,
): number {
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLon = toRadians(destination.longitude - origin.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function initialBearingDegrees(
  origin: LatLon,
  destination: LatLon,
): number {
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const deltaLon = toRadians(destination.longitude - origin.longitude);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

export function destinationPoint(
  origin: LatLon,
  distanceMeters: number,
  bearingDegrees: number,
  earthRadiusMeters = EARTH_RADIUS_METERS,
): LatLon {
  const angularDistance = distanceMeters / earthRadiusMeters;
  const bearing = toRadians(bearingDegrees);
  const lat1 = toRadians(origin.latitude);
  const lon1 = toRadians(origin.longitude);

  const sinLat2 =
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing);
  const lat2 = Math.asin(clamp(sinLat2, -1, 1));
  const y = Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1);
  const x = Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2);
  const lon2 = lon1 + Math.atan2(y, x);

  return {
    latitude: toDegrees(lat2),
    longitude: ((toDegrees(lon2) + 540) % 360) - 180,
  };
}

export function curvatureDropMeters(
  groundDistanceMeters: number,
  earthRadiusMeters = EARTH_RADIUS_METERS,
): number {
  return (
    (groundDistanceMeters * groundDistanceMeters) / (2 * earthRadiusMeters)
  );
}

export function elevationAngleDegrees(input: {
  observerAltitudeMeters?: number;
  targetAltitudeMeters: number;
  groundDistanceMeters: number;
  applyCurvature?: boolean;
  earthRadiusMeters?: number;
}): number {
  const earthRadiusMeters = input.earthRadiusMeters ?? EARTH_RADIUS_METERS;
  const observerAltitudeMeters = input.observerAltitudeMeters ?? 0;
  const curvatureCorrection =
    input.applyCurvature === false
      ? 0
      : curvatureDropMeters(input.groundDistanceMeters, earthRadiusMeters);
  const relativeAltitude =
    input.targetAltitudeMeters - observerAltitudeMeters - curvatureCorrection;

  if (input.groundDistanceMeters <= 1) {
    return relativeAltitude >= 0 ? 90 : -90;
  }

  return toDegrees(Math.atan2(relativeAltitude, input.groundDistanceMeters));
}

export function geodeticToSky(
  observer: ObserverLocation,
  target: LatLon & { altitudeMeters: number },
): SkyPosition {
  const distanceMeters = haversineDistanceMeters(observer, target);
  const azimuthDegrees = initialBearingDegrees(observer, target);
  const elevationDegrees = elevationAngleDegrees({
    observerAltitudeMeters: observer.altitudeMeters,
    targetAltitudeMeters: target.altitudeMeters,
    groundDistanceMeters: distanceMeters,
  });

  return {
    azimuthDegrees,
    elevationDegrees,
    distanceMeters,
  };
}

export function boundingBoxForRadius(
  center: LatLon,
  radiusMeters: number,
  earthRadiusMeters = EARTH_RADIUS_METERS,
): GeoBoundingBox {
  const angularRadius = radiusMeters / earthRadiusMeters;
  const lat = toRadians(center.latitude);
  const lon = toRadians(center.longitude);

  const minLat = lat - angularRadius;
  const maxLat = lat + angularRadius;
  const deltaLon = Math.asin(Math.sin(angularRadius) / Math.cos(lat));
  const minLon = lon - deltaLon;
  const maxLon = lon + deltaLon;

  return {
    minLatitude: clamp(toDegrees(minLat), -90, 90),
    maxLatitude: clamp(toDegrees(maxLat), -90, 90),
    minLongitude: ((toDegrees(minLon) + 540) % 360) - 180,
    maxLongitude: ((toDegrees(maxLon) + 540) % 360) - 180,
  };
}
