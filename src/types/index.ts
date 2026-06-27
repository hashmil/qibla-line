export type Coordinates = {
  lat: number;
  lon: number;
};

export type LocationSource = "geolocation" | "city" | "manual" | "fallback";

export type AppLocation = Coordinates & {
  label: string;
  source: LocationSource;
  accuracy?: number;
};

export type City = Coordinates & {
  city: string;
  country: string;
  region?: string;
};

export type CompassStatus = "idle" | "requesting" | "active" | "denied" | "unsupported" | "error";

export type CompassReading = {
  heading: number;
  accuracy?: number;
  source: "webkit" | "absolute" | "relative";
};

