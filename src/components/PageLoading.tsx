// Shown for the moment a page's code is loading (pages load on first visit)
export default function PageLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-card ring-1 ring-border/80" />
        <div className="h-36 animate-pulse rounded-2xl bg-card ring-1 ring-border/80" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-card ring-1 ring-border/80" />
    </div>
  )
}
