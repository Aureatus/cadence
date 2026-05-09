<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let { class: className, children, ...rest }: DialogPrimitive.DescriptionProps = $props();
</script>

<DialogPrimitive.Description
  data-slot="dialog-description"
  class={cn(
    "mt-0.5 text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</DialogPrimitive.Description>
