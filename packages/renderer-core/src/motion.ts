import { destinationPoint, geodeticToSky } from "@skyceil/geo";
import type { AircraftSnapshot, ObserverLocation } from "@skyceil/shared";

const MAX_PREDICTION_SECONDS = 20;

export function predictAircraftSnapshot(
  snapshot: AircraftSnapshot,
  nowMs: number,
  observer: ObserverLocation,
): AircraftSnapshot {
  const updatedAtMs = Date.parse(snapshot.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return snapshot;
  }

  const elapsedSeconds = Math.max(
    0,
    Math.min(MAX_PREDICTION_SECONDS, (nowMs - updatedAtMs) / 1000),
  );

  if (
    elapsedSeconds <= 0.01 ||
    !Number.isFinite(snapshot.speedMetersPerSecond) ||
    !Number.isFinite(snapshot.headingDegrees)
  ) {
    return snapshot;
  }

  const predictedPoint = destinationPoint(
    { latitude: snapshot.latitude, longitude: snapshot.longitude },
    snapshot.speedMetersPerSecond * elapsedSeconds,
    snapshot.headingDegrees,
  );
  const predictedAltitude =
    snapshot.altitudeMeters +
    snapshot.verticalRateMetersPerSecond * elapsedSeconds;
  const sky = geodeticToSky(observer, {
    ...predictedPoint,
    altitudeMeters: predictedAltitude,
  });

  return {
    ...snapshot,
    latitude: predictedPoint.latitude,
    longitude: predictedPoint.longitude,
    altitudeMeters: predictedAltitude,
    azimuthDegrees: sky.azimuthDegrees,
    elevationDegrees: sky.elevationDegrees,
    distanceMeters: sky.distanceMeters,
  };
}
