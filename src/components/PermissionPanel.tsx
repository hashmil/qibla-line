import { ChevronDown, ChevronUp, LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { CitySearch } from "./CitySearch";
import type { AppLocation } from "../types";

type PermissionPanelProps = {
  onUseLocation: () => void;
  onSelectCity: (location: AppLocation) => void;
  statusMessage?: string;
  isLocating: boolean;
};

export function PermissionPanel({
  onUseLocation,
  onSelectCity,
  statusMessage,
  isLocating
}: PermissionPanelProps) {
  const [cityOpen, setCityOpen] = useState(false);

  return (
    <section className="permission-panel" aria-label="Start Qibla Line">
      <div className="brand-mark" aria-hidden="true" />
      <p className="eyebrow">Qibla Line</p>
      <h1>Align the map. Read the line.</h1>
      <p>Rotate the map until roads or your building match real life. The gold line shows the Qibla.</p>

      <button className="primary-action" type="button" onClick={onUseLocation} disabled={isLocating}>
        <LocateFixed aria-hidden="true" size={20} />
        {isLocating ? "Finding location" : "Use my location"}
      </button>

      <p className="privacy-copy">
        Your location is used only in this browser to calculate the Qibla line.
      </p>

      {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

      <button
        className="choose-city-toggle"
        type="button"
        onClick={() => setCityOpen((open) => !open)}
        aria-expanded={cityOpen}
      >
        <MapPin aria-hidden="true" size={17} />
        Choose a city
        {cityOpen ? <ChevronUp aria-hidden="true" size={17} /> : <ChevronDown aria-hidden="true" size={17} />}
      </button>

      {cityOpen ? <CitySearch compact onSelect={onSelectCity} /> : null}
    </section>
  );
}
