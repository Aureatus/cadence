import type { Todo } from "@/db";
import { arcPath, buildDialMarks, dayProgress, polar, type DialMark } from "@/lib/cadence";

export function DayDial({ todos }: { todos: Array<Todo> }) {
  const marks = buildDialMarks(todos);
  const progress = dayProgress(new Date());
  const progressPath = arcPath(285, 0, progress);
  const futurePath = arcPath(285, progress, 1);
  const nowPoint = polar(progress);

  return (
    <svg viewBox="0 0 720 720" aria-hidden="true">
      <defs>
        <linearGradient id="seaArc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b8d8d3" stopOpacity="0.65" />
          <stop offset="55%" stopColor="#ecdcc1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e87b5a" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="sun" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fff8e8" />
          <stop offset="55%" stopColor="#f0a890" />
          <stop offset="100%" stopColor="#c8723a" />
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#f0a890" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#e87b5a" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#e87b5a" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="360" cy="360" r="200" fill="url(#halo)" opacity="0.55" />
      <circle cx="360" cy="360" r="320" fill="none" stroke="rgba(184,216,211,0.18)" />
      <circle
        cx="360"
        cy="360"
        r="250"
        fill="none"
        stroke="rgba(184,216,211,0.12)"
        strokeDasharray="2 6"
      />
      <path
        d={arcPath(285, 0.3, 0.67)}
        fill="none"
        stroke="rgba(232,123,90,0.14)"
        strokeWidth="70"
      />
      <path
        d={arcPath(285, 0.79, 0.97)}
        fill="none"
        stroke="rgba(184,216,211,0.1)"
        strokeWidth="70"
      />
      <HourTicks />
      <path d={progressPath} fill="none" stroke="url(#seaArc)" strokeWidth="70" opacity="0.32" />
      <path
        d={progressPath}
        fill="none"
        stroke="url(#seaArc)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d={futurePath}
        fill="none"
        stroke="rgba(184,216,211,0.35)"
        strokeWidth="1.5"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      {marks.map((mark) => (
        <DialMarkGlyph key={mark.key} mark={mark} />
      ))}
      <g transform={`translate(${nowPoint.x} ${nowPoint.y})`} filter="url(#glow)">
        <circle r="36" fill="rgba(240,168,144,0.18)" />
        <circle r="24" fill="rgba(240,168,144,0.30)" />
        <circle r="14" fill="url(#sun)" />
      </g>
      <line
        x1="360"
        y1="360"
        x2={nowPoint.x}
        y2={nowPoint.y}
        stroke="rgba(232,123,90,0.32)"
        strokeDasharray="2 5"
      />
    </svg>
  );
}

function HourTicks() {
  const ticks = Array.from({ length: 9 }, (_, index) => 6 + index * 2);

  return (
    <>
      {ticks.map((hour) => {
        const progress = (hour - 6) / 16.5;
        const inner = polar(progress, 324);
        const outer = polar(progress, 338);
        const labelPoint = polar(progress, 356);

        return (
          <g key={hour}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(184,216,211,0.55)"
              strokeWidth="1.2"
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              fill="rgba(244,237,224,0.78)"
              fontSize="13"
              fontFamily="DM Mono, monospace"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {String(hour).padStart(2, "0")}
            </text>
          </g>
        );
      })}
    </>
  );
}

function DialMarkGlyph({ mark }: { mark: DialMark }) {
  const point = polar(mark.progress);

  if (mark.state === "done") {
    return (
      <g>
        <circle cx={point.x} cy={point.y} r="9" fill="#f4ede0" stroke="#0a1f27" strokeWidth="2" />
        <circle cx={point.x} cy={point.y} r="4" fill="#0a1f27" />
      </g>
    );
  }

  if (mark.state === "due") {
    return (
      <g filter="url(#glow)">
        <circle cx={point.x} cy={point.y} r="16" fill="#e87b5a" />
        <circle cx={point.x} cy={point.y} r="8" fill="#ffffff" />
      </g>
    );
  }

  return <circle cx={point.x} cy={point.y} r="7" fill="#b8d8d3" opacity="0.42" />;
}
