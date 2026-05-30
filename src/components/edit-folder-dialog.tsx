"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProjectFolder } from "@/app/actions/folders";
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
import type { ProjectFolderWithToken } from "@/types/database";

type EditFolderDialogProps = {
  folder: ProjectFolderWithToken;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditFolderDialog({
  folder,
  open,
  onOpenChange,
}: EditFolderDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(folder.name);
  const [visibility, setVisibility] = useState(folder.visibility);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      setName(folder.name);
      setVisibility(folder.visibility);
      setError(null);
    }
  }, [open, folder.name, folder.visibility]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const result = await updateProjectFolder({
      folderId: folder.id,
      name,
      visibility,
    });
    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit folder</DialogTitle>
            <DialogDescription>
              Hidden folders are never included on client review links.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-folder-${folder.id}`}>Name</Label>
              <Input
                id={`edit-folder-${folder.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Visibility</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                  disabled={isPending}
                />
                Public
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={visibility === "hidden"}
                  onChange={() => setVisibility("hidden")}
                  disabled={isPending}
                />
                Hidden
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
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
