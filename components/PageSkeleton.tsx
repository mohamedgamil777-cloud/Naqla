/** Placeholder shown the moment a tab is tapped, while the server builds the page (most pages read the database). */
export function PageSkeleton() {
  return (
    <div
      className="p-4 w-full max-w-2xl mx-auto flex flex-col gap-4"
      aria-busy="true"
      aria-label="جاري التحميل"
    >
      <div className="h-8 w-40 rounded-lg bg-panel-2 animate-pulse" />
      <div className="h-4 w-64 rounded bg-panel-2 animate-pulse" />
      <div className="h-40 rounded-card bg-panel-2 animate-pulse" />
      <div className="h-24 rounded-card bg-panel-2 animate-pulse" />
    </div>
  );
}
