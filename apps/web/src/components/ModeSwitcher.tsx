import type { DisplayMode } from "@skyceil/shared";
import { Clapperboard, Orbit, Radar } from "lucide-react";

const modeIcons = {
  radar: Radar,
  cinematic: Clapperboard,
  immersive: Orbit,
} satisfies Record<DisplayMode, typeof Radar>;

const modeLabels: Record<DisplayMode, string> = {
  radar: "Radar Mode",
  cinematic: "Cinematic Mode",
  immersive: "Immersive Mode",
};

export function ModeSwitcher({
  mode,
  onModeChange,
}: {
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}) {
  return (
    <div className="mode-switcher" role="toolbar" aria-label="Display modes">
      {(["radar", "cinematic", "immersive"] as DisplayMode[]).map((item) => {
        const Icon = modeIcons[item];
        return (
          <button
            key={item}
            className="icon-button"
            aria-label={modeLabels[item]}
            aria-pressed={mode === item}
            title={modeLabels[item]}
            type="button"
            onClick={() => onModeChange(item)}
          >
            <Icon size={19} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
