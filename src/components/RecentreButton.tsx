import { LocateFixed } from "lucide-react";

type RecentreButtonProps = {
  visible: boolean;
  label: string;
  onRecentre: () => void;
};

// Appears above the bottom panel once the user's dot has left the visible map
export function RecentreButton({ visible, label, onRecentre }: RecentreButtonProps) {
  return (
    <button
      className={visible ? "recentre-button is-visible" : "recentre-button"}
      type="button"
      onClick={onRecentre}
      inert={!visible}
    >
      <LocateFixed aria-hidden="true" size={16} />
      <span>{label}</span>
    </button>
  );
}
