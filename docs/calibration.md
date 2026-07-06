# Calibration

SkyCeil stores projector calibration in `data/calibration.json`. The file is local-only and ignored by Git.

## Flow

1. Start the app and open the calibration control with the settings icon.
2. Project the four corner markers onto the ceiling.
3. Adjust the NW, NE, SE, and SW normalized target coordinates until the markers land on the real ceiling corners or chosen projection bounds.
4. Use the solve button to compute the homography matrix.
5. Save the calibration.

## Coordinate model

- Source corners are normalized ceiling coordinates: `(0,0)`, `(1,0)`, `(1,1)`, `(0,1)`.
- Target corners are normalized projector coordinates.
- The backend solves a 3x3 homography matrix and persists it atomically.
- Aircraft are first mapped from azimuth/elevation to normalized ceiling coordinates, then transformed through the homography.

## North alignment

Set `northOffsetDegrees` to rotate the rendered sky so real north matches the room/projector orientation.
