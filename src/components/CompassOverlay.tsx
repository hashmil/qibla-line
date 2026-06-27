import { Compass, Power } from "lucide-react";
import type { CompassReading, CompassStatus } from "../types";
import { formatTurnInstruction } from "../lib/format";
import { normalise180, normalise360 } from "../lib/qibla";

type CompassOverlayProps = {
  status: CompassStatus;
  reading: CompassReading | null;
  qiblaBearing: number;
  onToggle: () => void;
};

export function CompassOverlay({ status, reading, qiblaBearing, onToggle }: CompassOverlayProps) {
  if (status !== "active" && status !== "requesting") return null;

  const heading = reading?.heading ?? 0;
  const qiblaAngle = reading ? normalise180(qiblaBearing - heading) : 0;
  const northAngle = reading ? normalise360(-heading) : 0;
  const instruction = reading
    ? formatTurnInstruction(qiblaAngle)
    : "Move the phone gently to start heading readings.";

  return (
    <section className="compass-overlay" aria-label="Compass mode">
      <div className="compass-overlay-header">
        <span>
          <Compass aria-hidden="true" size={15} />
          Compass mode
        </span>
        <button type="button" onClick={onToggle} aria-label="Switch off compass mode">
          <Power aria-hidden="true" size={16} />
        </button>
      </div>

      <div className="compass-dial" aria-hidden="true">
        <span className="north-needle" style={{ transform: `rotate(${northAngle}deg)` }} />
        <span className="qibla-needle" style={{ transform: `rotate(${qiblaAngle}deg)` }} />
        <span className="dial-centre" />
        <span className="north-label" style={{ transform: `rotate(${northAngle}deg) translateY(-76px)` }}>
          N
        </span>
        <span className="qibla-label" style={{ transform: `rotate(${qiblaAngle}deg) translateY(-90px)` }}>
          Qibla
        </span>
      </div>

      <p>{instruction}</p>
      {reading?.accuracy !== undefined ? <small>Accuracy {reading.accuracy.toFixed(0)}°</small> : null}
    </section>
  );
}
