import type { CalibrationPoint, HomographyMatrix } from "@skyceil/shared";
import { clamp, normalizeDegrees, toRadians } from "./geo.js";

export type NormalizedPoint = {
  x: number;
  y: number;
};

export type SkyToCeilingInput = {
  azimuthDegrees: number;
  elevationDegrees: number;
  northOffsetDegrees?: number;
  minElevationDegrees?: number;
  maxElevationDegrees?: number;
  edgeCompression?: number;
};

export type SkyToCeilingResult = NormalizedPoint & {
  visible: boolean;
  opacity: number;
};

export const IDENTITY_HOMOGRAPHY: HomographyMatrix = [
  1, 0, 0, 0, 1, 0, 0, 0, 1,
];

export function mapSkyToCeiling(input: SkyToCeilingInput): SkyToCeilingResult {
  const minElevationDegrees = input.minElevationDegrees ?? 0;
  const maxElevationDegrees = input.maxElevationDegrees ?? 90;
  const elevationSpan = Math.max(1, maxElevationDegrees - minElevationDegrees);
  const normalizedElevation = clamp(
    (input.elevationDegrees - minElevationDegrees) / elevationSpan,
    0,
    1,
  );
  const edgeCompression = input.edgeCompression ?? 0.92;
  const radialDistance = (1 - normalizedElevation) * edgeCompression;
  const displayBearing = normalizeDegrees(
    input.azimuthDegrees - (input.northOffsetDegrees ?? 0),
  );
  const angle = toRadians(displayBearing);
  const x = 0.5 + Math.sin(angle) * radialDistance * 0.5;
  const y = 0.5 - Math.cos(angle) * radialDistance * 0.5;
  const visible =
    input.elevationDegrees >= minElevationDegrees &&
    input.elevationDegrees <= maxElevationDegrees + 5;

  return {
    x,
    y,
    visible,
    opacity: visible ? clamp(normalizedElevation * 0.75 + 0.25, 0, 1) : 0,
  };
}

export function applyHomography(
  point: NormalizedPoint,
  matrix: HomographyMatrix,
): NormalizedPoint {
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = matrix;
  const denominator = h31 * point.x + h32 * point.y + h33;

  if (Math.abs(denominator) < 1e-9) {
    return point;
  }

  return {
    x: (h11 * point.x + h12 * point.y + h13) / denominator,
    y: (h21 * point.x + h22 * point.y + h23) / denominator,
  };
}

export function solveHomography(
  sourcePoints: [
    CalibrationPoint,
    CalibrationPoint,
    CalibrationPoint,
    CalibrationPoint,
  ],
  targetPoints: [
    CalibrationPoint,
    CalibrationPoint,
    CalibrationPoint,
    CalibrationPoint,
  ],
): HomographyMatrix {
  const system: number[][] = [];

  for (let i = 0; i < 4; i += 1) {
    const source = sourcePoints[i]!;
    const target = targetPoints[i]!;
    system.push([
      source.x,
      source.y,
      1,
      0,
      0,
      0,
      -target.x * source.x,
      -target.x * source.y,
      target.x,
    ]);
    system.push([
      0,
      0,
      0,
      source.x,
      source.y,
      1,
      -target.y * source.x,
      -target.y * source.y,
      target.y,
    ]);
  }

  const solution = solveLinearSystem(system);

  return [
    solution[0]!,
    solution[1]!,
    solution[2]!,
    solution[3]!,
    solution[4]!,
    solution[5]!,
    solution[6]!,
    solution[7]!,
    1,
  ];
}

export function projectSkyToScreen(
  input: SkyToCeilingInput & { homography?: HomographyMatrix },
): SkyToCeilingResult {
  const ceilingPoint = mapSkyToCeiling(input);
  const screenPoint = applyHomography(
    ceilingPoint,
    input.homography ?? IDENTITY_HOMOGRAPHY,
  );

  return {
    ...screenPoint,
    visible:
      ceilingPoint.visible &&
      screenPoint.x >= -0.1 &&
      screenPoint.x <= 1.1 &&
      screenPoint.y >= -0.1 &&
      screenPoint.y <= 1.1,
    opacity: ceilingPoint.opacity,
  };
}

function solveLinearSystem(augmentedMatrix: number[][]): number[] {
  const size = augmentedMatrix.length;
  const matrix = augmentedMatrix.map((row) => [...row]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let maxRow = pivotIndex;
    for (let row = pivotIndex + 1; row < size; row += 1) {
      if (
        Math.abs(matrix[row]![pivotIndex]!) >
        Math.abs(matrix[maxRow]![pivotIndex]!)
      ) {
        maxRow = row;
      }
    }

    if (Math.abs(matrix[maxRow]![pivotIndex]!) < 1e-12) {
      throw new Error(
        "Calibration points are degenerate; cannot solve homography.",
      );
    }

    const pivotRow = matrix[pivotIndex]!;
    matrix[pivotIndex] = matrix[maxRow]!;
    matrix[maxRow] = pivotRow;

    const pivot = matrix[pivotIndex]![pivotIndex]!;
    for (let column = pivotIndex; column <= size; column += 1) {
      matrix[pivotIndex]![column] = matrix[pivotIndex]![column]! / pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivotIndex) {
        continue;
      }

      const factor = matrix[row]![pivotIndex]!;
      for (let column = pivotIndex; column <= size; column += 1) {
        matrix[row]![column] =
          matrix[row]![column]! - factor * matrix[pivotIndex]![column]!;
      }
    }
  }

  return matrix.map((row) => row[size]!);
}
