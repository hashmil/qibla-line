import { Compass, LocateFixed, Minus, Plus } from "lucide-react";

type MapButtonsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecentre: () => void;
  compassOn: boolean;
  onToggleCompass: () => void;
};

export function MapButtons({ onZoomIn, onZoomOut, onRecentre, compassOn, onToggleCompass }: MapButtonsProps) {
  return (
    <div className="map-buttons">
      <div className="zoom-pair">
        <button type="button" onClick={onZoomIn} aria-label="Zoom in">
          <Plus aria-hidden="true" size={20} />
        </button>
        <button type="button" onClick={onZoomOut} aria-label="Zoom out">
          <Minus aria-hidden="true" size={20} />
        </button>
      </div>
      <button type="button" onClick={onRecentre} aria-label="Back to my place">
        <LocateFixed aria-hidden="true" size={20} />
      </button>
      <button
        type="button"
        className={compassOn ? "is-on" : ""}
        onClick={onToggleCompass}
        aria-pressed={compassOn}
        aria-label="Follow phone compass"
      >
        <Compass aria-hidden="true" size={20} />
      </button>
      <a className="osm-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
