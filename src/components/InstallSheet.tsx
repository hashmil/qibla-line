import { AppWindow, EllipsisVertical, ExternalLink, Menu, MonitorDown, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { GUIDES, GUIDE_GROUPS, detectPlatform, type InstallGuide, type InstallStep } from "../lib/install";

type InstallSheetProps = {
  canPrompt: boolean;
  onPromptInstall: () => void;
  onClose: () => void;
};

// Each tile shows the control the user is about to tap, drawn the way the browser draws it
function StepTile({ step }: { step: InstallStep }) {
  const size = 22;
  switch (step.icon) {
    case "share":
      return <Share aria-hidden="true" size={size} />;
    case "add-home":
      return <SquarePlus aria-hidden="true" size={size} />;
    case "menu-dots":
      return <EllipsisVertical aria-hidden="true" size={size} />;
    case "menu-lines":
      return <Menu aria-hidden="true" size={size} />;
    case "install":
      return <MonitorDown aria-hidden="true" size={size} />;
    case "open-browser":
      return <ExternalLink aria-hidden="true" size={size} />;
    case "dock":
      return <AppWindow aria-hidden="true" size={size} />;
    case "add":
      return <span className="tile-word">{step.target}</span>;
  }
}

function Steps({ guide, compact = false }: { guide: InstallGuide; compact?: boolean }) {
  return (
    <>
      <ol className={compact ? "install-steps is-compact" : "install-steps"}>
        {guide.steps.map((step) => (
          <li key={step.lead + step.target}>
            <span className="step-tile">
              <StepTile step={step} />
            </span>
            <span className="step-text">
              {step.lead}
              <strong>{step.target}</strong>
              {step.tail}
            </span>
          </li>
        ))}
      </ol>
      {guide.note ? <p className="install-note">{guide.note}</p> : null}
    </>
  );
}

export function InstallSheet({ canPrompt, onPromptInstall, onClose }: InstallSheetProps) {
  const platform = useMemo(() => detectPlatform(), []);
  const guide = GUIDES[platform];
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const isComputer = platform === "desktop-chromium" || platform === "mac-safari" || platform === "desktop-firefox";

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
        <button ref={closeRef} type="button" className="icon-button install-close" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" size={20} />
        </button>

        <div className="install-hero">
          <img src="/icons/icon-192.png" alt="" width={64} height={64} />
          <div>
            <h2 id="install-title">{isComputer ? "Install Qibla Line" : "Add Qibla Line to your Home Screen"}</h2>
            <p>Opens full screen, one tap away at prayer time.</p>
          </div>
        </div>

        {canPrompt ? (
          <button type="button" className="primary-action" onClick={onPromptInstall}>
            Install
          </button>
        ) : (
          <>
            <p className="install-for">
              {platform === "unknown" ? "On this device" : `On this ${guide.device} in ${guide.browser}`}
            </p>
            <Steps guide={guide} />
          </>
        )}

        <button type="button" className="text-button install-later" onClick={onClose}>
          Not now
        </button>

        <details className="install-others">
          <summary>Other phones and computers</summary>
          {GUIDE_GROUPS.map((group) => ({ ...group, platforms: group.platforms.filter((id) => id !== platform) }))
            .filter((group) => group.platforms.length > 0)
            .map((group) => (
            <div key={group.label} className="install-group">
              <h3>{group.label}</h3>
              {group.platforms.map((id) => (
                  <div key={id} className="install-browser">
                    <h4>{GUIDES[id].browser}</h4>
                    <Steps guide={GUIDES[id]} compact />
                  </div>
                ))}
            </div>
          ))}
        </details>
      </section>
    </div>
  );
}
