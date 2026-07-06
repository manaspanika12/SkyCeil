import type { AircraftSnapshot } from "@skyceil/shared";
import { Gauge, Navigation, Plane, Route, TrendingUp } from "lucide-react";

export function AircraftHud({
  aircraft,
}: {
  aircraft: AircraftSnapshot | null;
}) {
  if (!aircraft) {
    return (
      <aside className="aircraft-hud idle">
        <div className="hud-title">
          <Plane size={18} /> NO TARGET
        </div>
        <div className="hud-grid compact">
          <span>SCAN</span>
          <strong>ACTIVE</strong>
          <span>TRACKS</span>
          <strong>LIVE</strong>
        </div>
      </aside>
    );
  }

  const speedKnots = aircraft.speedMetersPerSecond * 1.94384;
  const verticalRateFpm = aircraft.verticalRateMetersPerSecond * 196.8504;

  return (
    <aside className="aircraft-hud">
      <div className="hud-title">
        <Plane size={18} />{" "}
        {aircraft.flightNumber ?? aircraft.icao.toUpperCase()}
      </div>
      <div className="hud-subtitle">
        {aircraft.airline ?? aircraft.source.toUpperCase()} -{" "}
        {aircraft.icao.toUpperCase()}
      </div>
      <div className="hud-grid">
        <span>
          <TrendingUp size={14} /> ALT
        </span>
        <strong>
          {Math.round(aircraft.altitudeMeters).toLocaleString()} m
        </strong>
        <span>
          <Gauge size={14} /> SPD
        </span>
        <strong>{Math.round(speedKnots)} kt</strong>
        <span>
          <Navigation size={14} /> HDG
        </span>
        <strong>{Math.round(aircraft.headingDegrees)} deg</strong>
        <span>AZ / EL</span>
        <strong>
          {Math.round(aircraft.azimuthDegrees)} /{" "}
          {aircraft.elevationDegrees.toFixed(1)}
        </strong>
        <span>DIST</span>
        <strong>{(aircraft.distanceMeters / 1000).toFixed(1)} km</strong>
        <span>V/S</span>
        <strong>{Math.round(verticalRateFpm)} fpm</strong>
      </div>
      <div className="route-line">
        <Route size={14} /> {aircraft.origin ?? "ORIGIN"} -&gt;{" "}
        {aircraft.destination ?? "DEST"}
      </div>
    </aside>
  );
}
