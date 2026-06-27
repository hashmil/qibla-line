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
          Compass
        </span>
        <button type="button" onClick={onToggle} aria-label="Switch off compass mode">
          <Power aria-hidden="true" size={16} />
        </button>
      </div>

      <div className="compass-telemetry" aria-label="Compass readings">
        <span>
          <small>Heading</small>
          <strong>{heading === undefined ? "--" : `${heading.toFixed(0)}°`}</strong>
        </span>
        <span>
          <small>Map</small>
          <strong>{mapBearing.toFixed(0)}°</strong>
        </span>
      </div>

      <div className="compass-map-follow">
        <span>Map follows phone</span>
      </div>
      <div className="qibla-cue" role="status">
        <span className="kaaba-symbol" aria-hidden="true" />
        <p>{instruction}</p>
      </div>
      {reading ? (
        <small className="compass-source">
          {reading.source === "webkit" ? "iPhone compass" : `${reading.source} heading`}
          {reading.accuracy !== undefined ? ` · accuracy ${reading.accuracy.toFixed(0)}°` : ""}
        </small>
      ) : (
        <small className="compass-source">Waiting for heading</small>
      )}
    </section>
  );
}
