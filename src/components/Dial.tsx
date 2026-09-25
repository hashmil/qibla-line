import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { normalise180, normalise360 } from "../lib/qibla";

type DialProps = {
  bearing: number;
  qiblaBearing: number;
  onTurn: (bearing: number) => void;
};

const R = 170;
const CARDINALS: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };

function polar(degrees: number, radius: number): [number, number] {
  const a = (degrees * Math.PI) / 180;
  return [Math.sin(a) * radius, -Math.cos(a) * radius];
}

function DialFace() {
  const marks = [];
  for (let d = 0; d < 360; d += 5) {
    const major = d % 30 === 0;
    const inner = R - (major ? 22 : d % 10 === 0 ? 14 : 8);
    const [x1, y1] = polar(d, inner);
    const [x2, y2] = polar(d, R - 2);
    marks.push(<line key={`t${d}`} className={major ? "tick major" : "tick"} x1={x1} y1={y1} x2={x2} y2={y2} />);

    if (major) {
      const [tx, ty] = polar(d, R - 36);
      const cardinal = CARDINALS[d];
      marks.push(
        <text
          key={`l${d}`}
          className={cardinal ? "dial-label cardinal" : "dial-label"}
          x={tx}
          y={ty + 4}
          transform={`rotate(${d} ${tx} ${ty})`}
        >
          {cardinal ?? d}
        </text>
      );
    }
  }
  return <>{marks}</>;
}

export function Dial({ bearing, qiblaBearing, onTurn }: DialProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ lastAngle: number; bearing: number } | null>(null);
  const face = useMemo(() => <DialFace />, []);

  const [k1x, k1y] = polar(qiblaBearing, R - 3);
  const [k2x, k2y] = polar(qiblaBearing - 2.6, R - 22);
  const [k3x, k3y] = polar(qiblaBearing + 2.6, R - 22);

  function pointerAngle(event: PointerEvent<SVGSVGElement>): number {
    const rect = svgRef.current!.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { lastAngle: pointerAngle(event), bearing };
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const angle = pointerAngle(event);
    // Accumulate small deltas so crossing the ±180° seam doesn't jump
    drag.bearing -= normalise180(angle - drag.lastAngle);
    drag.lastAngle = angle;
    onTurn(drag.bearing);
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const step = event.shiftKey ? 5 : 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onTurn(bearing + step);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onTurn(bearing - step);
    }
  }

  return (
    <div className="dial">
      <div className="dial-index" aria-hidden="true" />
      <svg
        ref={svgRef}
        className="dial-svg"
        viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}
        role="slider"
        tabIndex={0}
        aria-label="Turn the map"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(normalise360(bearing))}
        aria-valuetext={`Map turned to ${Math.round(normalise360(bearing))} degrees`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <circle className="dial-plate" r={R} />
        <circle className="dial-inner" r={R - 44} />
        <g transform={`rotate(${-bearing})`}>
          {face}
          <path className="dial-kaaba" d={`M${k1x} ${k1y} L${k2x} ${k2y} L${k3x} ${k3y} Z`} />
        </g>
      </svg>
      <div className="dial-read" aria-hidden="true">
        <b>{Math.round(normalise360(bearing))}°</b>
        <small>top of screen</small>
      </div>
    </div>
  );
}
