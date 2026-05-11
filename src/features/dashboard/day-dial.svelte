<script lang="ts">
  import type { Todo } from "@/db";
  import { arcPath, buildDialMarks, dayProgress, polar, type DialMark } from "@/lib/cadence";
  import { cn } from "@/lib/utils";

  type Props = {
    todos: Array<Todo>;
    onSelect?: (todoId: string) => void;
    paused?: boolean;
  };

  let { todos, onSelect, paused = false }: Props = $props();

  const marks = $derived(buildDialMarks(todos));
  const progress = $derived(dayProgress(new Date()));
  const progressPath = $derived(arcPath(285, 0, progress));
  const futurePath = $derived(arcPath(285, progress, 1));
  const nowPoint = $derived(polar(progress));

  const ticks = Array.from({ length: 9 }, (_, index) => 6 + index * 2);

  let hoveredKey = $state<string | null>(null);

  // When `paused` flips (e.g. the detail sheet opens or closes) we reset hover
  // state and gate further updates briefly. Otherwise the browser synthesizes
  // a mouseenter on whichever mark sits under the (stationary) cursor when the
  // sheet's overlay disappears, latching the hover styling back on.
  let suppressHoverUntil = 0;
  let prevPaused = false;
  $effect(() => {
    if (paused === prevPaused) return;
    if (paused) {
      hoveredKey = null;
    } else {
      suppressHoverUntil = performance.now() + 300;
    }
    prevPaused = paused;
  });

  function setHover(key: string) {
    if (paused) return;
    if (performance.now() < suppressHoverUntil) return;
    hoveredKey = key;
  }

  function clearHover(key: string) {
    if (hoveredKey === key) hoveredKey = null;
  }

  // Cursor proximity to the sun drives the orbital fan. We track at the window
  // level so the SVG element's own bounds don't matter — chasing a fanned mark
  // past the dial edge no longer trips a collapse. A wide activation radius
  // plus a long grace timer give plenty of headroom for slow approach and
  // click micro-adjustments on small targets.
  const SUN_HOVER_RADIUS = 180;
  const COLLAPSE_GRACE_MS = 400;
  let sunHovered = $state(false);
  let svgEl: SVGSVGElement | undefined = $state();
  let collapseTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelCollapse() {
    if (collapseTimer !== null) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
  }

  function scheduleCollapse() {
    if (collapseTimer !== null) return;
    collapseTimer = setTimeout(() => {
      sunHovered = false;
      collapseTimer = null;
    }, COLLAPSE_GRACE_MS);
  }

  $effect(() => {
    if (paused) {
      sunHovered = false;
      cancelCollapse();
      return;
    }

    function onMove(event: MouseEvent) {
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * 720;
      const y = ((event.clientY - rect.top) / rect.height) * 720;
      const distance = Math.hypot(x - nowPoint.x, y - nowPoint.y);

      if (distance < SUN_HOVER_RADIUS) {
        cancelCollapse();
        sunHovered = true;
      } else if (sunHovered) {
        scheduleCollapse();
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelCollapse();
    };
  });

  // When the cursor enters the sun's neighbourhood, all marks within the
  // cluster threshold are placed on a 72-unit orbit around the sun, evenly
  // spaced across a 180° arc on the side facing away from the dial centre.
  // This guarantees no two clustered marks share a position — even when their
  // progress values coincide — and keeps the fan pointing outward, away from
  // the clock/streak content in the middle of the dial.
  const FAN_RADIUS = 72;
  const CLUSTER_THRESHOLD = 72;

  const clusteredFan = $derived.by(() => {
    const result = new Map<string, { x: number; y: number }>();
    if (!sunHovered) return result;

    const inCluster = marks
      .map((mark) => {
        const base = polar(mark.progress, 285);
        return {
          mark,
          distance: Math.hypot(base.x - nowPoint.x, base.y - nowPoint.y),
        };
      })
      .filter(({ distance }) => distance < CLUSTER_THRESHOLD)
      .sort((a, b) => a.mark.progress - b.mark.progress);

    if (inCluster.length === 0) return result;

    const anchorAngle = Math.atan2(nowPoint.y - 360, nowPoint.x - 360);
    const angleStep = Math.PI / inCluster.length;
    const startOffset = (-(inCluster.length - 1) / 2) * angleStep;

    inCluster.forEach(({ mark }, index) => {
      const angle = anchorAngle + startOffset + index * angleStep;
      result.set(mark.key, {
        x: nowPoint.x + Math.cos(angle) * FAN_RADIUS,
        y: nowPoint.y + Math.sin(angle) * FAN_RADIUS,
      });
    });

    return result;
  });

  // Marks outside the fan zone but still within the sun's halo get a quiet
  // radial lift, so a mark drifting past the sun glides smoothly in and out
  // instead of being eclipsed.
  function displacedPoint(mark: DialMark) {
    const fanned = clusteredFan.get(mark.key);
    if (fanned) return fanned;

    const base = polar(mark.progress, 285);
    const distance = Math.hypot(base.x - nowPoint.x, base.y - nowPoint.y);
    const threshold = 52;
    if (distance >= threshold) return base;
    const closeness = 1 - distance / threshold;
    return polar(mark.progress, 285 + closeness * 30);
  }

  const hoveredMark = $derived(marks.find((mark) => mark.key === hoveredKey) ?? null);
  const hoveredPoint = $derived.by(() => {
    if (!hoveredMark) return null;
    const markPos = displacedPoint(hoveredMark);
    const dx = markPos.x - 360;
    const dy = markPos.y - 360;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude === 0) return markPos;
    const pushOut = 44;
    return {
      x: markPos.x + (dx / magnitude) * pushOut,
      y: markPos.y + (dy / magnitude) * pushOut,
    };
  });

  function tickPath(hour: number) {
    const tickProgress = (hour - 6) / 16.5;
    return {
      inner: polar(tickProgress, 324),
      outer: polar(tickProgress, 338),
      label: polar(tickProgress, 356),
    };
  }

  function handleSelect(mark: DialMark) {
    if (!mark.todoId || !onSelect) return;
    // Clear hover state before opening the modal. Otherwise the overlay covers
    // the mark without dispatching a mouseleave, so the hover styling
    // (ring + tooltip chip) lingers when the modal is dismissed.
    hoveredKey = null;
    onSelect(mark.todoId);
  }

  function handleKeydown(event: KeyboardEvent, mark: DialMark) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(mark);
    }
  }
</script>

<svg bind:this={svgEl} viewBox="0 0 720 720">
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
    {@const point = displacedPoint(mark)}
    {@const interactive = Boolean(mark.todoId)}
    <g
      class={cn("dial-mark", interactive && "focus-visible:outline-none")}
      style={`--mx: ${point.x}px; --my: ${point.y}px;`}
      data-hovered={hoveredKey === mark.key ? "true" : null}
      data-interactive={interactive ? "true" : null}
      role={interactive ? "button" : undefined}
      tabindex={interactive ? 0 : undefined}
      aria-label={mark.label}
      onmouseenter={() => setHover(mark.key)}
      onmouseleave={() => clearHover(mark.key)}
      onfocus={() => setHover(mark.key)}
      onblur={() => clearHover(mark.key)}
      onclick={() => handleSelect(mark)}
      onkeydown={(event) => handleKeydown(event, mark)}
    >
      <circle
        class="dial-mark-ring"
        cx="0"
        cy="0"
        r="22"
        fill="none"
        stroke="#f0a890"
        stroke-width="2"
      />
      {#if mark.state === "done"}
        <circle cx="0" cy="0" r="9" fill="#f4ede0" stroke="#0a1f27" stroke-width="2" />
        <circle cx="0" cy="0" r="4" fill="#0a1f27" />
      {:else if mark.state === "due"}
        <circle class="dial-due-ping" cx="0" cy="0" r="16" fill="#e87b5a" />
        <g filter="url(#glow)">
          <circle cx="0" cy="0" r="16" fill="#e87b5a" />
          <circle cx="0" cy="0" r="8" fill="#ffffff" />
        </g>
      {:else}
        <circle cx="0" cy="0" r="7" fill="#b8d8d3" opacity="0.42" />
      {/if}
    </g>
  {/each}
  <g
    transform={`translate(${nowPoint.x} ${nowPoint.y})`}
    filter="url(#glow)"
    pointer-events="none"
  >
    <circle class="dial-sun-halo" r="36" fill="rgba(240,168,144,0.18)" />
    <circle class="dial-sun-halo --delay" r="24" fill="rgba(240,168,144,0.30)" />
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

{#if hoveredMark && hoveredPoint && hoveredMark.label}
  <div
    aria-hidden="true"
    class="pointer-events-none absolute z-10"
    style={`left: ${(hoveredPoint.x / 720) * 100}%; top: ${(hoveredPoint.y / 720) * 100}%;`}
  >
    <div
      class="-translate-x-1/2 -translate-y-1/2 rounded-full border border-rule-2 bg-[oklch(8%_0.02_220/0.92)] px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] whitespace-nowrap text-moon-2 shadow-xl backdrop-blur-md"
    >
      {hoveredMark.label}
    </div>
  </div>
{/if}
