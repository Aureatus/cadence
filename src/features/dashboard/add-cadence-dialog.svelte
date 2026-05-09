<script lang="ts">
  import PlusIcon from "lucide-svelte/icons/plus";
  import { buttonVariants } from "@/components/ui/button.svelte";
  import Dialog from "@/components/ui/dialog.svelte";
  import DialogTrigger from "@/components/ui/dialog-trigger.svelte";
  import DialogContent from "@/components/ui/dialog-content.svelte";
  import DialogHeader from "@/components/ui/dialog-header.svelte";
  import DialogTitle from "@/components/ui/dialog-title.svelte";
  import DialogDescription from "@/components/ui/dialog-description.svelte";
  import { cn } from "@/lib/utils";
  import type { Cycle } from "@/db";
  import AddTodoForm from "./add-todo-form.svelte";

  let { cycle }: { cycle: Cycle } = $props();
  let open = $state(false);
</script>

<Dialog bind:open>
  <DialogTrigger class={cn(buttonVariants({ variant: "tide-ghost", size: "pill" }))}>
    <PlusIcon class="size-3.5" />
    <span>Add cadence</span>
  </DialogTrigger>
  <DialogContent
    class="max-h-[calc(100dvh-3rem)] max-w-[calc(100%-2rem)] overflow-y-auto border border-rule-2 bg-[oklch(15%_0.025_220/0.92)] p-6 text-moon ring-0 shadow-2xl backdrop-blur-xl sm:max-w-2xl md:max-w-3xl md:p-8 lg:max-w-4xl xl:max-w-5xl 2xl:max-w-[1100px] 2xl:p-10"
  >
    <DialogHeader class="mb-2 gap-1">
      <DialogDescription
        class="font-mono text-[10px] uppercase tracking-[0.28em] text-foam opacity-65"
      >
        a new cadence
      </DialogDescription>
      <DialogTitle
        class="font-display text-[clamp(36px,5vw,56px)] font-normal not-italic normal-case leading-[0.95] tracking-[-0.012em] text-moon-2"
      >
        Tell me <em class="italic text-sand-2">when</em>.
      </DialogTitle>
    </DialogHeader>
    <AddTodoForm {cycle} onClose={() => (open = false)} />
  </DialogContent>
</Dialog>
