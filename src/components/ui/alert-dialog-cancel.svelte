<script lang="ts">
  import type { Snippet } from "svelte";
  import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
  import { buttonVariants, type ButtonSize, type ButtonVariant } from "./button.svelte";
  import { cn } from "@/lib/utils";

  type Props = AlertDialogPrimitive.CancelProps & {
    class?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    children?: Snippet;
  };

  let {
    class: className,
    variant = "outline",
    size = "default",
    children,
    ...rest
  }: Props = $props();
</script>

<AlertDialogPrimitive.Cancel
  data-slot="alert-dialog-cancel"
  class={cn(buttonVariants({ variant, size, className }))}
  {...rest}
>
  {@render children?.()}
</AlertDialogPrimitive.Cancel>
