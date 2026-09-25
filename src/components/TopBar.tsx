import { ChevronDown, Download } from "lucide-react";
import { forwardRef } from "react";

export type Step = "place" | "match" | "face";

const STEPS: { id: Step; label: string }[] = [
  { id: "place", label: "Place" },
  { id: "match", label: "Match" },
  { id: "face", label: "Face" }
];

type TopBarProps = {
  step: Step;
  title: string;
  help: string;
  placeLabel?: string | undefined;
  onChangePlace: () => void;
  onInstall?: (() => void) | undefined;
};

export const TopBar = forwardRef<HTMLElement, TopBarProps>(function TopBar(
  { step, title, help, placeLabel, onChangePlace, onInstall },
  ref
) {
  const current = STEPS.findIndex((s) => s.id === step);

  return (
    <header ref={ref} className="top-bar">
      <div className="top-row">
        <span className="app-name">
          <span className="app-mark" aria-hidden="true" />
          Qibla Line
        </span>
        {placeLabel ? (
          <button type="button" className="place-button" onClick={onChangePlace} aria-label={`Change place, currently ${placeLabel}`}>
            <span>{placeLabel}</span>
            <ChevronDown aria-hidden="true" size={14} />
          </button>
        ) : onInstall ? (
          <button type="button" className="place-button" onClick={onInstall}>
            <Download aria-hidden="true" size={14} />
            <span>Install app</span>
          </button>
        ) : null}
      </div>

      <ol className="step-bars" aria-label={`Step ${current + 1} of 3: ${STEPS[current]?.label}`}>
        {STEPS.map((s, i) => (
          <li key={s.id} className={i < current ? "done" : i === current ? "now" : ""} aria-hidden="true" />
        ))}
      </ol>

      <h1>{title}</h1>
      <p className="help" role="status">
        {help}
      </p>
    </header>
  );
});
