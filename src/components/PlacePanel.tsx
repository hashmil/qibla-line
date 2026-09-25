import { LocateFixed } from "lucide-react";
import { CitySearch } from "./CitySearch";
import type { AppLocation } from "../types";

type PlacePanelProps = {
  onUseLocation: () => void;
  onSelectCity: (location: AppLocation) => void;
  message?: string;
  isLocating: boolean;
};

export function PlacePanel({ onUseLocation, onSelectCity, message, isLocating }: PlacePanelProps) {
  return (
    <section className="place-panel" aria-label="Choose your place">
      <button className="primary-action" type="button" onClick={onUseLocation} disabled={isLocating}>
        <LocateFixed aria-hidden="true" size={20} />
        {isLocating ? "Finding your location" : "Use my location"}
      </button>
      {message ? <p className="place-message">{message}</p> : null}

      <p className="list-heading">Or pick a city</p>
      <CitySearch onSelect={onSelectCity} />

      <p className="app-credit">
        <a href="/about">About Qibla Line</a> · Created by{" "}
        <a href="https://hashir.net" target="_blank" rel="noreferrer">
          Hash Milhan
        </a>{" "}
        ·{" "}
        <a href="https://github.com/hashmil/qibla-line" target="_blank" rel="noreferrer">
          Source
        </a>
      </p>
    </section>
  );
}
