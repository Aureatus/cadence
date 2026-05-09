<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "@/lib/utils";

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string;
    size?: "default" | "sm";
    children?: Snippet;
  };

  let { class: className, size = "default", children, ...rest }: Props = $props();
</script>

<div
  data-slot="card"
  data-size={size}
  class={cn(
    "group/card flex flex-col gap-8 overflow-hidden bg-card py-8 text-sm text-card-foreground shadow-sm ring-1 ring-foreground/5 has-[>img:first-child]:pt-0 data-[size=sm]:gap-5 data-[size=sm]:py-5 *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
