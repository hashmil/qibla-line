import { Compass, Power } from "lucide-react";
import type { CompassReading, CompassStatus } from "../types";

type CompassToggleProps = {
  status: CompassStatus;
  reading: CompassReading | null;
  onToggle: () => void;
};

export function CompassToggle({ status, reading, onToggle }: CompassToggleProps) {
  const statusText =
    status === "active"
      ? reading
        ? `Following ${reading.heading.toFixed(0)}°`
        : "Waiting for heading"
      : status === "requesting"
        ? "Requesting compass"
        : status === "denied"
          ? "Compass access denied"
          : status === "unsupported"
            ? "Compass unavailable"
            : status === "error"
              ? "Compass error"
              : "Compass off";

  return (
    <section className="compass-panel" aria-label="Optional compass mode">
      <div className="compass-row">
        <button
          type="button"
          className={`compass-button ${status === "active" ? "is-active" : ""}`}
          onClick={onToggle}
          aria-pressed={status === "active"}
        >
          {status === "active" ? <Power aria-hidden="true" size={18} /> : <Compass aria-hidden="true" size={18} />}
          Compass mode
        </button>
        <span>{statusText}</span>
      </div>

      <p className="warning-note">Compass readings can drift indoors. Use map alignment for final confirmation.</p>
    </section>
  );
}
