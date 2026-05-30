"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteProject } from "@/app/actions/projects";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectWithToken } from "@/types/database";
import { cn } from "@/lib/utils";

type ProjectActionsMenuProps = {
  project: ProjectWithToken;
  /** Navigate to workspace after delete (project detail page). */
  redirectOnDelete?: boolean;
  className?: string;
};

export function ProjectActionsMenu({
  project,
  redirectOnDelete = false,
  className,
}: ProjectActionsMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${project.title}"? This removes the project, client link, and uploaded files. This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      setMenuOpen(false);
      if (redirectOnDelete) {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
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
              className={cn(
                "size-8 bg-transparent shadow-none hover:bg-transparent",
                className,
              )}
              aria-label={`Actions for ${project.title}`}
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              setEditOpen(true);
            }}
          >
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus-visible:text-destructive data-highlighted:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="size-4" />
            {isDeleting ? "Deleting…" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
