import { forwardRef, useEffect, useRef, useState } from "react";
import { formatDistance } from "../lib/format";

export type FaceMode = "live" | "starting" | "static";

type FaceCardProps = {
  mode: FaceMode;
  relativeBearing: number;
  flat: boolean;
  staticReason?: string | undefined;
  qiblaBearing: number;
  distanceKm: number;
  placeLabel: string;
  accuracy?: number | undefined;
  onRematch: () => void;
  onChangePlace: () => void;
};

// Enter "facing" inside 2°, leave it beyond 4°, so the message doesn't flicker at the edge
function useFacing(relative: number, live: boolean): boolean {
  const [facing, setFacing] = useState(false);
  const magnitude = Math.abs(relative);

  useEffect(() => {
    if (!live) {
      setFacing(false);
      return;
    }
    setFacing((current) => (current ? magnitude <= 4 : magnitude < 2));
  }, [magnitude, live]);

  return facing;
}

export const FaceCard = forwardRef<HTMLElement, FaceCardProps>(function FaceCard(
  {
    mode,
    relativeBearing,
    flat,
    staticReason,
    qiblaBearing,
    distanceKm,
    placeLabel,
    accuracy,
    onRematch,
    onChangePlace
  },
  ref
) {
  const live = mode === "live";
  const facing = useFacing(relativeBearing, live);
  const wasFacingRef = useRef(false);
  const degrees = Math.abs(Math.round(relativeBearing));
  const side = relativeBearing > 0 ? "right" : "left";

  useEffect(() => {
    if (facing && !wasFacingRef.current) navigator.vibrate?.(40);
    wasFacingRef.current = facing;
  }, [facing]);

  let headline: string;
  let detail: string;

  if (mode === "starting") {
    headline = "Hold still";
    detail = "Leave the phone against the wall for a moment.";
  } else if (live) {
    headline = facing ? "Facing the Qibla" : `Turn ${side} ${degrees}°`;
    detail = !flat
      ? "Tilt the phone back to flat, screen up."
      : facing
        ? "Stay as you are. The amber line points straight ahead."
        : "Turn slowly on the spot until the line points straight ahead.";
  } else {
    headline = degrees < 1 ? "The Qibla is straight ahead of the top edge" : `The Qibla is ${degrees}° ${side} of the phone's top edge`;
    detail = staticReason ?? "The amber line on the map is your direction.";
  }

  return (
    <section ref={ref} className="face-card" aria-label="Qibla direction">
      <p className={facing ? "turn is-aligned" : mode === "static" ? "turn is-static" : "turn"} role="status" aria-live="polite">
        {headline}
      </p>
      <p className="turn-help">{detail}</p>
      <div className="face-meta">
        <span>
          {placeLabel}
          {accuracy ? ` ±${Math.round(accuracy)} m` : ""}
        </span>
        <span className="num">
          <b>{qiblaBearing.toFixed(1)}°</b> · {formatDistance(distanceKm)}
        </span>
      </div>
      <div className="face-actions">
        <button type="button" onClick={onRematch}>
          Line up again
        </button>
        <button type="button" onClick={onChangePlace}>
          Change place
        </button>
      </div>
    </section>
  );
});
