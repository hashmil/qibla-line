export function formatDistance(km: number): string {
  if (km >= 1000) {
    return `${Math.round(km).toLocaleString("en-GB")} km`;
  }

  if (km >= 100) {
    return `${Math.round(km)} km`;
  }

  return `${km.toFixed(1)} km`;
}
