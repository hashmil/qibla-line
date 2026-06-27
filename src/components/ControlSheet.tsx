import { ChevronDown, ChevronUp, LocateFixed, Rotate3D, RotateCcw, RotateCw, Route } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppLocation, CompassReading, CompassStatus } from "../types";
import { CitySearch } from "./CitySearch";
import { CompassToggle } from "./CompassToggle";

type ControlSheetProps = {
  onRotate: (degrees: number) => void;
  onNorthUp: () => void;
  onQiblaUp: () => void;
  onRecentre: () => void;
  onSelectLocation: (location: AppLocation) => void;
  onUseLocation: () => void;
  isLocating: boolean;
  message?: string;
  compassStatus: CompassStatus;
  compassReading: CompassReading | null;
  onToggleCompass: () => void;
  compactPreferred?: boolean;
};

export function ControlSheet({
  onRotate,
  onNorthUp,
  onQiblaUp,
  onRecentre,
  onSelectLocation,
  onUseLocation,
  isLocating,
  message,
  compassStatus,
  compassReading,
  onToggleCompass,
  compactPreferred = false
}: ControlSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [rotationExpanded, setRotationExpanded] = useState(false);

  useEffect(() => {
    if (compactPreferred) {
      setExpanded(false);
      setRotationExpanded(false);
    }
  }, [compactPreferred]);

  return (
    <section className={`control-sheet ${expanded ? "is-expanded" : "is-compact"}`} aria-label="Map alignment controls">
      <button
        className="sheet-handle"
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown aria-hidden="true" size={18} /> : <ChevronUp aria-hidden="true" size={18} />}
        <span>{expanded ? "Hide details" : "Map controls"}</span>
      </button>

      <p className="instruction-line">Align roads or walls, then read the gold line.</p>

      <div className="command-row">
        <button
          type="button"
          className={rotationExpanded ? "is-active" : ""}
          onClick={() => setRotationExpanded((open) => !open)}
          aria-expanded={rotationExpanded}
        >
          <Rotate3D aria-hidden="true" size={18} />
          Rotation
        </button>
        <button type="button" onClick={onNorthUp}>
          <RotateCcw aria-hidden="true" size={18} />
          North
        </button>
        <button type="button" className="gold-command" onClick={onQiblaUp}>
          <Route aria-hidden="true" size={18} />
          Qibla
        </button>
        <button type="button" onClick={onRecentre}>
          <LocateFixed aria-hidden="true" size={18} />
          Centre
        </button>
      </div>

      {rotationExpanded ? (
        <div className="rotation-grid" aria-label="Rotation controls">
          <button type="button" onClick={() => onRotate(-5)} aria-label="Rotate left five degrees">
            <RotateCcw aria-hidden="true" size={18} />
            5°
          </button>
          <button type="button" onClick={() => onRotate(-1)} aria-label="Rotate left one degree">
            <RotateCcw aria-hidden="true" size={18} />
            1°
          </button>
          <button type="button" onClick={() => onRotate(1)} aria-label="Rotate right one degree">
            <RotateCw aria-hidden="true" size={18} />
            1°
          </button>
          <button type="button" onClick={() => onRotate(5)} aria-label="Rotate right five degrees">
            <RotateCw aria-hidden="true" size={18} />
            5°
          </button>
        </div>
      ) : null}

      <CompassToggle status={compassStatus} reading={compassReading} onToggle={onToggleCompass} />

      {expanded ? (
        <div className="expanded-controls">
          <button className="secondary-location" type="button" onClick={onUseLocation} disabled={isLocating}>
            <LocateFixed aria-hidden="true" size={18} />
            {isLocating ? "Finding location" : "Use my location"}
          </button>
          {message ? <p className="status-message">{message}</p> : null}
          <CitySearch onSelect={onSelectLocation} />
          <p className="privacy-note">
            Your location is used only on this device to calculate the Qibla line. It is not stored by this app.
          </p>
        </div>
      ) : null}
    </section>
  );
}
