"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveFolderAssets } from "@/app/actions/folders";
import { createClient } from "@/lib/supabase/client";
import { storagePath, validateUploadFile } from "@/lib/uploads";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FolderUploadSectionProps = {
  projectId: string;
  folderId: string;
  replace?: boolean;
  compact?: boolean;
};

export function FolderUploadSection({
  projectId,
  folderId,
  replace = false,
  compact = false,
}: FolderUploadSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function uploadFiles(files: File[]) {
    setFormError(null);

    if (files.length === 0) {
      return;
    }

    for (const file of files) {
      const validationError = validateUploadFile(file);
      if (validationError) {
        setFormError(validationError);
        return;
      }
    }

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFormError("Session expired. Sign in again.");
      setUploading(false);
      return;
    }

    const assetUrls: string[] = [];

    for (const file of files) {
      const path = storagePath(user.id, projectId, file.name, folderId);
      const { error: uploadError } = await supabase.storage
        .from("project-assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setFormError(uploadError.message);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage
        .from("project-assets")
        .getPublicUrl(path);
      assetUrls.push(data.publicUrl);
    }

    const result = await saveFolderAssets(folderId, assetUrls, { replace });

    if (result.error) {
      setFormError(result.error);
      setUploading(false);
      return;
    }

    setUploading(false);
    router.refresh();
  }

  function addFiles(incoming: FileList | File[]) {
    const files = Array.from(incoming);
    if (files.length === 0) {
      return;
    }
    void uploadFiles(files);
  }

  function onFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      addFiles(event.target.files);
    }
    event.target.value = "";
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (event.dataTransfer.files.length) {
      addFiles(event.dataTransfer.files);
    }
  }

  return (
    <div className={cn("space-y-3", compact && "rounded-lg border border-dashed p-3")}>
      <div className="space-y-2">
        <Label htmlFor={`folder-files-${folderId}`} className="sr-only">
          Upload files
        </Label>
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragOver(false);
            }
          }}
          onDrop={onDrop}
          className={cn(
            "relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed px-4 text-center transition-colors",
            compact ? "min-h-24 py-4" : "min-h-28 py-6",
            dragOver
              ? "border-primary bg-muted/60"
              : "border-border hover:bg-muted/40",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={fileInputRef}
            id={`folder-files-${folderId}`}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
            multiple
            disabled={uploading}
            onChange={onFileInputChange}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            aria-label="Upload files"
          />
          <div className="pointer-events-none relative z-0">
            <p className="text-sm font-medium">
              {uploading
                ? "Saving to cloud…"
                : compact
                  ? "Add more files"
                  : "Drop files here or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, JPEG, PDF — up to 10MB each · saves automatically as draft
            </p>
          </div>
        </div>
      </div>

      {formError ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
