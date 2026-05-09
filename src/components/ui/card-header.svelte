<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "@/lib/utils";

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string;
    children?: Snippet;
  };

  let { class: className, children, ...rest }: Props = $props();
</script>

<div
  data-slot="card-header"
  class={cn(
    "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-none px-8 group-data-[size=sm]/card:px-5 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-8 group-data-[size=sm]/card:[.border-b]:pb-5",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
