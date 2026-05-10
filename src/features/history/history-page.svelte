<script lang="ts">
  import { useLiveQuery } from "@tanstack/svelte-db";
  import Card from "@/components/ui/card.svelte";
  import CardContent from "@/components/ui/card-content.svelte";
  import CardHeader from "@/components/ui/card-header.svelte";
  import { cyclesCollection, todosCollection } from "@/db";
  import { averageScore } from "@/time";

  const todosQuery = useLiveQuery(todosCollection);
  const cyclesQuery = useLiveQuery(cyclesCollection);

  const cycleHistory = $derived(
    [...cyclesQuery.data].sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  );
</script>

<Card
  class="mt-7 border border-rule bg-[oklch(20%_0.03_220/0.22)] gap-5 rounded-3xl px-5 py-6 ring-0 backdrop-blur-md md:px-7 md:py-7"
>
  <CardHeader class="px-0">
    <p class="font-mono text-[10px] uppercase tracking-[0.24em] text-foam opacity-65">history</p>
    <h1
      class="mt-2 font-display text-[clamp(24px,3.2vw,36px)] font-medium leading-[1] text-moon-2 tracking-[-0.012em]"
    >
      Consistency
    </h1>
  </CardHeader>
  <CardContent class="px-0">
    <div class="flex flex-col gap-3">
      {#each cycleHistory as cycle (cycle.id)}
        {@const cycleTodos = todosQuery.data.filter((todo) => todo.cycleId === cycle.id)}
        <article
          class="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4 last:border-b-0"
        >
          <div class="min-w-0">
            <h3
              class="font-display text-[clamp(20px,2.4vw,28px)] font-normal leading-none text-moon-2"
            >
              {cycle.title}
            </h3>
            <p class="mt-1.5 text-sm leading-relaxed text-foam opacity-75">
              {new Date(cycle.startsAt).toLocaleDateString()} · {cycle.status}
            </p>
          </div>
          <strong class="font-display text-[clamp(28px,4vw,40px)] font-normal text-sand">
            {averageScore(cycleTodos)}%
          </strong>
        </article>
      {/each}
    </div>
  </CardContent>
</Card>
