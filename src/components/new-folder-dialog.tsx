"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Plus } from "lucide-react";
import { createProjectFolder } from "@/app/actions/folders";
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

type NewFolderDialogProps = {
  projectId: string;
  /** Icon-only trigger for folder sidebar / mobile chips */
  compact?: boolean;
};

export function NewFolderDialog({ projectId, compact = false }: NewFolderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "hidden">("public");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");

    const result = await createProjectFolder(projectId, name, visibility);
    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {compact ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 shrink-0"
          onClick={() => setOpen(true)}
          aria-label="New folder"
        >
          <Plus className="size-4" />
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <FolderPlus className="size-4" />
          New folder
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
              <DialogDescription>
                Public folders can be shared with clients. Hidden folders stay private.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="folder-name">Name</Label>
                <Input
                  id="folder-name"
                  name="name"
                  placeholder="e.g. Round 2 concepts"
                  required
                  disabled={isPending}
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Visibility</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                    disabled={isPending}
                  />
                  Public — can share with client
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === "hidden"}
                    onChange={() => setVisibility("hidden")}
                    disabled={isPending}
                  />
                  Hidden — internal only
                </label>
              </fieldset>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create folder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
