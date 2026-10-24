import { FormEvent, useMemo, useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { CITIES } from "../data/cities";
import type { AppLocation, City } from "../types";

type CitySearchProps = {
  onSelect: (location: AppLocation) => void;
  compact?: boolean;
};

function cityLabel(city: City): string {
  return `${city.city}, ${city.country}`;
}

export function CitySearch({ onSelect, compact = false }: CitySearchProps) {
  const searchId = compact ? "city-search-compact" : "city-search";
  const resultsId = compact ? "city-results-compact" : "city-results";
  const [query, setQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [manualError, setManualError] = useState("");

  const matches = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    if (!normalised) return CITIES.slice(0, compact ? 6 : 10);

    return CITIES.filter((city) =>
      [city.city, city.country, city.region].filter(Boolean).join(" ").toLowerCase().includes(normalised)
    ).slice(0, compact ? 6 : 10);
  }, [compact, query]);

  function chooseCity(city: City) {
    onSelect({
      label: cityLabel(city),
      lat: city.lat,
      lon: city.lon,
      source: "city"
    });
    setQuery(cityLabel(city));
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    const trimmedLat = lat.trim();
    const trimmedLon = lon.trim();

    if (!trimmedLat || !trimmedLon) {
      setManualError("Enter latitude and longitude.");
      return;
    }

    // Locales with a decimal comma get a comma on the decimal keypad.
    const parsedLat = Number(trimmedLat.replace(",", "."));
    const parsedLon = Number(trimmedLon.replace(",", "."));

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
      label: `Manual coordinates ${parsedLat.toFixed(4)}, ${parsedLon.toFixed(4)}`,
      lat: parsedLat,
      lon: parsedLon,
      source: "manual"
    });
  }

  return (
    <div className="city-search">
      <label className="field-label" htmlFor={compact ? "city-search-compact" : "city-search"}>
        Choose a city
      </label>
      <div className="search-field">
        <Search aria-hidden="true" size={18} />
        <input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          aria-controls={resultsId}
          autoComplete="off"
          placeholder="Search city or country"
        />
      </div>
      <div className="city-results" id={resultsId} role="group" aria-label="City suggestions">
        {matches.map((city) => {
          const label = cityLabel(city);
          return (
            <button
              key={`${city.city}-${city.country}`}
              type="button"
              onClick={() => chooseCity(city)}
              aria-label={label}
              aria-pressed={query === label}
            >
              <MapPin aria-hidden="true" size={16} />
              <span>
                <strong>{city.city}</strong>
                {city.country}
              </span>
            </button>
          );
        })}
      </div>

      <button
        className="advanced-toggle"
        type="button"
        onClick={() => setAdvancedOpen((open) => !open)}
        aria-expanded={advancedOpen}
      >
        <Crosshair aria-hidden="true" size={16} />
        Manual coordinates
      </button>

      {advancedOpen ? (
        <form className="manual-form" onSubmit={submitManual}>
          <label>
            Latitude
            <input
              value={lat}
              onChange={(event) => setLat(event.target.value)}
              inputMode="decimal"
              placeholder="25.2048"
            />
          </label>
          <label>
            Longitude
            <input
              value={lon}
              onChange={(event) => setLon(event.target.value)}
              inputMode="decimal"
              placeholder="55.2708"
            />
          </label>
          <button type="submit">Use coordinates</button>
          {manualError ? (
            <p className="form-error" role="alert">
              {manualError}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
