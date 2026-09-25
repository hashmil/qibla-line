import { FormEvent, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CITIES } from "../data/cities";
import { calculateQiblaBearing } from "../lib/qibla";
import type { AppLocation, City } from "../types";

type CitySearchProps = {
  onSelect: (location: AppLocation) => void;
};

function cityLabel(city: City): string {
  return `${city.city}, ${city.country}`;
}

export function CitySearch({ onSelect }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [manualError, setManualError] = useState("");

  const matches = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    const found = normalised
      ? CITIES.filter((city) =>
          [city.city, city.country, city.region].filter(Boolean).join(" ").toLowerCase().includes(normalised)
        )
      : CITIES;
    return found.slice(0, 12);
  }, [query]);

  function chooseCity(city: City) {
    onSelect({
      label: city.city,
      lat: city.lat,
      lon: city.lon,
      source: "city"
    });
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    const trimmedLat = lat.trim();
    const trimmedLon = lon.trim();

    if (!trimmedLat || !trimmedLon) {
      setManualError("Enter latitude and longitude.");
      return;
    }

    const parsedLat = Number(trimmedLat);
    const parsedLon = Number(trimmedLon);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
      setManualError("Enter numbers for latitude and longitude.");
      return;
    }

    if (parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      setManualError("Latitude must be -90 to 90 and longitude -180 to 180.");
      return;
    }

    setManualError("");
    onSelect({
      label: `${parsedLat.toFixed(4)}, ${parsedLon.toFixed(4)}`,
      lat: parsedLat,
      lon: parsedLon,
      source: "manual"
    });
  }

  return (
    <div className="city-search">
      <label className="visually-hidden" htmlFor="city-search">
        Search cities
      </label>
      <div className="search-field">
        <Search aria-hidden="true" size={18} />
        <input
          id="city-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="city-results"
          aria-expanded={matches.length > 0}
          aria-haspopup="listbox"
          autoComplete="off"
          placeholder="Search city or country"
        />
      </div>

      <div className="city-results" id="city-results" role="listbox" aria-label="Cities">
        {matches.map((city) => (
          <button
            key={`${city.city}-${city.country}`}
            type="button"
            onClick={() => chooseCity(city)}
            role="option"
            aria-selected={false}
            aria-label={`${cityLabel(city)}, Qibla ${calculateQiblaBearing(city).toFixed(1)} degrees`}
          >
            <span className="city-name">
              {city.city}
              <small>{city.country}</small>
            </span>
            <span className="num">{calculateQiblaBearing(city).toFixed(1)}°</span>
          </button>
        ))}
        {matches.length === 0 ? <p className="empty">No city matches “{query.trim()}”.</p> : null}
      </div>

      <button
        className="text-button"
        type="button"
        onClick={() => setAdvancedOpen((open) => !open)}
        aria-expanded={advancedOpen}
      >
        {advancedOpen ? "Hide coordinates" : "Enter coordinates instead"}
      </button>

      {advancedOpen ? (
        <form className="manual-form" onSubmit={submitManual}>
          <label>
            Latitude
            <input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" placeholder="25.2048" />
          </label>
          <label>
            Longitude
            <input value={lon} onChange={(event) => setLon(event.target.value)} inputMode="decimal" placeholder="55.2708" />
          </label>
          <button type="submit">Use coordinates</button>
          {manualError ? <p className="form-error">{manualError}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
