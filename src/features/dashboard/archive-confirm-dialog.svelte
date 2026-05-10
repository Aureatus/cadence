<script lang="ts">
  import AlertDialog from "@/components/ui/alert-dialog.svelte";
  import AlertDialogContent from "@/components/ui/alert-dialog-content.svelte";
  import AlertDialogHeader from "@/components/ui/alert-dialog-header.svelte";
  import AlertDialogFooter from "@/components/ui/alert-dialog-footer.svelte";
  import AlertDialogTitle from "@/components/ui/alert-dialog-title.svelte";
  import AlertDialogDescription from "@/components/ui/alert-dialog-description.svelte";
  import AlertDialogAction from "@/components/ui/alert-dialog-action.svelte";
  import AlertDialogCancel from "@/components/ui/alert-dialog-cancel.svelte";
  import type { Todo } from "@/db";

  type Props = {
    todo: Todo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  };

  let { todo, open, onOpenChange, onConfirm }: Props = $props();

  const showOpen = $derived(open && todo !== null);
</script>

<AlertDialog open={showOpen} onOpenChange={(next) => onOpenChange(next)}>
  <AlertDialogContent
    class="max-w-[calc(100%-2rem)] border border-rule-2 bg-[oklch(15%_0.025_220/0.95)] p-7 text-moon ring-0 shadow-2xl backdrop-blur-xl sm:max-w-md"
  >
    <AlertDialogHeader class="gap-2 sm:place-items-start sm:text-left">
      <AlertDialogTitle
        class="font-display text-[clamp(20px,2.4vw,26px)] font-medium leading-[1.1] tracking-[-0.012em] text-moon-2"
      >
        Archive <span class="text-sand-2">{todo?.title ?? "this cadence"}</span>?
      </AlertDialogTitle>
      <AlertDialogDescription class="text-sm leading-relaxed text-foam/80">
        Moves to <span class="text-moon">Settled</span>. Restore anytime; past completions stay in
        history.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel variant="tide-ghost" size="pill">Keep it</AlertDialogCancel>
      <AlertDialogAction variant="tide-due" size="pill" onclick={onConfirm}>
        Archive
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
