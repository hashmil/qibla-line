import { Compass, Power } from "lucide-react";
import type { CompassReading, CompassStatus } from "../types";
import { formatTurnInstruction } from "../lib/format";
import { normalise180 } from "../lib/qibla";

type CompassOverlayProps = {
  status: CompassStatus;
  reading: CompassReading | null;
  qiblaBearing: number;
  relativeBearing: number;
  onToggle: () => void;
};

export function CompassOverlay({
  status,
  reading,
  qiblaBearing,
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

      <strong>{heading === undefined ? "Waiting for heading" : `${heading.toFixed(0)}° heading`}</strong>
      <p>{instruction}</p>
      {reading?.accuracy !== undefined ? <small>Accuracy {reading.accuracy.toFixed(0)}°</small> : null}
    </section>
  );
}
