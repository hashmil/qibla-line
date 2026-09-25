import { forwardRef } from "react";
import { formatDistance } from "../lib/format";

type FaceCardProps = {
  relativeBearing: number;
  qiblaBearing: number;
  distanceKm: number;
  placeLabel: string;
  accuracy?: number | undefined;
  compassFollowing: boolean;
  onRematch: () => void;
  onChangePlace: () => void;
};

export const FaceCard = forwardRef<HTMLElement, FaceCardProps>(function FaceCard(
  { relativeBearing, qiblaBearing, distanceKm, placeLabel, accuracy, compassFollowing, onRematch, onChangePlace },
  ref
) {
  const aligned = Math.abs(relativeBearing) < 2;
  const degrees = Math.abs(Math.round(relativeBearing));
  const side = relativeBearing > 0 ? "right" : "left";

  return (
    <section ref={ref} className="face-card" aria-label="Qibla direction">
      <p className={aligned ? "turn is-aligned" : "turn"} role="status">
        {aligned ? "Your phone points at the Qibla" : `Turn ${degrees}° to your ${side}`}
      </p>
      <p className="turn-help">
        {compassFollowing
          ? "Updating from your phone's compass as you turn."
          : aligned
            ? "Face the way the top of your phone points."
            : "Or simply face along the amber line."}
      </p>
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
          Re-match
        </button>
        <button type="button" onClick={onChangePlace}>
          Change place
        </button>
      </div>
    </section>
  );
});
