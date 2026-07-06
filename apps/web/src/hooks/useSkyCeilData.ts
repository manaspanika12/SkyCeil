import {
  socketEvents,
  type AircraftSnapshot,
  type CalibrationSolveRequest,
  type CalibrationState,
  type ClientToServerEvents,
  type DisplayMode,
  type PublicConfig,
  type ServerToClientEvents,
  type SystemStatus,
} from "@skyceil/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const apiOrigin =
  (import.meta.env.VITE_SKYCEIL_API_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "";
const socketPath =
  (import.meta.env.VITE_SKYCEIL_SOCKET_PATH as string | undefined) ??
  "/socket.io";
const socketTransports = (
  (import.meta.env.VITE_SKYCEIL_SOCKET_TRANSPORTS as string | undefined) ??
  "websocket,polling"
)
  .split(",")
  .map((transport) => transport.trim())
  .filter(
    (transport): transport is "websocket" | "polling" =>
      transport === "websocket" || transport === "polling",
  );

export type LocationUpdate = {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  radiusKm?: number;
};

type SkyCeilData = {
  aircraft: AircraftSnapshot[];
  calibration: CalibrationState | null;
  config: PublicConfig | null;
  status: SystemStatus | null;
  mode: DisplayMode;
  connected: boolean;
  error: string | null;
  setMode: (mode: DisplayMode) => Promise<void>;
  saveCalibration: (calibration: CalibrationState) => Promise<void>;
  solveCalibration: (request: CalibrationSolveRequest) => Promise<void>;
  refreshCurrentAircraft: () => Promise<void>;
  updateLocation: (location: LocationUpdate) => Promise<void>;
};

export function useSkyCeilData(): SkyCeilData {
  const [aircraft, setAircraft] = useState<AircraftSnapshot[]>([]);
  const [calibration, setCalibration] = useState<CalibrationState | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [mode, setLocalMode] = useState<DisplayMode>("immersive");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const fetchJson = useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const response = await fetch(`${apiOrigin}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...init?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return (await response.json()) as T;
    },
    [],
  );

  const refreshCurrentAircraft = useCallback(async () => {
    const nextAircraft = await fetchJson<AircraftSnapshot[]>(
      "/api/aircraft/current",
    );
    setAircraft(nextAircraft);
  }, [fetchJson]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [publicConfig, initialCalibration, currentAircraft] =
          await Promise.all([
            fetchJson<PublicConfig>("/api/config/public"),
            fetchJson<CalibrationState>("/api/calibration"),
            fetchJson<AircraftSnapshot[]>("/api/aircraft/current"),
          ]);

        if (cancelled) {
          return;
        }

        setConfig(publicConfig);
        setCalibration(initialCalibration);
        setAircraft(currentAircraft);
        setLocalMode(publicConfig.render.defaultMode);
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : String(loadError),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchJson]);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      apiOrigin || undefined,
      {
        path: socketPath,
        transports:
          socketTransports.length > 0
            ? socketTransports
            : ["websocket", "polling"],
      },
    );
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError(null);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      setConnected(false);
    });
    socket.on(socketEvents.aircraftSnapshot, setAircraft);
    socket.on(socketEvents.aircraftRemoved, (icaoIds) => {
      setAircraft((current) =>
        current.filter((item) => !icaoIds.includes(item.icao)),
      );
    });
    socket.on(socketEvents.calibrationUpdated, setCalibration);
    socket.on(socketEvents.systemStatus, (nextStatus) => {
      setStatus(nextStatus);
      setLocalMode(nextStatus.mode);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const intervalMs = config?.flightData.pollIntervalMs ?? 5000;
    const timer = window.setInterval(() => {
      if (!socketRef.current?.connected) {
        void refreshCurrentAircraft().catch((refreshError) => {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : String(refreshError),
          );
        });
      }
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [config?.flightData.pollIntervalMs, refreshCurrentAircraft]);

  const updateLocation = useCallback(
    async (location: LocationUpdate) => {
      const updatedConfig = await fetchJson<PublicConfig>("/api/location", {
        method: "PUT",
        body: JSON.stringify(location),
      });
      setConfig(updatedConfig);
      socketRef.current?.emit(socketEvents.settingsUpdate, updatedConfig);
      await refreshCurrentAircraft();
    },
    [fetchJson, refreshCurrentAircraft],
  );
  const setMode = useCallback(
    async (nextMode: DisplayMode) => {
      setLocalMode(nextMode);
      socketRef.current?.emit(socketEvents.modeSet, nextMode);
      const nextStatus = await fetchJson<SystemStatus | { mode: DisplayMode }>(
        "/api/display-mode",
        {
          method: "PUT",
          body: JSON.stringify({ mode: nextMode }),
        },
      );

      if ("aircraftCount" in nextStatus) {
        setStatus(nextStatus);
      }
    },
    [fetchJson],
  );

  const saveCalibration = useCallback(
    async (nextCalibration: CalibrationState) => {
      const saved = await fetchJson<CalibrationState>("/api/calibration", {
        method: "PUT",
        body: JSON.stringify({
          ...nextCalibration,
          updatedAt: new Date().toISOString(),
        }),
      });
      setCalibration(saved);
      socketRef.current?.emit(socketEvents.calibrationUpdate, saved);
    },
    [fetchJson],
  );

  const solveCalibration = useCallback(
    async (request: CalibrationSolveRequest) => {
      const solved = await fetchJson<CalibrationState>(
        "/api/calibration/solve",
        {
          method: "POST",
          body: JSON.stringify(request),
        },
      );
      setCalibration(solved);
    },
    [fetchJson],
  );

  return useMemo(
    () => ({
      aircraft,
      calibration,
      config,
      status,
      mode,
      connected,
      error,
      setMode,
      saveCalibration,
      solveCalibration,
      refreshCurrentAircraft,
      updateLocation,
    }),
    [
      aircraft,
      calibration,
      config,
      status,
      mode,
      connected,
      error,
      setMode,
      saveCalibration,
      solveCalibration,
      refreshCurrentAircraft,
      updateLocation,
    ],
  );
}
