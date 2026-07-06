import {
  IDENTITY_HOMOGRAPHY,
  projectSkyToScreen,
  toRadians,
  type SkyToCeilingResult,
} from "@skyceil/geo";
import type {
  AircraftSnapshot,
  CalibrationState,
  DisplayMode,
  ObserverLocation,
} from "@skyceil/shared";
import * as THREE from "three";
import { renderProfiles, type RenderProfile } from "./displayModes.js";
import { predictAircraftSnapshot } from "./motion.js";
import { ObjectPool } from "./objectPool.js";
import {
  markerFragmentShader,
  markerVertexShader,
  trailFragmentShader,
  trailVertexShader,
} from "./shaders.js";

type TrailPoint = {
  position: THREE.Vector3;
  timestamp: number;
};

type AircraftVisual = {
  group: THREE.Group;
  marker: THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  arrow: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>;
  trail: THREE.Line<THREE.BufferGeometry, THREE.ShaderMaterial>;
  trailPoints: TrailPoint[];
  hasPosition: boolean;
  icao?: string;
};

export type SkyCeilRendererOptions = {
  canvas: HTMLCanvasElement;
  observer: ObserverLocation;
  calibration: CalibrationState;
  mode: DisplayMode;
  minElevationDegrees: number;
  maxTrailSeconds: number;
  maxAircraft: number;
};

export class SkyCeilRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  private readonly aircraftGroup = new THREE.Group();
  private readonly gridGroup = new THREE.Group();
  private readonly starGroup = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly aircraft = new Map<string, AircraftSnapshot>();
  private readonly visuals = new Map<string, AircraftVisual>();
  private readonly visualPool: ObjectPool<AircraftVisual>;
  private width = 1;
  private height = 1;
  private aspect = 1;
  private mode: DisplayMode;
  private profile: RenderProfile;
  private observer: ObserverLocation;
  private calibration: CalibrationState;
  private minElevationDegrees: number;
  private maxTrailSeconds: number;
  private maxAircraft: number;

  constructor(options: SkyCeilRendererOptions) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x02060c, 1);

    this.observer = options.observer;
    this.calibration = options.calibration;
    this.mode = options.mode;
    this.profile = renderProfiles[options.mode];
    this.minElevationDegrees = options.minElevationDegrees;
    this.maxTrailSeconds = options.maxTrailSeconds;
    this.maxAircraft = options.maxAircraft;
    this.visualPool = new ObjectPool(
      () => this.createAircraftVisual(),
      (visual) => this.resetAircraftVisual(visual),
    );

    this.camera.position.z = 8;
    this.scene.add(this.starGroup);
    this.scene.add(this.gridGroup);
    this.scene.add(this.aircraftGroup);
    this.rebuildStars();
    this.rebuildGrid();
    this.resize();
  }

  setMode(mode: DisplayMode): void {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.profile = renderProfiles[mode];
    this.rebuildGrid();
    this.rebuildStars();
  }

  setObserver(observer: ObserverLocation): void {
    this.observer = observer;
  }

  setCalibration(calibration: CalibrationState): void {
    this.calibration = calibration;
  }

  setAircraft(snapshots: AircraftSnapshot[]): void {
    const selected = [...snapshots]
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, this.maxAircraft);
    const incoming = new Set(selected.map((snapshot) => snapshot.icao));

    for (const snapshot of selected) {
      this.aircraft.set(snapshot.icao, snapshot);
      if (!this.visuals.has(snapshot.icao)) {
        const visual = this.visualPool.acquire();
        visual.icao = snapshot.icao;
        visual.marker.userData.icao = snapshot.icao;
        visual.group.visible = true;
        this.aircraftGroup.add(visual.group);
        this.visuals.set(snapshot.icao, visual);
      }
    }

    for (const icao of [...this.aircraft.keys()]) {
      if (!incoming.has(icao)) {
        this.removeAircraft([icao]);
      }
    }
  }

  removeAircraft(icaoIds: string[]): void {
    for (const icao of icaoIds) {
      this.aircraft.delete(icao);
      const visual = this.visuals.get(icao);
      if (!visual) {
        continue;
      }

      this.aircraftGroup.remove(visual.group);
      this.visuals.delete(icao);
      this.visualPool.release(visual);
    }
  }

  render(nowMs = performance.now()): void {
    this.resize();
    for (const [icao, snapshot] of this.aircraft) {
      const visual = this.visuals.get(icao);
      if (!visual) {
        continue;
      }

      const predicted = predictAircraftSnapshot(
        snapshot,
        Date.now(),
        this.observer,
      );
      const projected = projectSkyToScreen({
        azimuthDegrees: predicted.azimuthDegrees,
        elevationDegrees: predicted.elevationDegrees,
        northOffsetDegrees: this.calibration.northOffsetDegrees,
        minElevationDegrees: this.minElevationDegrees,
        maxElevationDegrees: 90,
        homography: this.calibration.homography ?? IDENTITY_HOMOGRAPHY,
      });

      this.updateVisual(visual, predicted, projected, nowMs);
    }

    this.renderer.render(this.scene, this.camera);
  }

  pick(clientX: number, clientY: number): string | undefined {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const markers = [...this.visuals.values()]
      .filter((visual) => visual.group.visible)
      .map((visual) => visual.marker);
    const hits = this.raycaster.intersectObjects(markers, false);

    return hits[0]?.object.userData.icao as string | undefined;
  }

  dispose(): void {
    this.renderer.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      const material = mesh.material;
      if (Array.isArray(material)) {
        for (const item of material) {
          item.dispose();
        }
      } else if (material) {
        material.dispose();
      }
    });
  }

  private updateVisual(
    visual: AircraftVisual,
    aircraft: AircraftSnapshot,
    projected: SkyToCeilingResult,
    nowMs: number,
  ): void {
    if (!projected.visible) {
      visual.group.visible = false;
      return;
    }

    visual.group.visible = true;
    const target = this.normalizedToWorld(projected.x, projected.y);
    if (!visual.hasPosition) {
      visual.group.position.copy(target);
      visual.hasPosition = true;
    } else {
      visual.group.position.lerp(target, this.profile.lerpFactor);
    }

    const displayHeading =
      (((aircraft.headingDegrees - this.calibration.northOffsetDegrees) % 360) +
        360) %
      360;
    visual.arrow.rotation.z = -toRadians(displayHeading);

    const elevationScale = 0.72 + Math.max(0, aircraft.elevationDegrees) / 90;
    const scale = 0.042 * this.profile.markerScale * elevationScale;
    visual.marker.scale.setScalar(scale);
    visual.ring.scale.setScalar(scale * 1.9);
    visual.arrow.scale.setScalar(scale * 1.9);

    visual.marker.material.uniforms["uTime"]!.value = nowMs;
    visual.marker.material.uniforms["uOpacity"]!.value = projected.opacity;
    visual.trail.material.uniforms["uOpacity"]!.value =
      this.profile.trailOpacity * projected.opacity;

    this.updateTrail(visual, target, nowMs);
  }

  private updateTrail(
    visual: AircraftVisual,
    target: THREE.Vector3,
    nowMs: number,
  ): void {
    const lastPoint = visual.trailPoints.at(-1);
    if (
      !lastPoint ||
      lastPoint.position.distanceTo(target) > 0.015 ||
      nowMs - lastPoint.timestamp > 750
    ) {
      visual.trailPoints.push({
        position: target.clone(),
        timestamp: nowMs,
      });
    }

    const maxAgeMs =
      Math.min(this.maxTrailSeconds, this.profile.trailSeconds) * 1000;
    visual.trailPoints = visual.trailPoints.filter(
      (point) => nowMs - point.timestamp <= maxAgeMs,
    );

    const geometry = visual.trail.geometry;
    if (visual.trailPoints.length < 2) {
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([], 3),
      );
      geometry.setAttribute("aAlpha", new THREE.Float32BufferAttribute([], 1));
      return;
    }

    const controlPoints = visual.trailPoints.map((point) => point.position);
    const linePoints =
      controlPoints.length >= 3
        ? new THREE.CatmullRomCurve3(controlPoints).getPoints(
            Math.min(96, controlPoints.length * 8),
          )
        : controlPoints;
    const positions: number[] = [];
    const alphas: number[] = [];

    for (let index = 0; index < linePoints.length; index += 1) {
      const point = linePoints[index]!;
      positions.push(point.x, point.y, point.z - 0.03);
      alphas.push(index / Math.max(1, linePoints.length - 1));
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "aAlpha",
      new THREE.Float32BufferAttribute(alphas, 1),
    );
    geometry.computeBoundingSphere();
  }

  private normalizedToWorld(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3((x - 0.5) * 2 * this.aspect, (0.5 - y) * 2, 0);
  }

  private resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    if (width === this.width && height === this.height) {
      return;
    }

    this.width = width;
    this.height = height;
    this.aspect = width / Math.max(1, height);
    this.renderer.setSize(width, height, false);
    this.camera.left = -this.aspect;
    this.camera.right = this.aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();
    this.rebuildGrid();
  }

  private rebuildGrid(): void {
    this.gridGroup.clear();
    const material = new THREE.LineBasicMaterial({
      color: 0x28d7ff,
      transparent: true,
      opacity: this.profile.gridOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let ring = 1; ring <= this.profile.gridRings; ring += 1) {
      const radius = (ring / this.profile.gridRings) * 0.92;
      const curve = new THREE.EllipseCurve(
        0,
        0,
        radius * this.aspect,
        radius,
        0,
        Math.PI * 2,
      );
      const points = curve
        .getPoints(160)
        .map((point) => new THREE.Vector3(point.x, point.y, -0.08));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.gridGroup.add(new THREE.LineLoop(geometry, material));
    }

    for (let radial = 0; radial < this.profile.gridRadials; radial += 1) {
      const angle = (radial / this.profile.gridRadials) * Math.PI * 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -0.08),
        new THREE.Vector3(
          Math.sin(angle) * this.aspect * 0.92,
          Math.cos(angle) * 0.92,
          -0.08,
        ),
      ]);
      this.gridGroup.add(new THREE.Line(geometry, material));
    }
  }

  private rebuildStars(): void {
    this.starGroup.clear();
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let index = 0; index < this.profile.backgroundStarCount; index += 1) {
      positions.push(
        (Math.random() - 0.5) * 2.3 * this.aspect,
        (Math.random() - 0.5) * 2.1,
        -0.2,
      );
      color.setHSL(
        0.55 + Math.random() * 0.12,
        0.8,
        0.55 + Math.random() * 0.3,
      );
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.006,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.starGroup.add(new THREE.Points(geometry, material));
  }

  private createAircraftVisual(): AircraftVisual {
    const group = new THREE.Group();
    const marker = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0x45ecff) },
          uOpacity: { value: 1 },
          uPulse: { value: Math.random() * Math.PI * 2 },
          uTime: { value: 0 },
        },
        vertexShader: markerVertexShader,
        fragmentShader: markerFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.72, 56),
      new THREE.MeshBasicMaterial({
        color: 0x19b6ff,
        transparent: true,
        opacity: 0.56,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 1.0);
    arrowShape.lineTo(0.13, 0.26);
    arrowShape.lineTo(0.56, 0.05);
    arrowShape.lineTo(0.58, -0.1);
    arrowShape.lineTo(0.1, -0.02);
    arrowShape.lineTo(0.08, -0.54);
    arrowShape.lineTo(0.27, -0.76);
    arrowShape.lineTo(0, -0.66);
    arrowShape.lineTo(-0.27, -0.76);
    arrowShape.lineTo(-0.08, -0.54);
    arrowShape.lineTo(-0.1, -0.02);
    arrowShape.lineTo(-0.58, -0.1);
    arrowShape.lineTo(-0.56, 0.05);
    arrowShape.lineTo(-0.13, 0.26);
    arrowShape.lineTo(0, 1.0);
    const arrow = new THREE.Mesh(
      new THREE.ShapeGeometry(arrowShape),
      new THREE.MeshBasicMaterial({
        color: 0x8af6ff,
        transparent: true,
        opacity: 0.86,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    const trail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0x29d8ff) },
          uOpacity: { value: 0.72 },
        },
        vertexShader: trailVertexShader,
        fragmentShader: trailFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );

    group.add(trail);
    group.add(ring);
    group.add(arrow);
    group.add(marker);

    return {
      group,
      marker,
      ring,
      arrow,
      trail,
      trailPoints: [],
      hasPosition: false,
    };
  }

  private resetAircraftVisual(visual: AircraftVisual): void {
    delete visual.icao;
    visual.hasPosition = false;
    visual.trailPoints = [];
    visual.group.visible = false;
    visual.group.position.set(0, 0, 0);
    visual.marker.userData.icao = undefined;
    visual.trail.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([], 3),
    );
    visual.trail.geometry.setAttribute(
      "aAlpha",
      new THREE.Float32BufferAttribute([], 1),
    );
  }
}
