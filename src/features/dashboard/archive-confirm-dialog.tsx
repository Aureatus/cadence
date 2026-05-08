import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Todo } from "@/db";

export function ArchiveConfirmDialog({
  todo,
  open,
  onOpenChange,
  onConfirm,
}: {
  todo: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open && todo !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] border border-rule-2 bg-[oklch(15%_0.025_220/0.95)] p-7 text-moon ring-0 shadow-2xl backdrop-blur-xl sm:max-w-md">
        <AlertDialogHeader className="gap-2 sm:place-items-start sm:text-left">
          <AlertDialogTitle className="font-display text-[clamp(24px,3vw,32px)] font-normal not-italic normal-case leading-[1.05] tracking-[-0.012em] text-moon-2">
            Archive <em className="italic text-sand-2">{todo?.title ?? "this cadence"}</em>?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-foam/80">
            It moves to <span className="text-moon">Settled</span>, where you can restore it
            anytime. Past completions stay in the ledger.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="tide-ghost" size="pill">
            Keep it
          </AlertDialogCancel>
          <AlertDialogAction variant="tide-due" size="pill" onClick={onConfirm}>
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
