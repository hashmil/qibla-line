import { FormEvent, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CITIES } from "../data/cities";
import { parseCoordinate } from "../lib/coordinates";
import { calculateQiblaBearing } from "../lib/qibla";
import type { AppLocation, City } from "../types";

type CitySearchProps = {
  onSelect: (location: AppLocation) => void;
};

function cityLabel(city: City): string {
  return `${city.city}, ${city.country}`;
}

// Lower case without accents, so "medine" or "Sao Paulo" still match
function searchable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function coordinateInputProps(error: string) {
  return {
    inputMode: "text" as const,
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: false,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? "coordinates-error" : undefined
  };
}

export function CitySearch({ onSelect }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [manualError, setManualError] = useState("");

  const matches = useMemo(() => {
    const normalised = searchable(query.trim());
    const found = normalised
      ? CITIES.filter((city) =>
          searchable([city.city, city.country, city.region, ...(city.aliases ?? [])].filter(Boolean).join(" ")).includes(
            normalised
          )
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

    const parsedLat = parseCoordinate(trimmedLat, "N", "S");
    const parsedLon = parseCoordinate(trimmedLon, "E", "W");

    if (parsedLat === null || parsedLon === null) {
      setManualError("Enter numbers such as 25.2048, or add N, S, E or W, such as 33.8688 S.");
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
          aria-controls="city-results"
          autoComplete="off"
          placeholder="Search city or country"
        />
      </div>

      <div className="city-results" id="city-results" role="group" aria-label="Cities">
        {matches.map((city) => (
          <button
            key={`${city.city}-${city.country}`}
            type="button"
            onClick={() => chooseCity(city)}
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
          {/* Text keyboard: the iPhone decimal keypad has no minus sign */}
          <label>
            Latitude
            <input
              value={lat}
              onChange={(event) => setLat(event.target.value)}
              {...coordinateInputProps(manualError)}
              placeholder="25.2048"
            />
          </label>
          <label>
            Longitude
            <input
              value={lon}
              onChange={(event) => setLon(event.target.value)}
              {...coordinateInputProps(manualError)}
              placeholder="55.2708"
            />
          </label>
          <button type="submit">Use coordinates</button>
          {manualError ? (
            <p className="form-error" id="coordinates-error" role="alert">
              {manualError}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
