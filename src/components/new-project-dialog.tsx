"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Plus } from "lucide-react";
import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_TYPE_ICONS } from "@/lib/project-type-icons";
import { PROJECT_TYPES, type ProjectType } from "@/lib/project-types";
import { cn } from "@/lib/utils";

const controlClass =
  "h-10 rounded-md border-input bg-white shadow-none focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:outline-none";

type NewProjectDialogProps = {
  triggerClassName?: string;
  /** `folder` renders a dashed grid tile; `button` is the header CTA */
  triggerVariant?: "button" | "folder";
};

export function NewProjectDialog({
  triggerClassName,
  triggerVariant = "button",
}: NewProjectDialogProps) {
  const router = useRouter();
  const typeHintId = useId();
  const [open, setOpen] = useState(false);
  const [projectType, setProjectType] = useState<ProjectType | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function resetForm() {
    setError(null);
    setProjectType("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetForm();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();

    if (!projectType) {
      setError("Choose a project type to continue.");
      return;
    }

    setIsPending(true);

    try {
      const result = await createProject({
        title,
        projectType,
        description: String(formData.get("description") ?? ""),
      });

      if (result.error || !result.projectId) {
        setError(result.error ?? "Could not create project.");
        return;
      }

      setOpen(false);
      form.reset();
      resetForm();
      router.push(`/dashboard/${result.projectId}`);
    } finally {
      setIsPending(false);
    }
  }

  const openDialog = () => setOpen(true);

  return (
    <>
      {triggerVariant === "folder" ? (
        <button
          type="button"
          onClick={openDialog}
          className={cn(
            "flex min-h-[168px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 p-4 text-center transition-colors",
            "hover:border-foreground/20 hover:bg-muted/30",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            triggerClassName,
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Plus className="size-5 text-muted-foreground" />
          </span>
          <span className="mt-3 text-sm font-medium">New project</span>
        </button>
      ) : (
        <Button
          type="button"
          className={triggerClassName}
          onClick={openDialog}
        >
          New project
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton
          className="gap-0 overflow-hidden border-0 p-0 sm:max-w-[480px]"
        >
          <form onSubmit={handleSubmit} className="flex flex-col">
            <DialogHeader className="gap-0 border-b bg-muted/20 px-6 py-5 text-left">
              <div className="flex items-start gap-3.5">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
                  aria-hidden
                >
                  <FolderPlus className="size-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1 space-y-1 pr-8">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Step 1 of 2
                  </p>
                  <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
                    New project
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    Name your proof and choose a category. You&apos;ll upload
                    deliverables next.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="new-project-title">Project name</Label>
                <Input
                  id="new-project-title"
                  name="title"
                  placeholder="e.g. Acme brand refresh"
                  required
                  disabled={isPending}
                  className={controlClass}
                  autoFocus
                />
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium leading-none">
                  Type
                </legend>
                <p id={typeHintId} className="text-xs text-muted-foreground">
                  Pick what best matches this deliverable.
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby={typeHintId}
                  aria-required
                  className="grid grid-cols-2 gap-2"
                >
                  {PROJECT_TYPES.map((type) => {
                    const Icon = PROJECT_TYPE_ICONS[type.value];
                    const selected = projectType === type.value;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={isPending}
                        onClick={() => {
                          setProjectType(type.value);
                          setError(null);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          "disabled:pointer-events-none disabled:opacity-50",
                          selected
                            ? "border-primary bg-primary/5 text-foreground shadow-[inset_0_0_0_1px] shadow-primary/20"
                            : "border-border bg-white text-foreground hover:border-foreground/20 hover:bg-muted/30",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-md",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                          aria-hidden
                        >
                          <Icon className="size-4" strokeWidth={1.75} />
                        </span>
                        <span className="leading-tight font-medium">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="new-project-description">
                  Description
                  <span className="ml-1 font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="new-project-description"
                  name="description"
                  placeholder="Scope, round number, or notes for your records."
                  disabled={isPending}
                  rows={3}
                  className={cn(
                    "min-h-[88px] resize-none rounded-md border-input bg-white py-2.5",
                    "focus-visible:border-foreground/30 focus-visible:ring-0",
                  )}
                />
              </div>
            </div>

            {error ? (
              <div
                className="mx-6 mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <DialogFooter className="-mx-0 -mb-0 mt-0 gap-2 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full sm:w-auto"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 w-full sm:w-auto"
                disabled={isPending}
              >
                {isPending ? "Creating…" : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
