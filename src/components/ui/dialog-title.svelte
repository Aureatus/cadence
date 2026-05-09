<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let { class: className, children, ...rest }: DialogPrimitive.TitleProps = $props();
</script>

<DialogPrimitive.Title
  data-slot="dialog-title"
  class={cn(
    "font-heading text-lg leading-none font-semibold tracking-wider uppercase",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</DialogPrimitive.Title>
