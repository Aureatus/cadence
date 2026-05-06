const TOTAL_MINUTES = 24 * 60;

export function MiniDayDial({
  windowStart,
  windowEnd,
  occurrences,
  size = 88,
  active = false,
}: {
  windowStart: number;
  windowEnd: number;
  occurrences: Array<number>;
  size?: number;
  active?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.4;
  const tickInner = radius - 3;
  const arcStroke = active ? "rgba(232,123,90,0.85)" : "rgba(232,123,90,0.55)";
  const dotFill = active ? "#f0a890" : "#e87b5a";
  const tickStroke = "rgba(184,216,211,0.4)";
  const ringStroke = "rgba(184,216,211,0.18)";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden
      className="block shrink-0"
    >
      <defs>
        <radialGradient id="mini-day-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(232,123,90,0.18)" />
          <stop offset="65%" stopColor="rgba(232,123,90,0.04)" />
          <stop offset="100%" stopColor="rgba(232,123,90,0)" />
        </radialGradient>
      </defs>
      {active && <circle cx={cx} cy={cy} r={radius + 6} fill="url(#mini-day-glow)" />}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={ringStroke} strokeWidth="1" />
      {[6, 12, 18].map((hour) => {
        const point = polar(cx, cy, radius, hour * 60);
        const inner = polar(cx, cy, tickInner, hour * 60);
        return (
          <line
            key={hour}
            x1={inner.x}
            y1={inner.y}
            x2={point.x}
            y2={point.y}
            stroke={tickStroke}
            strokeWidth="1"
            strokeLinecap="round"
          />
        );
      })}
      <path
        d={arcPath(cx, cy, radius, windowStart, windowEnd)}
        fill="none"
        stroke={arcStroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {occurrences.map((minutes, index) => {
        const point = polar(cx, cy, radius, minutes);
        return (
          <circle
            key={`${minutes}-${index}`}
            cx={point.x}
            cy={point.y}
            r={active ? 3 : 2.5}
            fill={dotFill}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={1.5} fill="rgba(244,237,224,0.4)" />
    </svg>
  );
}

function polar(cx: number, cy: number, r: number, minutes: number) {
  const angle = (minutes / TOTAL_MINUTES) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function arcPath(cx: number, cy: number, r: number, startMin: number, endMin: number) {
  const start = polar(cx, cy, r, startMin);
  const end = polar(cx, cy, r, endMin);
  const span = endMin - startMin;
  const large = span > TOTAL_MINUTES / 2 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}
