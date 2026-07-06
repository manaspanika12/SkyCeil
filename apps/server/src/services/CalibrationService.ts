import { IDENTITY_HOMOGRAPHY, solveHomography } from "@skyceil/geo";
import {
  calibrationSolveRequestSchema,
  calibrationStateSchema,
  type AppConfig,
  type CalibrationSolveRequest,
  type CalibrationState,
} from "@skyceil/shared";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export class CalibrationService {
  private calibration: CalibrationState;

  constructor(
    private readonly dataDirectory: string,
    private readonly config: AppConfig,
  ) {
    this.calibration = this.createDefaultCalibration();
  }

  async load(): Promise<CalibrationState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.calibration = calibrationStateSchema.parse(JSON.parse(raw));
    } catch {
      this.calibration = this.createDefaultCalibration();
      await this.persist();
    }

    return this.calibration;
  }

  get(): CalibrationState {
    return this.calibration;
  }

  async update(nextCalibration: CalibrationState): Promise<CalibrationState> {
    this.calibration = calibrationStateSchema.parse(nextCalibration);
    await this.persist();

    return this.calibration;
  }

  async solve(request: CalibrationSolveRequest): Promise<CalibrationState> {
    const parsed = calibrationSolveRequestSchema.parse(request);
    const homography = solveHomography(
      parsed.sourcePoints,
      parsed.targetPoints,
    );

    return this.update({
      ...this.calibration,
      homography,
      updatedAt: new Date().toISOString(),
    });
  }

  private get filePath(): string {
    return path.join(this.dataDirectory, "calibration.json");
  }

  private createDefaultCalibration(): CalibrationState {
    return {
      roomWidthMeters: this.config.room.widthMeters,
      roomLengthMeters: this.config.room.lengthMeters,
      projectorWidthPixels: this.config.projector.widthPixels,
      projectorHeightPixels: this.config.projector.heightPixels,
      northOffsetDegrees: this.config.room.northOffsetDegrees,
      homography: IDENTITY_HOMOGRAPHY,
      updatedAt: new Date().toISOString(),
    };
  }

  private async persist(): Promise<void> {
    await mkdir(this.dataDirectory, { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(
      tempPath,
      `${JSON.stringify(this.calibration, null, 2)}\n`,
      "utf8",
    );

    try {
      await rename(tempPath, this.filePath);
    } catch (error) {
      if (!isRecoverableRenameError(error)) {
        throw error;
      }

      await copyFile(tempPath, this.filePath);
      await rm(tempPath, { force: true }).catch(() => undefined);
    }
  }
}

function isRecoverableRenameError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "EPERM"
  );
}
