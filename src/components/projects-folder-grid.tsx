import { Folder } from "lucide-react";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { ProjectFolderCard } from "@/components/project-folder-card";
import type { ProjectWithToken } from "@/types/database";

type ProjectsFolderGridProps = {
  projects: ProjectWithToken[];
};

export function ProjectsFolderGrid({ projects }: ProjectsFolderGridProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-20 text-center">
        <Folder
          className="mx-auto size-14 text-muted-foreground/40"
          strokeWidth={1.25}
          aria-hidden
        />
        <p className="mt-4 text-sm font-medium">No projects yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a folder for your first client proof.
        </p>
        <NewProjectDialog triggerClassName="mt-6" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      <NewProjectDialog triggerVariant="folder" />
      {projects.map((project) => (
        <ProjectFolderCard key={project.id} project={project} />
      ))}
    </div>
  );
}
