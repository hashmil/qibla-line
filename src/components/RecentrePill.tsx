import { LocateFixed } from "lucide-react";

type RecentrePillProps = {
  visible: boolean;
  label: string;
  onRecentre: () => void;
};

export function RecentrePill({ visible, label, onRecentre }: RecentrePillProps) {
  return (
    <button
      className={`recentre-pill ${visible ? "is-visible" : ""}`}
      type="button"
      onClick={onRecentre}
      inert={!visible}
    >
      <LocateFixed aria-hidden="true" size={17} />
      <span>{label}</span>
    </button>
  );
}
