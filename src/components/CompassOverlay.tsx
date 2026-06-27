import { Compass, Power } from "lucide-react";
import type { CompassReading, CompassStatus } from "../types";
import { formatTurnInstruction } from "../lib/format";
import { normalise180 } from "../lib/qibla";

type CompassOverlayProps = {
  status: CompassStatus;
  reading: CompassReading | null;
  qiblaBearing: number;
  mapBearing: number;
  relativeBearing: number;
  onToggle: () => void;
};

export function CompassOverlay({
  status,
  reading,
  qiblaBearing,
  mapBearing,
  relativeBearing,
  onToggle
}: CompassOverlayProps) {
  if (status !== "active" && status !== "requesting") return null;

  const heading = reading?.heading;
  const qiblaAngle = reading ? normalise180(qiblaBearing - reading.heading) : relativeBearing;
  const instruction = reading
    ? formatTurnInstruction(qiblaAngle)
    : "Move the phone gently to start heading readings.";

  return (
    <section className="compass-overlay" aria-label="Compass mode">
      <div className="compass-overlay-header">
        <span>
          <Compass aria-hidden="true" size={15} />
          Map follows phone
        </span>
        <button type="button" onClick={onToggle} aria-label="Switch off compass mode">
          <Power aria-hidden="true" size={16} />
        </button>
      </div>

      <div className="heading-indicator" aria-hidden="true">
        <span style={{ transform: `rotate(${heading ?? 0}deg)` }} />
      </div>
      <strong>{heading === undefined ? "Waiting for heading" : `${heading.toFixed(0)}° heading`}</strong>
      <div className="compass-map-follow">
        <span>Map rotation</span>
        <b>{mapBearing.toFixed(0)}°</b>
      </div>
      <div className="qibla-cue" role="status">
        <span className="kaaba-symbol" aria-hidden="true" />
        <p>{instruction}</p>
      </div>
      {reading ? (
        <small>
          {reading.source === "webkit" ? "iPhone compass" : `${reading.source} heading`}
          {reading.accuracy !== undefined ? ` · accuracy ${reading.accuracy.toFixed(0)}°` : ""}
        </small>
      ) : (
        <small>Waiting for device orientation events</small>
      )}
    </section>
  );
}
