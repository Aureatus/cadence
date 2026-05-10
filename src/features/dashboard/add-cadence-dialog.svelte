<script lang="ts">
  import Dialog from "@/components/ui/dialog.svelte";
  import DialogContent from "@/components/ui/dialog-content.svelte";
  import DialogHeader from "@/components/ui/dialog-header.svelte";
  import DialogTitle from "@/components/ui/dialog-title.svelte";
  import DialogDescription from "@/components/ui/dialog-description.svelte";
  import type { Cycle } from "@/db";
  import AddTodoForm from "./add-todo-form.svelte";

  type Props = {
    cycle: Cycle;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };

  let { cycle, open, onOpenChange }: Props = $props();
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent
    class="max-h-[calc(100dvh-3rem)] max-w-[calc(100%-2rem)] overflow-y-auto border border-rule-2 bg-[oklch(15%_0.025_220/0.92)] p-6 text-moon ring-0 shadow-2xl backdrop-blur-xl sm:max-w-2xl md:max-w-3xl md:p-8 lg:max-w-4xl xl:max-w-5xl 2xl:max-w-[1100px] 2xl:p-10"
  >
    <DialogHeader class="mb-2 gap-1">
      <DialogDescription
        class="font-mono text-[10px] uppercase tracking-[0.28em] text-foam opacity-65"
      >
        New
      </DialogDescription>
      <DialogTitle
        class="font-display text-[clamp(24px,3vw,32px)] font-medium leading-[1.05] tracking-[-0.012em] text-moon-2"
      >
        New cadence
      </DialogTitle>
    </DialogHeader>
    <AddTodoForm {cycle} onClose={() => onOpenChange(false)} />
  </DialogContent>
</Dialog>
