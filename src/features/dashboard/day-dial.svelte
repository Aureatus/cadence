<script lang="ts">
  import type { Todo } from "@/db";
  import { arcPath, buildDialMarks, dayProgress, polar, type DialMark } from "@/lib/cadence";

  let { todos }: { todos: Array<Todo> } = $props();

  const marks = $derived(buildDialMarks(todos));
  const progress = $derived(dayProgress(new Date()));
  const progressPath = $derived(arcPath(285, 0, progress));
  const futurePath = $derived(arcPath(285, progress, 1));
  const nowPoint = $derived(polar(progress));

  const ticks = Array.from({ length: 9 }, (_, index) => 6 + index * 2);

  function tickPath(hour: number) {
    const tickProgress = (hour - 6) / 16.5;
    return {
      inner: polar(tickProgress, 324),
      outer: polar(tickProgress, 338),
      label: polar(tickProgress, 356),
    };
  }
</script>

<svg viewBox="0 0 720 720" aria-hidden="true">
  <defs>
    <linearGradient id="seaArc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b8d8d3" stop-opacity="0.65" />
      <stop offset="55%" stop-color="#ecdcc1" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#e87b5a" stop-opacity="0.85" />
    </linearGradient>
    <radialGradient id="sun" cx="35%" cy="30%">
      <stop offset="0%" stop-color="#fff8e8" />
      <stop offset="55%" stop-color="#f0a890" />
      <stop offset="100%" stop-color="#c8723a" />
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#f0a890" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#e87b5a" stop-opacity="0.16" />
      <stop offset="100%" stop-color="#e87b5a" stop-opacity="0" />
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
    stroke-dasharray="2 6"
  />
  <path
    d={arcPath(285, 0.3, 0.67)}
    fill="none"
    stroke="rgba(232,123,90,0.14)"
    stroke-width="70"
  />
  <path
    d={arcPath(285, 0.79, 0.97)}
    fill="none"
    stroke="rgba(184,216,211,0.1)"
    stroke-width="70"
  />
  {#each ticks as hour (hour)}
    {@const points = tickPath(hour)}
    <g>
      <line
        x1={points.inner.x}
        y1={points.inner.y}
        x2={points.outer.x}
        y2={points.outer.y}
        stroke="rgba(184,216,211,0.55)"
        stroke-width="1.2"
      />
      <text
        x={points.label.x}
        y={points.label.y}
        fill="rgba(244,237,224,0.78)"
        font-size="13"
        font-family="DM Mono, monospace"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        {String(hour).padStart(2, "0")}
      </text>
    </g>
  {/each}
  <path d={progressPath} fill="none" stroke="url(#seaArc)" stroke-width="70" opacity="0.32" />
  <path
    d={progressPath}
    fill="none"
    stroke="url(#seaArc)"
    stroke-width="2.5"
    stroke-linecap="round"
  />
  <path
    d={futurePath}
    fill="none"
    stroke="rgba(184,216,211,0.35)"
    stroke-width="1.5"
    stroke-dasharray="2 7"
    stroke-linecap="round"
  />
  {#each marks as mark (mark.key)}
    {@const point = polar(mark.progress)}
    {#if mark.state === "done"}
      <g>
        <circle cx={point.x} cy={point.y} r="9" fill="#f4ede0" stroke="#0a1f27" stroke-width="2" />
        <circle cx={point.x} cy={point.y} r="4" fill="#0a1f27" />
      </g>
    {:else if mark.state === "due"}
      <g filter="url(#glow)">
        <circle cx={point.x} cy={point.y} r="16" fill="#e87b5a" />
        <circle cx={point.x} cy={point.y} r="8" fill="#ffffff" />
      </g>
    {:else}
      <circle cx={point.x} cy={point.y} r="7" fill="#b8d8d3" opacity="0.42" />
    {/if}
  {/each}
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
    stroke-dasharray="2 5"
  />
</svg>
