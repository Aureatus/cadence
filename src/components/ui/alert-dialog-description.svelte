<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let { class: className, children, ...rest }: AlertDialogPrimitive.DescriptionProps = $props();
</script>

<AlertDialogPrimitive.Description
  data-slot="alert-dialog-description"
  class={cn(
    "mt-0.5 text-sm leading-relaxed text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</AlertDialogPrimitive.Description>
