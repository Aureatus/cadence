import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Cycle } from "@/db";
import { AddTodoForm } from "./add-todo-form";

export function AddCadenceDialog({ cycle }: { cycle: Cycle }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="tide-ghost" size="pill" type="button">
            <PlusIcon />
            <span>Add cadence</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-3rem)] max-w-[calc(100%-2rem)] overflow-y-auto border border-rule-2 bg-[oklch(15%_0.025_220/0.92)] p-6 text-moon ring-0 shadow-2xl backdrop-blur-xl sm:max-w-2xl md:max-w-3xl md:p-8 lg:max-w-4xl xl:max-w-5xl 2xl:max-w-[1100px] 2xl:p-10">
        <DialogHeader className="mb-2 gap-1">
          <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.28em] text-foam opacity-65">
            a new cadence
          </DialogDescription>
          <DialogTitle className="font-display text-[clamp(36px,5vw,56px)] font-normal not-italic normal-case leading-[0.95] tracking-[-0.012em] text-moon-2">
            Tell me <em className="italic text-sand-2">when</em>.
          </DialogTitle>
        </DialogHeader>
        <AddTodoForm cycle={cycle} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
