<script lang="ts">
  const TOTAL_MINUTES = 24 * 60;

  type Props = {
    windowStart: number;
    windowEnd: number;
    occurrences: Array<number>;
    size?: number;
    active?: boolean;
  };

  let { windowStart, windowEnd, occurrences, size = 88, active = false }: Props = $props();

  const cx = $derived(size / 2);
  const cy = $derived(size / 2);
  const radius = $derived(size * 0.4);
  const tickInner = $derived(radius - 3);
  const arcStroke = $derived(active ? "rgba(232,123,90,0.85)" : "rgba(232,123,90,0.55)");
  const dotFill = $derived(active ? "#f0a890" : "#e87b5a");
  const tickStroke = "rgba(184,216,211,0.4)";
  const ringStroke = "rgba(184,216,211,0.18)";

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
</script>

<svg
  viewBox={`0 0 ${size} ${size}`}
  width={size}
  height={size}
  aria-hidden="true"
  class="block shrink-0"
>
  <defs>
    <radialGradient id="mini-day-glow" cx="50%" cy="50%">
      <stop offset="0%" stop-color="rgba(232,123,90,0.18)" />
      <stop offset="65%" stop-color="rgba(232,123,90,0.04)" />
      <stop offset="100%" stop-color="rgba(232,123,90,0)" />
    </radialGradient>
  </defs>
  {#if active}
    <circle {cx} {cy} r={radius + 6} fill="url(#mini-day-glow)" />
  {/if}
  <circle {cx} {cy} r={radius} fill="none" stroke={ringStroke} stroke-width="1" />
  {#each [6, 12, 18] as hour (hour)}
    {@const point = polar(cx, cy, radius, hour * 60)}
    {@const inner = polar(cx, cy, tickInner, hour * 60)}
    <line
      x1={inner.x}
      y1={inner.y}
      x2={point.x}
      y2={point.y}
      stroke={tickStroke}
      stroke-width="1"
      stroke-linecap="round"
    />
  {/each}
  <path
    d={arcPath(cx, cy, radius, windowStart, windowEnd)}
    fill="none"
    stroke={arcStroke}
    stroke-width="2.5"
    stroke-linecap="round"
  />
  {#each occurrences as minutes, index (`${minutes}-${index}`)}
    {@const point = polar(cx, cy, radius, minutes)}
    <circle cx={point.x} cy={point.y} r={active ? 3 : 2.5} fill={dotFill} />
  {/each}
  <circle {cx} {cy} r={1.5} fill="rgba(244,237,224,0.4)" />
</svg>
