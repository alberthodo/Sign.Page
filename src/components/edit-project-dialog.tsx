"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/app/actions/projects";
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
import type { ProjectWithToken } from "@/types/database";
import { cn } from "@/lib/utils";

const controlClass =
  "h-10 rounded-md border-input bg-white shadow-none focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:outline-none";

type EditProjectDialogProps = {
  project: ProjectWithToken;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const router = useRouter();
  const typeHintId = useId();
  const [title, setTitle] = useState(project.title);
  const [projectType, setProjectType] = useState<ProjectType | "">(
    (project.project_type as ProjectType) ?? "",
  );
  const [description, setDescription] = useState(project.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(project.title);
      setProjectType((project.project_type as ProjectType) ?? "");
      setDescription(project.description ?? "");
      setError(null);
    }
  }, [open, project]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!projectType) {
      setError("Choose a project type to continue.");
      return;
    }

    setIsPending(true);

    try {
      const result = await updateProject({
        projectId: project.id,
        title,
        projectType,
        description,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden border-0 p-0 sm:max-w-[480px]"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <DialogHeader className="space-y-1 border-b bg-muted/20 px-6 py-5 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Edit project
            </DialogTitle>
            <DialogDescription>
              Update the project name, type, or description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor={`edit-title-${project.id}`}>Project name</Label>
              <Input
                id={`edit-title-${project.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isPending}
                className={controlClass}
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium leading-none">Type</legend>
              <p id={typeHintId} className="text-xs text-muted-foreground">
                Pick what best matches this deliverable.
              </p>
              <div
                role="radiogroup"
                aria-labelledby={typeHintId}
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
                      onClick={() => setProjectType(type.value)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                        selected
                          ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px] shadow-primary/20"
                          : "border-border bg-white hover:border-foreground/20 hover:bg-muted/30",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium leading-tight">
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor={`edit-description-${project.id}`}>
                Description
                <span className="ml-1 font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id={`edit-description-${project.id}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            <p className="px-6 pb-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="-mx-0 -mb-0 mt-0 gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
