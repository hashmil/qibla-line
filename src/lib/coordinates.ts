// Reads one latitude or longitude as people type it: "25.2048", "-33,8688" (decimal
// comma), "25.2048°", "33.8688 S" or "S 33.8688". Hemisphere letters matter on iPhones,
// whose decimal keypad has no minus sign. Returns null for anything else, including
// forms Number() would accept by accident ("0x10", "1e1").
export function parseCoordinate(input: string, positive: "N" | "E", negative: "S" | "W"): number | null {
  let text = input.trim().toUpperCase().replace(/[°\s]/g, "").replace(",", ".");
  let sign = 1;

  const hemisphere = /^[NSEW]|[NSEW]$/.exec(text)?.[0];
  if (hemisphere) {
    if (hemisphere === negative) sign = -1;
    else if (hemisphere !== positive) return null;
    text = text.replace(/^[NSEW]|[NSEW]$/, "");
    // "-25 S" says the sign twice
    if (/^[+-]/.test(text)) return null;
  }

  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  return Number(text) * sign;
}
