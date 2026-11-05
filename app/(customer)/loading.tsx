/** Shown the moment a customer taps a tab, while the server builds the page (every page reads the database). */
export default function Loading() {
  return (
    <div className="p-4 w-full max-w-2xl mx-auto flex flex-col gap-4" aria-busy="true" aria-label="جاري التحميل">
      <div className="h-8 w-40 rounded-lg bg-panel-2 animate-pulse" />
      <div className="h-4 w-64 rounded bg-panel-2 animate-pulse" />
      <div className="h-40 rounded-card bg-panel-2 animate-pulse" />
      <div className="h-24 rounded-card bg-panel-2 animate-pulse" />
    </div>
  );
}
