import type { PublicConfig } from "@skyceil/shared";
import { LocateFixed, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { LocationUpdate } from "../hooks/useSkyCeilData";

export function LocationPanel({
  open,
  config,
  onClose,
  onSave,
}: {
  open: boolean;
  config: PublicConfig | null;
  onClose: () => void;
  onSave: (location: LocationUpdate) => Promise<void>;
}) {
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [altitudeMeters, setAltitudeMeters] = useState(0);
  const [radiusKm, setRadiusKm] = useState(200);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) {
      return;
    }

    setLatitude(config.userLocation.latitude);
    setLongitude(config.userLocation.longitude);
    setAltitudeMeters(config.userLocation.altitudeMeters);
    setRadiusKm(config.flightData.radiusKm);
  }, [config]);

  if (!open || !config) {
    return null;
  }

  const save = async (location: LocationUpdate) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(location);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setSaving(false);
    }
  };

  const useBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError("Browser location is unavailable");
      return;
    }

    setSaving(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitudeMeters: position.coords.altitude ?? altitudeMeters,
          radiusKm,
        };
        setLatitude(nextLocation.latitude);
        setLongitude(nextLocation.longitude);
        setAltitudeMeters(nextLocation.altitudeMeters);
        void save(nextLocation);
      },
      (geoError) => {
        setError(geoError.message);
        setSaving(false);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  };

  return (
    <aside className="location-panel">
      <header className="panel-header">
        <span>LOCATION</span>
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

      <div className="location-fields">
        <label>
          <span>Lat</span>
          <input
            type="number"
            step="0.0001"
            value={latitude}
            onChange={(event) => setLatitude(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Lon</span>
          <input
            type="number"
            step="0.0001"
            value={longitude}
            onChange={(event) => setLongitude(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Alt m</span>
          <input
            type="number"
            step="1"
            value={altitudeMeters}
            onChange={(event) => setAltitudeMeters(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Radius</span>
          <input
            type="number"
            min="1"
            max="800"
            step="1"
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
          />
        </label>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}

      <footer className="panel-actions">
        <button
          className="icon-button"
          type="button"
          title="Use browser location"
          aria-label="Use browser location"
          disabled={saving}
          onClick={useBrowserLocation}
        >
          <LocateFixed size={18} />
        </button>
        <button
          className="icon-button"
          type="button"
          title="Save location"
          aria-label="Save location"
          disabled={saving}
          onClick={() =>
            void save({ latitude, longitude, altitudeMeters, radiusKm })
          }
        >
          <Save size={18} />
        </button>
      </footer>
    </aside>
  );
}
