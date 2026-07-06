import type { SystemStatus } from "@skyceil/shared";
import { RadioTower, Satellite, Wifi, WifiOff } from "lucide-react";

export function StatusBar({
  connected,
  status,
  error,
}: {
  connected: boolean;
  status: SystemStatus | null;
  error: string | null;
}) {
  return (
    <div className="status-strip" aria-live="polite">
      <span className={connected ? "status-dot live" : "status-dot offline"} />
      {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
      <span>{connected ? "LIVE" : "OFFLINE"}</span>
      <span className="divider" />
      <RadioTower size={15} />
      <span>{status?.provider.toUpperCase() ?? "SYNC"}</span>
      <span className="divider" />
      <Satellite size={15} />
      <span>{status?.aircraftCount ?? 0}</span>
      {status?.lastFetchAt ? (
        <span>{new Date(status.lastFetchAt).toLocaleTimeString()}</span>
      ) : null}
      {error || status?.lastError ? (
        <span className="status-error">{error ?? status?.lastError}</span>
      ) : null}
    </div>
  );
}
