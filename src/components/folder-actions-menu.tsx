"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteProjectFolder } from "@/app/actions/folders";
import { EditFolderDialog } from "@/components/edit-folder-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectFolderWithToken } from "@/types/database";

type FolderActionsMenuProps = {
  folder: ProjectFolderWithToken;
  folderReviewUrl?: string | null;
};

export function FolderActionsMenu({
  folder,
  folderReviewUrl,
}: FolderActionsMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  async function handleCopyFolderLink() {
    if (!folderReviewUrl) {
      return;
    }
    await navigator.clipboard.writeText(folderReviewUrl);
    setLinkCopied(true);
    setMenuOpen(false);
    window.setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${folder.name}"? Files and client links for this folder will be removed.`,
    );
    if (!confirmed) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteProjectFolder(folder.id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      setMenuOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          nativeButton
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8"
              aria-label={`Actions for ${folder.name}`}
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {folderReviewUrl ? (
            <DropdownMenuItem onClick={handleCopyFolderLink}>
              <Link2 className="size-4" />
              {linkCopied ? "Link copied" : "Copy client link (recommended)"}
            </DropdownMenuItem>
          ) : null}
          {folderReviewUrl ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit folder
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus-visible:text-destructive data-highlighted:text-destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditFolderDialog
        folder={folder}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
