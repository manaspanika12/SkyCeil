import { applyHomography, IDENTITY_HOMOGRAPHY } from "@skyceil/geo";
import type {
  CalibrationPoint,
  CalibrationSolveRequest,
  CalibrationState,
} from "@skyceil/shared";
import { Calculator, RotateCcw, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const sourceCorners = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
] as [CalibrationPoint, CalibrationPoint, CalibrationPoint, CalibrationPoint];

const cornerLabels = ["NW", "NE", "SE", "SW"];

type CornerTuple = [
  CalibrationPoint,
  CalibrationPoint,
  CalibrationPoint,
  CalibrationPoint,
];

export function CalibrationPanel({
  open,
  calibration,
  onClose,
  onSave,
  onSolve,
}: {
  open: boolean;
  calibration: CalibrationState | null;
  onClose: () => void;
  onSave: (calibration: CalibrationState) => Promise<void>;
  onSolve: (request: CalibrationSolveRequest) => Promise<void>;
}) {
  const [working, setWorking] = useState<CalibrationState | null>(calibration);
  const [targetCorners, setTargetCorners] =
    useState<CornerTuple>(sourceCorners);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWorking(calibration);
    if (calibration) {
      setTargetCorners(
        sourceCorners.map((point) =>
          applyHomography(point, calibration.homography),
        ) as CornerTuple,
      );
    }
  }, [calibration]);

  const markers = useMemo(() => targetCorners, [targetCorners]);

  if (!open || !working) {
    return null;
  }

  const updateNumber = (
    key:
      | "roomWidthMeters"
      | "roomLengthMeters"
      | "projectorWidthPixels"
      | "projectorHeightPixels"
      | "northOffsetDegrees",
    value: number,
  ) => {
    setWorking((current) =>
      current
        ? { ...current, [key]: value, updatedAt: new Date().toISOString() }
        : current,
    );
  };

  const updateCorner = (
    index: number,
    key: keyof CalibrationPoint,
    value: number,
  ) => {
    setTargetCorners((current) => {
      const next = current.map((point) => ({ ...point })) as CornerTuple;
      const point = next[index]!;
      next[index] =
        key === "x" ? { x: value, y: point.y } : { x: point.x, y: value };
      return next;
    });
  };

  const solve = async () => {
    setSaving(true);
    try {
      await onSolve({
        sourcePoints: sourceCorners,
        targetPoints: targetCorners,
      });
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ ...working, updatedAt: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const resetCalibration = {
      ...working,
      homography: IDENTITY_HOMOGRAPHY,
      updatedAt: new Date().toISOString(),
    };
    setTargetCorners(sourceCorners);
    setWorking(resetCalibration);
    await onSave(resetCalibration);
  };

  return (
    <>
      <div className="calibration-markers" aria-hidden="true">
        {markers.map((point, index) => (
          <span
            key={cornerLabels[index]}
            className="corner-marker"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
          >
            {cornerLabels[index]}
          </span>
        ))}
      </div>
      <aside className="calibration-panel">
        <header className="panel-header">
          <span>CALIBRATION</span>
          <button
            className="icon-button"
            type="button"
            title="Close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="calibration-fields">
          <label>
            <span>Room W</span>
            <input
              type="number"
              step="0.1"
              value={working.roomWidthMeters}
              onChange={(event) =>
                updateNumber("roomWidthMeters", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>Room L</span>
            <input
              type="number"
              step="0.1"
              value={working.roomLengthMeters}
              onChange={(event) =>
                updateNumber("roomLengthMeters", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>Proj W</span>
            <input
              type="number"
              step="1"
              value={working.projectorWidthPixels}
              onChange={(event) =>
                updateNumber("projectorWidthPixels", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>Proj H</span>
            <input
              type="number"
              step="1"
              value={working.projectorHeightPixels}
              onChange={(event) =>
                updateNumber(
                  "projectorHeightPixels",
                  Number(event.target.value),
                )
              }
            />
          </label>
          <label className="wide-field">
            <span>North</span>
            <input
              type="number"
              step="1"
              value={working.northOffsetDegrees}
              onChange={(event) =>
                updateNumber("northOffsetDegrees", Number(event.target.value))
              }
            />
          </label>
        </div>

        <div className="corner-editor">
          {targetCorners.map((point, index) => (
            <div className="corner-row" key={cornerLabels[index]}>
              <strong>{cornerLabels[index]}</strong>
              <input
                aria-label={`${cornerLabels[index]} x`}
                type="number"
                min="-0.5"
                max="1.5"
                step="0.001"
                value={point.x}
                onChange={(event) =>
                  updateCorner(index, "x", Number(event.target.value))
                }
              />
              <input
                aria-label={`${cornerLabels[index]} y`}
                type="number"
                min="-0.5"
                max="1.5"
                step="0.001"
                value={point.y}
                onChange={(event) =>
                  updateCorner(index, "y", Number(event.target.value))
                }
              />
            </div>
          ))}
        </div>

        <footer className="panel-actions">
          <button
            className="icon-button"
            type="button"
            title="Solve transform"
            aria-label="Solve transform"
            disabled={saving}
            onClick={solve}
          >
            <Calculator size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Save calibration"
            aria-label="Save calibration"
            disabled={saving}
            onClick={save}
          >
            <Save size={18} />
          </button>
          <button
            className="icon-button danger"
            type="button"
            title="Reset calibration"
            aria-label="Reset calibration"
            disabled={saving}
            onClick={reset}
          >
            <RotateCcw size={18} />
          </button>
        </footer>
      </aside>
    </>
  );
}
