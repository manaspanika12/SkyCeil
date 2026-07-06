import { SkyCeilRenderer } from "@skyceil/renderer-core";
import type { AircraftSnapshot } from "@skyceil/shared";
import { Crosshair, MapPin, RefreshCw, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AircraftHud } from "./components/AircraftHud";
import { CalibrationPanel } from "./components/CalibrationPanel";
import { LocationPanel } from "./components/LocationPanel";
import { ModeSwitcher } from "./components/ModeSwitcher";
import { StatusBar } from "./components/StatusBar";
import { useSkyCeilData } from "./hooks/useSkyCeilData";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SkyCeilRenderer | null>(null);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [hoverIcao, setHoverIcao] = useState<string | null>(null);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const {
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
  } = useSkyCeilData();

  useEffect(() => {
    if (!canvasRef.current || !config || !calibration || rendererRef.current) {
      return;
    }

    const renderer = new SkyCeilRenderer({
      canvas: canvasRef.current,
      observer: config.userLocation,
      calibration,
      mode,
      minElevationDegrees: config.render.minElevationDegrees,
      maxTrailSeconds: config.render.maxTrailSeconds,
      maxAircraft: config.render.maxAircraft,
    });
    rendererRef.current = renderer;
    let frameId = 0;
    const animate = (time: number) => {
      renderer.render(time);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [calibration, config, mode]);

  useEffect(() => {
    rendererRef.current?.setAircraft(aircraft);
  }, [aircraft]);

  useEffect(() => {
    rendererRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    if (calibration) {
      rendererRef.current?.setCalibration(calibration);
    }
  }, [calibration]);

  useEffect(() => {
    if (config) {
      rendererRef.current?.setObserver(config.userLocation);
    }
  }, [config]);

  const selectedAircraft = useMemo(() => {
    const activeIcao = hoverIcao ?? selectedIcao;
    return aircraft.find((item) => item.icao === activeIcao) ?? null;
  }, [aircraft, hoverIcao, selectedIcao]);

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const icao =
      rendererRef.current?.pick(event.clientX, event.clientY) ?? null;
    setHoverIcao(icao);
  };

  const onCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const icao =
      rendererRef.current?.pick(event.clientX, event.clientY) ?? null;
    setSelectedIcao(icao);
  };

  return (
    <main className="skyceil-shell">
      <canvas
        ref={canvasRef}
        className="projection-canvas"
        onClick={onCanvasClick}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverIcao(null)}
      />

      <div className="top-left controls-cluster">
        <div className="brand-lockup">
          <Crosshair size={18} />
          <span>SKYCEIL</span>
        </div>
        <ModeSwitcher
          mode={mode}
          onModeChange={(nextMode) => void setMode(nextMode)}
        />
      </div>

      <div className="top-right controls-cluster align-right">
        <StatusBar connected={connected} status={status} error={error} />
        <div className="inline-actions">
          <button
            className="icon-button"
            type="button"
            title="Refresh aircraft"
            aria-label="Refresh aircraft"
            onClick={() => void refreshCurrentAircraft()}
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Location"
            aria-label="Location"
            aria-pressed={locationOpen}
            onClick={() => setLocationOpen((current) => !current)}
          >
            <MapPin size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Calibration"
            aria-label="Calibration"
            aria-pressed={calibrationOpen}
            onClick={() => setCalibrationOpen((current) => !current)}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <AircraftHud aircraft={selectedAircraft as AircraftSnapshot | null} />

      <LocationPanel
        open={locationOpen}
        config={config}
        onClose={() => setLocationOpen(false)}
        onSave={updateLocation}
      />

      <CalibrationPanel
        open={calibrationOpen}
        calibration={calibration}
        onClose={() => setCalibrationOpen(false)}
        onSave={saveCalibration}
        onSolve={solveCalibration}
      />

      {!config ? (
        <div className="boot-panel">
          <span className="scanner-line" />
          <strong>SKYCEIL BOOT</strong>
          <small>{error ?? "SYNCING LOCAL AIRSPACE"}</small>
        </div>
      ) : null}
    </main>
  );
}
