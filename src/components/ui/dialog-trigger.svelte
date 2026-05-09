<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";

  let { class: className, children, ...rest }: DialogPrimitive.TriggerProps = $props();
</script>

<DialogPrimitive.Trigger data-slot="dialog-trigger" class={className} {...rest}>
  {@render children?.()}
</DialogPrimitive.Trigger>
