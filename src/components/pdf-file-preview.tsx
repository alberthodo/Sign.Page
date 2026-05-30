import { cn } from "@/lib/utils";

type PdfFilePreviewProps = {
  url: string;
  title: string;
  className?: string;
};

/** Inline PDF viewer for public asset URLs (Supabase storage, etc.). */
export function PdfFilePreview({ url, title, className }: PdfFilePreviewProps) {
  return (
    <iframe
      src={`${url}#toolbar=0`}
      title={title}
      loading="lazy"
      className={cn("w-full border-0 bg-background", className ?? "min-h-96")}
    />
  );
}
