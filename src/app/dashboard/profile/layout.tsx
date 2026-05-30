export default function DashboardProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-6 -my-10 flex min-h-[calc(100dvh-3.5rem)] flex-col sm:-mx-8">
      {children}
    </div>
  );
}
