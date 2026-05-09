<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let { class: className, children, ...rest }: AlertDialogPrimitive.TitleProps = $props();
</script>

<AlertDialogPrimitive.Title
  data-slot="alert-dialog-title"
  class={cn(
    "font-heading text-lg font-semibold tracking-wider uppercase sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</AlertDialogPrimitive.Title>
