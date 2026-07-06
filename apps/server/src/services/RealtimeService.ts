import {
  calibrationStateSchema,
  displayModeSchema,
  socketEvents,
  type CalibrationState,
  type ClientToServerEvents,
  type DisplayMode,
  type ServerToClientEvents,
  type SystemStatus,
} from "@skyceil/shared";
import type { Server } from "socket.io";
import type { AirspaceService } from "./AirspaceService.js";
import type { CalibrationService } from "./CalibrationService.js";

export class RealtimeService {
  private timer: NodeJS.Timeout | undefined;
  private lastFetchAt: string | undefined;
  private lastError: string | undefined;
  private mode: DisplayMode;

  constructor(
    private readonly io: Server<ClientToServerEvents, ServerToClientEvents>,
    private readonly airspace: AirspaceService,
    private readonly pollIntervalMs: number,
    defaultMode: DisplayMode,
  ) {
    this.mode = defaultMode;
  }

  registerSocketHandlers(calibration: CalibrationService): void {
    this.io.on("connection", (socket) => {
      socket.emit(socketEvents.aircraftSnapshot, this.airspace.getCurrent());
      socket.emit(socketEvents.systemStatus, this.getStatus());
      socket.emit(socketEvents.calibrationUpdated, calibration.get());

      socket.on(socketEvents.modeSet, (mode) => {
        const parsedMode = displayModeSchema.safeParse(mode);
        if (parsedMode.success) {
          this.setMode(parsedMode.data);
        }
      });

      socket.on(socketEvents.calibrationUpdate, (nextCalibration) => {
        void (async () => {
          const parsed = calibrationStateSchema.safeParse(nextCalibration);
          if (!parsed.success) {
            return;
          }

          const updated = await calibration.update(parsed.data);
          this.emitCalibrationUpdated(updated);
        })();
      });
    });
  }

  start(): void {
    if (this.timer) {
      return;
    }

    void this.pollOnce();
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  setMode(mode: DisplayMode): SystemStatus {
    this.mode = mode;
    const status = this.getStatus();
    this.io.emit(socketEvents.systemStatus, status);

    return status;
  }

  getMode(): DisplayMode {
    return this.mode;
  }

  emitCalibrationUpdated(calibration: CalibrationState): void {
    this.io.emit(socketEvents.calibrationUpdated, calibration);
  }

  getStatus(): SystemStatus {
    const status: SystemStatus = {
      provider: this.airspace.source,
      connectedClients: this.io.engine.clientsCount,
      aircraftCount: this.airspace.getCurrent().length,
      mode: this.mode,
    };

    if (this.lastFetchAt) {
      status.lastFetchAt = this.lastFetchAt;
    }
    if (this.lastError) {
      status.lastError = this.lastError;
    }

    return status;
  }

  async pollOnce(): Promise<void> {
    try {
      const result = await this.airspace.refresh();
      this.lastFetchAt = new Date().toISOString();
      this.lastError = undefined;
      this.io.emit(socketEvents.aircraftSnapshot, result.aircraft);
      if (result.removed.length > 0) {
        this.io.emit(socketEvents.aircraftRemoved, result.removed);
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    }

    this.io.emit(socketEvents.systemStatus, this.getStatus());
  }
}
