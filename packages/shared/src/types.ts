export type AircraftSource = "opensky" | "adsb" | "local" | "mock";

export type DisplayMode = "radar" | "cinematic" | "immersive";

export type LatLon = {
  latitude: number;
  longitude: number;
};

export type ObserverLocation = LatLon & {
  altitudeMeters: number;
};

export type AircraftSnapshot = {
  icao: string;
  flightNumber?: string;
  airline?: string;
  origin?: string;
  destination?: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  speedMetersPerSecond: number;
  headingDegrees: number;
  verticalRateMetersPerSecond: number;
  azimuthDegrees: number;
  elevationDegrees: number;
  distanceMeters: number;
  updatedAt: string;
  source: AircraftSource;
};

export type SystemStatus = {
  provider: AircraftSource;
  connectedClients: number;
  aircraftCount: number;
  lastFetchAt?: string;
  lastError?: string;
  mode: DisplayMode;
};

export type CalibrationPoint = {
  x: number;
  y: number;
};

export type HomographyMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type CalibrationState = {
  roomWidthMeters: number;
  roomLengthMeters: number;
  projectorWidthPixels: number;
  projectorHeightPixels: number;
  northOffsetDegrees: number;
  homography: HomographyMatrix;
  updatedAt: string;
};

export type CalibrationSolveRequest = {
  sourcePoints: [
    CalibrationPoint,
    CalibrationPoint,
    CalibrationPoint,
    CalibrationPoint,
  ];
  targetPoints: [
    CalibrationPoint,
    CalibrationPoint,
    CalibrationPoint,
    CalibrationPoint,
  ];
};

export type PublicConfig = {
  userLocation: ObserverLocation;
  flightData: {
    provider: AircraftSource;
    radiusKm: number;
    pollIntervalMs: number;
    staleAfterMs: number;
  };
  room: {
    widthMeters: number;
    lengthMeters: number;
    ceilingHeightMeters: number;
    northOffsetDegrees: number;
  };
  projector: {
    widthPixels: number;
    heightPixels: number;
  };
  render: {
    defaultMode: DisplayMode;
    minElevationDegrees: number;
    maxTrailSeconds: number;
    maxAircraft: number;
    targetFps: number;
  };
};
