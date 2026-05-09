<script lang="ts">
  import type { Snippet } from "svelte";
  import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  type Props = AlertDialogPrimitive.ContentProps & {
    class?: string;
    size?: "default" | "sm";
    children?: Snippet;
  };

  let { class: className, size = "default", children, ...rest }: Props = $props();
</script>

<AlertDialogPrimitive.Portal>
  <AlertDialogPrimitive.Overlay
    data-slot="alert-dialog-overlay"
    class={cn(
      "fixed inset-0 isolate z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
    )}
  />
  <AlertDialogPrimitive.Content
    data-slot="alert-dialog-content"
    data-size={size}
    class={cn(
      "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-6 rounded-none bg-popover p-6 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      className,
    )}
    {...rest}
  >
    {@render children?.()}
  </AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
