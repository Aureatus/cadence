<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "@/lib/utils";

  type Props = HTMLAttributes<HTMLDivElement> & { class?: string; children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<div
  data-slot="alert-dialog-footer"
  class={cn(
    "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
