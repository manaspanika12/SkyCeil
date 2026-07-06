import type {
  AircraftSnapshot,
  CalibrationState,
  DisplayMode,
  PublicConfig,
  SystemStatus,
} from "./types.js";

export const socketEvents = {
  aircraftSnapshot: "aircraft:snapshot",
  aircraftRemoved: "aircraft:removed",
  systemStatus: "system:status",
  calibrationUpdated: "calibration:updated",
  modeSet: "mode:set",
  calibrationUpdate: "calibration:update",
  settingsUpdate: "settings:update",
} as const;

export type ServerToClientEvents = {
  [socketEvents.aircraftSnapshot]: (aircraft: AircraftSnapshot[]) => void;
  [socketEvents.aircraftRemoved]: (icaoIds: string[]) => void;
  [socketEvents.systemStatus]: (status: SystemStatus) => void;
  [socketEvents.calibrationUpdated]: (calibration: CalibrationState) => void;
};

export type ClientToServerEvents = {
  [socketEvents.modeSet]: (mode: DisplayMode) => void;
  [socketEvents.calibrationUpdate]: (calibration: CalibrationState) => void;
  [socketEvents.settingsUpdate]: (settings: Partial<PublicConfig>) => void;
};
