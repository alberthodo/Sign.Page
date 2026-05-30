export default function ReviewNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Link not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This review link is invalid or has expired. Ask your freelancer for a new
        link.
      </p>
    </div>
  );
}
