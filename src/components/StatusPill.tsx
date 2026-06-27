import { ChevronDown, ChevronUp, Navigation, RotateCw, Route } from "lucide-react";
import { useState } from "react";
import { formatBearing, formatDistance, formatMapRotation, formatRelativeBearing } from "../lib/format";

type StatusPillProps = {
  bearing: number;
  distanceKm: number;
  mapBearing: number;
  relativeBearing: number;
  locationLabel: string;
};

export function StatusPill({
  bearing,
  distanceKm,
  mapBearing,
  relativeBearing,
  locationLabel
}: StatusPillProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={`status-pill ${expanded ? "is-expanded" : "is-compact"}`} aria-label="Qibla status">
      <button className="status-summary" type="button" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded}>
        <span className="status-location">
          <Navigation aria-hidden="true" size={15} />
          <span>{locationLabel}</span>
        </span>
        <strong>{formatBearing(bearing)}</strong>
        {expanded ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
      </button>
      <div className="status-grid" hidden={!expanded}>
        <span>
          <strong>Qibla bearing</strong>
          {formatBearing(bearing)}
        </span>
        <span>
          <strong>Distance</strong>
          <Route aria-hidden="true" size={14} />
          {formatDistance(distanceKm)}
        </span>
        <span>
          <strong>Map rotation</strong>
          <RotateCw aria-hidden="true" size={14} />
          {formatMapRotation(mapBearing)}
        </span>
        <span>
          <strong>Screen top</strong>
          {formatRelativeBearing(relativeBearing)}
        </span>
      </div>
    </section>
  );
}
