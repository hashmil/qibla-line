import { X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { GUIDES, GUIDE_GROUPS, detectPlatform, type InstallGuide } from "../lib/install";

type InstallSheetProps = {
  canPrompt: boolean;
  onPromptInstall: () => void;
  onClose: () => void;
};

function Steps({ guide }: { guide: InstallGuide }) {
  return (
    <>
      {guide.steps.length > 1 ? (
        <ol className="install-steps">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : (
        <p className="install-steps">{guide.steps[0]}</p>
      )}
      {guide.note ? <p className="install-note">{guide.note}</p> : null}
    </>
  );
}

export function InstallSheet({ canPrompt, onPromptInstall, onClose }: InstallSheetProps) {
  const platform = useMemo(() => detectPlatform(), []);
  const guide = GUIDES[platform];
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="install-backdrop" onClick={onClose}>
      <section
        className="install-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="install-head">
          <h2 id="install-title">Install Qibla Line</h2>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <p className="install-intro">
          It opens full screen from your Home Screen, without the browser bars, so it's one tap away at prayer time.
        </p>

        <h3 className="install-for">
          {platform === "unknown" ? "On this device" : `On this ${guide.device}, in ${guide.browser}`}
        </h3>
        {canPrompt ? (
          <button type="button" className="secondary-action" onClick={onPromptInstall}>
            Install now
          </button>
        ) : (
          <Steps guide={guide} />
        )}

        <details className="install-others">
          <summary>Other phones and computers</summary>
          {GUIDE_GROUPS.map((group) => (
            <div key={group.label} className="install-group">
              <h4>{group.label}</h4>
              {group.platforms.map((id) => (
                <div key={id} className="install-browser">
                  <h5>{GUIDES[id].browser}</h5>
                  <Steps guide={GUIDES[id]} />
                </div>
              ))}
            </div>
          ))}
        </details>
      </section>
    </div>
  );
}
